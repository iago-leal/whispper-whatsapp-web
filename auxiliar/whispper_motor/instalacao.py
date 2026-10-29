"""Instalação, desinstalação e diagnóstico do aplicativo auxiliar (RF-16, DT-07, DT-08).

Chamado pelo `auxiliar/motor.sh` no Mac e pelo `auxiliar\\motor.cmd` no Windows, que
escolhem o interpretador em que o motor está instalado:
`python -m whispper_motor.instalacao instalar | desinstalar | diagnosticar`.

No Mac, o registro no Chrome é um manifesto na pasta dele; no Windows, o manifesto fica
na pasta do aplicativo, e o Chrome e o Brave o encontram por uma entrada no registro do
usuário (D-13). Nada aqui acessa a rede: o modelo precisa estar no cache local e, se
faltar, a recusa mostra como baixá-lo por fora. A desinstalação não toca no cache de modelos.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import platform
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import NamedTuple

from . import NOME_DO_HOST, PROTOCOLO, configuracao, modelos, plataforma, protocolo
from .__main__ import ENTRADA_CORROMPIDA, ORIGEM_RECUSADA, PASTA_DE_HOSTS, varrer_temporarios_orfaos
from .configuracao import Configuracao, ConfiguracaoInvalida

PYTHON_MINIMO = (3, 11)
NOME_DO_LANCADOR = "whispper-motor.bat" if plataforma.WINDOWS else "whispper-motor"
MOTOR = "motor.cmd" if plataforma.WINDOWS else "motor.sh"
DESCRICAO_DO_HOST = "Motor de transcrição local do whispper-whatsapp-web"
MANIFESTO_DA_EXTENSAO = Path(__file__).resolve().parents[2] / "extension" / "manifest.json"

PATH_DO_CHROME = "/usr/bin:/bin:/usr/sbin:/sbin"
PRAZO_DE_RESPOSTA_S = 10.0
INTERVALO_ENTRE_VERIFICACOES_S = 0.5
ESPERA_DO_ENCERRAMENTO_S = 15.0
# O host encerra o trabalhador em até 0,5 s e o despachante em até 5 s depois do SIGTERM.
ESPERA_DOS_HOSTS_S = 6.0
# No Windows, um arquivo aberto por um processo recém-encerrado leva um instante a ser solto.
TENTATIVAS_DE_APAGAR = 10
INTERVALO_ENTRE_TENTATIVAS_S = 0.5

# Registro do Windows, sob HKEY_CURRENT_USER: a raiz é injetável para os testes (D-20).
RAIZ_DO_REGISTRO = "Software"
NAVEGADORES_DO_WINDOWS = (
    ("Chrome", r"Google\Chrome\NativeMessagingHosts"),
    ("Brave", r"BraveSoftware\Brave-Browser\NativeMessagingHosts"),
)
# O cmd.exe interpreta estes caracteres mesmo entre aspas: o lançador recusa, em vez de escapar (D-14).
CARACTERES_DO_CMD = "%^&|<>!"
FFMPEG_PELO_WINGET = "winget install --id Gyan.FFmpeg --exact --source winget"
FASTER_WHISPER = '"faster-whisper>=1.2,<1.3"'
BIBLIOTECAS_DA_NVIDIA = 'nvidia-cublas-cu12 "nvidia-cudnn-cu12>=9,<10"'

_HEXADECIMAL_PARA_LETRAS = str.maketrans("0123456789abcdef", "abcdefghijklmnop")


@dataclass(frozen=True)
class Ambiente:
    """O que a instalação precisa saber da máquina; `detectar_ambiente` o preenche."""

    home: Path
    python: Path
    versao_python: tuple[int, int]
    sistema: str
    arquitetura: str
    ffmpeg: Path | None
    mlx_whisper: bool
    pasta_de_modelos: Path
    faster_whisper: bool = False
    placa_cuda: bool = False
    bibliotecas_da_placa: bool = False
    raiz_do_registro: str = RAIZ_DO_REGISTRO


class Verificacao(NamedTuple):
    nome: str
    ok: bool
    detalhe: str


class PrerequisitosAusentes(Exception):
    def __init__(self, faltas: list[str]):
        super().__init__("; ".join(faltas))
        self.faltas = faltas


class _HostFalhou(Exception):
    pass


def pasta_app(home: Path) -> Path:
    return plataforma.pasta_padrao_do_app(Path(home))


def caminho_manifesto_host(home: Path) -> Path:
    if plataforma.WINDOWS:
        return pasta_app(home) / f"{NOME_DO_HOST}.json"
    pasta = Path(home) / "Library" / "Application Support" / "Google" / "Chrome" / "NativeMessagingHosts"
    return pasta / f"{NOME_DO_HOST}.json"


def chaves_do_registro(raiz: str = RAIZ_DO_REGISTRO) -> list[tuple[str, str]]:
    """As entradas do host no registro do Windows, sob HKEY_CURRENT_USER: a do Chrome e a do Brave."""
    return [(navegador, rf"{raiz}\{relativa}\{NOME_DO_HOST}") for navegador, relativa in NAVEGADORES_DO_WINDOWS]


# Identificador da extensão (DT-12)


def ler_key(manifesto: Path) -> str:
    chave = json.loads(Path(manifesto).read_text(encoding="utf-8")).get("key")
    if not isinstance(chave, str) or not chave:
        raise ValueError(f"{manifesto} não tem o campo key")
    return chave


def identificador_da_extensao(chave: str) -> str:
    """Os primeiros 128 bits do SHA-256 da chave pública em DER, com os dígitos 0-f trocados por a-p."""
    resumo = hashlib.sha256(base64.b64decode(chave, validate=True)).hexdigest()[:32]
    return resumo.translate(_HEXADECIMAL_PARA_LETRAS)


# Pré-requisitos


def detectar_ambiente(home: Path | None = None) -> Ambiente:
    home = Path(home) if home is not None else Path.home()
    try:
        existente = _configuracao_existente(home)
    except ConfiguracaoInvalida:
        existente = None
    windows = {}
    if plataforma.WINDOWS:
        faster_whisper = _importa_faster_whisper()
        placa = faster_whisper and _placas_cuda() > 0
        windows = {
            "faster_whisper": faster_whisper,
            "placa_cuda": placa,
            "bibliotecas_da_placa": placa and _bibliotecas_da_placa(),
        }
    return Ambiente(
        home=home,
        python=Path(sys.executable),
        versao_python=(sys.version_info.major, sys.version_info.minor),
        sistema=platform.system(),
        arquitetura=platform.machine(),
        ffmpeg=_detectar_ffmpeg(existente),
        mlx_whisper=False if plataforma.WINDOWS else _importa_mlx_whisper(),
        pasta_de_modelos=existente.pasta_de_modelos if existente else _pasta_de_modelos_padrao(home),
        **windows,
    )


def conferir_prerequisitos(ambiente: Ambiente, modelo: str) -> list[Verificacao]:
    """Os pré-requisitos do sistema do `ambiente`, e não da máquina que confere, um a um."""
    python = ambiente.python
    sistema = f"{ambiente.sistema} {ambiente.arquitetura}"
    if ambiente.sistema == "Windows":
        return [
            _item(
                "Windows de 64 bits",
                ambiente.arquitetura == "AMD64",
                sistema,
                f"é preciso o Windows de 64 bits num processador x86-64, e este sistema é {sistema}: "
                "o faster-whisper e as bibliotecas da NVIDIA só existem para essa arquitetura",
            ),
            _conferir_python(ambiente),
            _conferir_ffmpeg(ambiente.ffmpeg, f"instale-o com {FFMPEG_PELO_WINGET}"),
            _item(
                "faster-whisper",
                ambiente.faster_whisper,
                f"importável por {python}",
                f"faster-whisper ausente: {python} não o importa; instale-o com "
                f"& {_aspas_do_powershell(python)} -m pip install {FASTER_WHISPER} "
                "ou defina WHISPPER_PYTHON com o Python em que ele está instalado",
            ),
            _conferir_modelo(ambiente, modelo),
        ]
    return [
        _item(
            "Mac com Apple Silicon",
            (ambiente.sistema, ambiente.arquitetura) == ("Darwin", "arm64"),
            sistema,
            f"é preciso um Mac com Apple Silicon, e este sistema é {sistema}: "
            "o MLX só roda em macOS com processador Apple",
        ),
        _conferir_python(ambiente),
        _conferir_ffmpeg(ambiente.ffmpeg, "instale-o (por exemplo, com brew install ffmpeg)"),
        _item(
            "mlx-whisper",
            ambiente.mlx_whisper,
            f"importável por {python}",
            f"mlx-whisper ausente: {python} não o importa; instale-o nesse interpretador "
            "ou defina WHISPPER_PYTHON com o Python em que ele está instalado",
        ),
        _conferir_modelo(ambiente, modelo),
    ]


def avisos_de_prerequisitos(ambiente: Ambiente) -> list[str]:
    """O que não impede a instalação, mas a deixa mais lenta: no Windows, a placa e as bibliotecas dela (D-16)."""
    if ambiente.sistema != "Windows":
        return []
    if not ambiente.placa_cuda:
        return ["sem placa NVIDIA: o motor vai transcrever no processador, mais devagar que na placa"]
    if not ambiente.bibliotecas_da_placa:
        return [
            "bibliotecas da placa ausentes: o motor vai transcrever no processador; para usar a placa, "
            f"instale-as com & {_aspas_do_powershell(ambiente.python)} -m pip install {BIBLIOTECAS_DA_NVIDIA}"
        ]
    return []


def verificar_prerequisitos(ambiente: Ambiente, modelo: str) -> list[str]:
    """As mensagens dos pré-requisitos que faltam; lista vazia quando tudo está presente."""
    return [item.detalhe for item in conferir_prerequisitos(ambiente, modelo) if not item.ok]


def comando_de_download(ambiente: Ambiente, modelo: str) -> str:
    """O comando que baixa o modelo uma vez, fora do aplicativo: no sh do Mac ou no PowerShell do Windows."""
    fora_do_padrao = ambiente.pasta_de_modelos != _pasta_de_modelos_padrao(ambiente.home, respeitar_variaveis=False)
    codigo = f"from huggingface_hub import snapshot_download; snapshot_download({modelo!r})"
    if ambiente.sistema == "Windows":
        prefixo = f"$env:HF_HUB_CACHE={_aspas_do_powershell(ambiente.pasta_de_modelos)}; " if fora_do_padrao else ""
        return f'{prefixo}& {_aspas_do_powershell(ambiente.python)} -c "{codigo}"'
    prefixo = f"HF_HUB_CACHE={_aspas(ambiente.pasta_de_modelos)} " if fora_do_padrao else ""
    return f'{prefixo}{_aspas(ambiente.python)} -c "{codigo}"'


# Instalação e desinstalação (DT-08)


def instalar(ambiente: Ambiente, extensao_id: str, codigo: Path) -> Configuracao:
    """Grava o código, a configuração, o lançador e o manifesto do host, e o registra no navegador.

    Tudo é conferido antes do primeiro arquivo: faltando um pré-requisito, nada é
    gravado. Numa reinstalação, o modelo e a ociosidade escolhidos são preservados.
    No Windows, as entradas do Chrome e do Brave no registro vêm por último (D-13).
    """
    pasta = pasta_app(ambiente.home)
    try:
        existente = _configuracao_existente(ambiente.home)
    except ConfiguracaoInvalida as erro:
        raise PrerequisitosAusentes(
            [f"{erro} em {pasta / 'config.toml'}: corrija o campo ou apague o arquivo e instale de novo"]
        ) from None
    modelo = existente.modelo if existente else configuracao.MODELO_PADRAO
    faltas = verificar_prerequisitos(ambiente, modelo)
    if plataforma.WINDOWS:
        faltas += _caminhos_recusados_pelo_cmd(pasta, ambiente.python)
    if faltas:
        raise PrerequisitosAusentes(faltas)

    config = Configuracao(
        modelo=modelo,
        pasta_de_modelos=ambiente.pasta_de_modelos,
        ffmpeg=ambiente.ffmpeg,
        extensao_id=extensao_id,
        ocioso_min=existente.ocioso_min if existente else configuracao.OCIOSO_MIN_PADRAO,
    )
    pasta.mkdir(parents=True, exist_ok=True)
    _copiar_codigo(Path(codigo), pasta / "whispper_motor")
    configuracao.gravar(config, pasta / "config.toml")
    lancador = pasta / NOME_DO_LANCADOR
    if plataforma.WINDOWS:
        # O cmd.exe lê o lançador na página de código OEM do console, e não em UTF-8.
        _gravar(lancador, _texto_do_lancador_do_windows(ambiente.python, pasta), codificacao="oem", fim_de_linha="\r\n")
    else:
        _gravar(lancador, _texto_do_lancador(ambiente.python, pasta), modo=0o755)
    # O registro vem por último: o navegador só encontra o host quando ele já está completo.
    manifesto = caminho_manifesto_host(ambiente.home)
    manifesto.parent.mkdir(parents=True, exist_ok=True)
    _gravar(manifesto, json.dumps(_manifesto_do_host(lancador, extensao_id), ensure_ascii=False, indent=2) + "\n")
    if plataforma.WINDOWS:
        for _, chave in chaves_do_registro(ambiente.raiz_do_registro):
            _gravar_registro(chave, str(manifesto))
    return config


def desinstalar(
    home: Path, hosts_encerrados: list[int] | None = None, *, raiz_do_registro: str = RAIZ_DO_REGISTRO
) -> list[Path | str]:
    """Remove o registro do host e a pasta do aplicativo; devolve o que existia e foi removido.

    Os hosts desta instalação em execução são encerrados antes que a pasta suma: sem
    isso, a extensão conectada seguiria vendo o motor "pronto", com o modelo na
    memória (RF-16). Com `hosts_encerrados`, a lista recebe os PIDs deles. As pastas
    temporárias de hosts derrubados à força, que no Windows não as apagam, saem também.
    """
    removidos: list[Path | str] = []
    # O registro sai primeiro, para que o navegador deixe de lançar o host antes que o código suma.
    if plataforma.WINDOWS:
        for _, chave in chaves_do_registro(raiz_do_registro):
            if _apagar_registro(chave):
                removidos.append(rf"HKEY_CURRENT_USER\{chave}")
    else:
        manifesto = caminho_manifesto_host(home)
        if manifesto.exists():
            manifesto.unlink()
            removidos.append(manifesto)
    pasta = pasta_app(home)
    encerrados = encerrar_hosts(pasta)
    if hosts_encerrados is not None:
        hosts_encerrados.extend(encerrados)
    varrer_temporarios_orfaos(Path(tempfile.gettempdir()))
    if pasta.exists():
        _apagar_pasta(pasta)
        removidos.append(pasta)
    return removidos


def encerrar_hosts(pasta: Path) -> list[int]:
    """Encerra os hosts vivos registrados em `<pasta>/hosts` e devolve os PIDs deles.

    No Mac, cada host recebe SIGTERM, que ele converte em encerramento limpo, com o
    trabalhador junto; o que não sair no prazo é morto com os filhos. No Windows, sem
    sinal que o host possa tratar, cada um é encerrado à força depois de conferido
    contra o próprio registro, e o job dele leva os filhos (D-17).
    """
    registros = pasta / PASTA_DE_HOSTS
    try:
        pids = sorted(int(registro.name) for registro in registros.iterdir() if registro.name.isdigit())
    except OSError:
        return []
    if plataforma.WINDOWS:
        return [pid for pid in pids if _encerrar_registrado(registros / str(pid), pid)]
    vivos = [pid for pid in pids if plataforma.host_vivo(pid)]
    for pid in vivos:
        plataforma.pedir_encerramento(pid)
    # O host apaga o próprio registro por último, já sem o trabalhador.
    pendentes = list(vivos)
    limite = time.monotonic() + ESPERA_DOS_HOSTS_S
    while pendentes and time.monotonic() < limite:
        time.sleep(0.1)
        pendentes = [pid for pid in pendentes if (registros / str(pid)).exists() and plataforma.host_vivo(pid)]
    for pid in pendentes:
        plataforma.matar_com_filhos(pid)
    return vivos


# Diagnóstico


def diagnosticar(
    home: Path, extensao_id: str, *, aguardar_pronto_s: float = 0.0, raiz_do_registro: str = RAIZ_DO_REGISTRO
) -> list[Verificacao]:
    """Confere a instalação como o navegador a encontrará e termina falando com o próprio host.

    O host é lançado pelo caminho do manifesto, com a origem que ele autoriza. Com
    `aguardar_pronto_s`, a verificação se repete até o modelo sair de "carregando";
    sem ele, basta a primeira resposta sem erro. No Windows, conferem-se antes as
    entradas do Chrome e do Brave no registro.
    """
    home = Path(home)
    esperada = f"chrome-extension://{extensao_id}/"
    registros = _conferir_registros(home, raiz_do_registro) if plataforma.WINDOWS else []
    manifesto, sobre_o_manifesto = _ler_manifesto_do_host(caminho_manifesto_host(home))
    if manifesto is None:
        return [
            *registros,
            Verificacao("manifesto do host", False, sobre_o_manifesto),
            Verificacao("lançador", False, "sem manifesto do host"),
            Verificacao("allowed_origins", False, "sem manifesto do host"),
            _conferir_configuracao(home, None),
            Verificacao("host", False, f"não lançado: sem manifesto do host; instale com {MOTOR} instalar"),
        ]

    lancador = Path(manifesto["path"])
    lancador_ok = lancador.is_absolute() and _executavel(lancador)
    origens = manifesto["allowed_origins"]
    autorizada = origens[0] if origens else None
    if lancador_ok and autorizada:
        host = verificar_host(lancador, autorizada, home, aguardar_pronto_s)
    else:
        host = Verificacao("host", False, "não lançado: falta o lançador ou uma origem autorizada")
    return [
        *registros,
        Verificacao("manifesto do host", True, sobre_o_manifesto),
        _item("lançador", lancador_ok, str(lancador), f"{lancador} ausente ou sem permissão de execução"),
        _item(
            "allowed_origins",
            origens == [esperada],
            esperada,
            f"o manifesto autoriza {', '.join(origens) or 'nenhuma origem'}, e a extensão é {esperada}; "
            f"reinstale com {MOTOR} instalar",
        ),
        _conferir_configuracao(home, autorizada),
        host,
    ]


def verificar_host(lancador: Path, origem: str, home: Path, aguardar_pronto_s: float = 0.0) -> Verificacao:
    """Lança o host como o navegador o lança e lhe pede o estado pelo protocolo 1.

    Como no Chrome do macOS: pelo lançador, com a origem como único argumento, na pasta
    do lançador, com o PATH mínimo dos aplicativos e mensagens precedidas de 4 bytes de
    tamanho. No Windows, pelo `cmd.exe`, com o `--parent-window` depois da origem e o
    ambiente de quem diagnostica. O fim da entrada, como a porta fechada, deve encerrá-lo
    com 0. No estado pronto, mostra o dispositivo que o host anotou no diagnóstico (D-18).
    """
    if plataforma.WINDOWS:
        comando = f'cmd.exe /d /s /c ""{lancador}" {origem} --parent-window=0"'
        ambiente = None
    else:
        comando = [str(lancador), origem]
        ambiente = {"HOME": str(home), "PATH": PATH_DO_CHROME, "TMPDIR": tempfile.gettempdir()}
    log = pasta_app(home) / "diagnostico.log"
    desde = _tamanho(log)
    with tempfile.TemporaryFile() as saida_de_erro:
        try:
            processo = subprocess.Popen(
                comando,
                cwd=lancador.parent,
                env=ambiente,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=saida_de_erro,
            )
        except OSError as erro:
            return Verificacao("host", False, f"não foi possível lançar {lancador}: {erro.strerror or erro}")

        inicio = time.monotonic()
        percurso: list[str] = []
        resposta: dict = {}
        falha = None
        leitor = plataforma.Leitor(processo.stdout)
        try:
            while True:
                resposta = _pedir_estado(processo, leitor)
                if not percurso or percurso[-1] != resposta["estado"]:
                    percurso.append(resposta["estado"])
                if resposta["estado"] != "carregando" or time.monotonic() - inicio >= aguardar_pronto_s:
                    break
                time.sleep(INTERVALO_ENTRE_VERIFICACOES_S)
        except _HostFalhou as erro:
            falha = str(erro)
        finally:
            leitor.fechar()
        decorrido = time.monotonic() - inicio
        codigo = _encerrar_host(processo)
        if falha is not None:
            return Verificacao("host", False, _explicar_falha(falha, codigo, origem, saida_de_erro))

    respondeu = ", depois ".join(percurso)
    if resposta.get("protocolo") != PROTOCOLO:
        return Verificacao(
            "host", False, f"o host fala o protocolo {resposta.get('protocolo')}, e não o {PROTOCOLO}; reinstale"
        )
    if resposta["estado"] == "erro":
        return Verificacao("host", False, f"respondeu {respondeu}: {resposta.get('motivo')}")
    if resposta["estado"] == "carregando" and aguardar_pronto_s > 0:
        return Verificacao("host", False, f"ainda carregando o modelo após {decorrido:.0f} s")
    if codigo != 0:
        como = f"código {codigo}" if codigo is not None else f"não saiu em {ESPERA_DO_ENCERRAMENTO_S:.0f} s"
        return Verificacao("host", False, f"respondeu {respondeu}, mas não encerrou limpo no fim da entrada ({como})")
    detalhe = f"respondeu {respondeu} em {decorrido:.1f} s (versão {resposta.get('versaoApp')}, modelo {resposta.get('modelo')})"
    dispositivo = _dispositivo_no_diagnostico(log, desde) if resposta["estado"] == "pronto" else None
    return Verificacao("host", True, f"{detalhe}; {dispositivo}" if dispositivo else detalhe)


# Apoio


def _item(nome: str, ok: bool, sucesso: str, falta: str) -> Verificacao:
    return Verificacao(nome, ok, sucesso if ok else falta)


def _conferir_python(ambiente: Ambiente) -> Verificacao:
    versao = ".".join(map(str, ambiente.versao_python))
    minimo = ".".join(map(str, PYTHON_MINIMO))
    return _item(
        f"Python {minimo} ou superior",
        ambiente.versao_python >= PYTHON_MINIMO,
        f"{versao} em {ambiente.python}",
        f"é preciso Python {minimo} ou superior, e {ambiente.python} é {versao}; "
        "defina WHISPPER_PYTHON com outro interpretador",
    )


def _conferir_ffmpeg(ffmpeg: Path | None, como_instalar: str) -> Verificacao:
    if ffmpeg is None:
        return Verificacao("ffmpeg", False, f"ffmpeg ausente: {como_instalar} e instale de novo")
    if not _executavel(ffmpeg):
        return Verificacao("ffmpeg", False, f"ffmpeg ausente: {ffmpeg} não é um executável")
    return Verificacao("ffmpeg", True, str(ffmpeg))


def _conferir_modelo(ambiente: Ambiente, modelo: str) -> Verificacao:
    try:
        snapshot = modelos.resolver(modelo, ambiente.pasta_de_modelos)
    except modelos.ModeloNaoEncontrado:
        if Path(modelo).expanduser().is_absolute():
            *primeiros, ultimo = modelos.ARQUIVOS_DE_PESOS
            falta = f"modelo não encontrado: {modelo} não tem config.json e os pesos ({', '.join(primeiros)} ou {ultimo})"
        else:
            falta = (
                f"modelo não encontrado: {modelo} não está em {ambiente.pasta_de_modelos}. "
                f"Baixe-o uma vez, fora do aplicativo, com: {comando_de_download(ambiente, modelo)}"
            )
        return Verificacao("modelo", False, falta)
    return Verificacao("modelo", True, f"{modelo} em {snapshot}")


def _conferir_configuracao(home: Path, origem_autorizada: str | None) -> Verificacao:
    caminho = pasta_app(home) / "config.toml"
    if not caminho.is_file():
        return Verificacao("configuração", False, f"não encontrada em {caminho}")
    try:
        config = configuracao.carregar(caminho)
    except ConfiguracaoInvalida as erro:
        return Verificacao("configuração", False, f"{erro} em {caminho}")
    if config.extensao_id is None or (
        origem_autorizada is not None and origem_autorizada != f"chrome-extension://{config.extensao_id}/"
    ):
        return Verificacao(
            "configuração",
            False,
            f"o extensao_id da configuração ({config.extensao_id or 'ausente'}) não corresponde à origem "
            f"autorizada no manifesto, e o host recusaria o navegador; reinstale com {MOTOR} instalar",
        )
    return Verificacao("configuração", True, f"{caminho}, modelo {config.modelo}")


def _configuracao_existente(home: Path) -> Configuracao | None:
    caminho = pasta_app(home) / "config.toml"
    return configuracao.carregar(caminho) if caminho.is_file() else None


def _pasta_de_modelos_padrao(home: Path, respeitar_variaveis: bool = True) -> Path:
    # A mesma ordem do huggingface_hub, com que o fluxo manual do mlx-whisper baixa os modelos.
    if respeitar_variaveis:
        if os.environ.get("HF_HUB_CACHE"):
            return Path(os.environ["HF_HUB_CACHE"]).expanduser()
        if os.environ.get("HF_HOME"):
            return Path(os.environ["HF_HOME"]).expanduser() / "hub"
    return Path(home) / ".cache" / "huggingface" / "hub"


def _detectar_ffmpeg(existente: Configuracao | None) -> Path | None:
    candidatos = [existente.ffmpeg] if existente else []
    candidatos.append(configuracao.ffmpeg_detectado())
    for candidato in candidatos:
        if _executavel(candidato):
            return Path(candidato).absolute()
    return None


def _importa_mlx_whisper() -> bool:
    try:
        import mlx_whisper  # noqa: F401
    except Exception:  # noqa: BLE001 - instalação quebrada conta como ausente
        return False
    return True


def _importa_faster_whisper() -> bool:
    from .trabalhador import registrar_bibliotecas_da_nvidia

    # As DLLs da NVIDIA ao alcance do CTranslate2 antes de importá-lo, como no trabalhador.
    registrar_bibliotecas_da_nvidia()
    try:
        import faster_whisper  # noqa: F401
    except Exception:  # noqa: BLE001 - instalação quebrada conta como ausente
        return False
    return True


def _placas_cuda() -> int:
    try:
        import ctranslate2

        return ctranslate2.get_cuda_device_count()
    except Exception:  # noqa: BLE001 - driver ausente ou quebrado conta como sem placa
        return 0


def _bibliotecas_da_placa() -> bool:
    from .trabalhador import bibliotecas_da_placa_presentes

    return bibliotecas_da_placa_presentes()


def _executavel(caminho: Path) -> bool:
    return Path(caminho).is_file() and os.access(caminho, os.X_OK)


def _aspas(valor) -> str:
    return "'" + str(valor).replace("'", "'\\''") + "'"


def _aspas_do_powershell(valor) -> str:
    # Entre aspas simples, o PowerShell não interpreta nada; a própria aspa se escreve dobrada.
    return "'" + str(valor).replace("'", "''") + "'"


def _caminhos_recusados_pelo_cmd(pasta: Path, python: Path) -> list[str]:
    """Os caminhos que o lançador `.bat` não representaria com segurança (D-14)."""
    faltas = []
    for caminho in (pasta, python):
        texto = str(caminho)
        especiais = sorted({caractere for caractere in texto if caractere in CARACTERES_DO_CMD})
        if especiais:
            faltas.append(
                f"o caminho {texto} tem {' '.join(especiais)}, que o cmd.exe interpreta no lançador: "
                "use uma pasta e um Python sem esses caracteres"
            )
            continue
        try:
            texto.encode("oem")
        except UnicodeEncodeError:
            faltas.append(
                f"o caminho {texto} tem caracteres que o cmd.exe não representa na página de código do console: "
                "use uma pasta e um Python sem eles"
            )
    return faltas


def _copiar_codigo(origem: Path, destino: Path) -> None:
    # Cópia, e não referência ao repositório, para que movê-lo não quebre o host (DT-08).
    novo = destino.with_name(destino.name + ".novo")
    shutil.rmtree(novo, ignore_errors=True)
    shutil.copytree(origem, novo, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    shutil.rmtree(destino, ignore_errors=True)
    novo.rename(destino)


def _gravar(
    caminho: Path, texto: str, modo: int = 0o644, *, codificacao: str = "utf-8", fim_de_linha: str | None = None
) -> None:
    temporario = caminho.with_name(caminho.name + ".tmp")
    temporario.write_text(texto, encoding=codificacao, newline=fim_de_linha)
    temporario.chmod(modo)
    temporario.replace(caminho)


def _apagar_pasta(pasta: Path) -> None:
    for tentativa in range(TENTATIVAS_DE_APAGAR):
        try:
            shutil.rmtree(pasta)
            return
        except FileNotFoundError:
            return
        except OSError:
            if tentativa == TENTATIVAS_DE_APAGAR - 1:
                raise
            time.sleep(INTERVALO_ENTRE_TENTATIVAS_S)


def _gravar_registro(chave: str, valor: str) -> None:
    """Grava `valor` como valor padrão de `HKEY_CURRENT_USER\\<chave>`, criando as chaves do caminho."""
    import winreg

    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, chave) as aberta:
        winreg.SetValueEx(aberta, "", 0, winreg.REG_SZ, valor)


def _ler_registro(chave: str) -> str | None:
    import winreg

    try:
        return winreg.QueryValue(winreg.HKEY_CURRENT_USER, chave)
    except FileNotFoundError:
        return None


def _apagar_registro(chave: str) -> bool:
    """Apaga só a subchave do host, nunca a `NativeMessagingHosts`, que guarda os de outros aplicativos."""
    import winreg

    try:
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, chave)
    except FileNotFoundError:
        return False
    return True


def _conferir_registros(home: Path, raiz: str) -> list[Verificacao]:
    esperado = caminho_manifesto_host(home)
    verificacoes = []
    for navegador, chave in chaves_do_registro(raiz):
        nome, completa = f"registro no {navegador}", rf"HKEY_CURRENT_USER\{chave}"
        valor = _ler_registro(chave)
        if valor is None:
            detalhe = f"{completa} ausente, e o {navegador} não encontra o host; reinstale com {MOTOR} instalar"
            verificacoes.append(Verificacao(nome, False, detalhe))
        elif Path(valor) != esperado:
            detalhe = f"{completa} aponta para {valor}, e não para {esperado}; reinstale com {MOTOR} instalar"
            verificacoes.append(Verificacao(nome, False, detalhe))
        else:
            verificacoes.append(Verificacao(nome, True, completa))
    return verificacoes


def _encerrar_registrado(registro: Path, pid: int) -> bool:
    try:
        registrado_em = registro.stat().st_mtime
    except OSError:
        return False
    if not plataforma.encerrar_conferido(pid, registrado_em):
        return False
    # Encerrado à força, o host não apaga o próprio registro.
    registro.unlink(missing_ok=True)
    return True


def _tamanho(caminho: Path) -> int:
    try:
        return caminho.stat().st_size
    except OSError:
        return 0


# A linha que o trabalhador manda ao diagnóstico quando o modelo carrega (D-05).
_LINHA_DO_DISPOSITIVO = re.compile(r"\S+ (?:info|aviso) (modelo carregado (?:na placa de vídeo|no processador: .+))")


def _dispositivo_no_diagnostico(log: Path, desde: int) -> str | None:
    """O dispositivo que o host lançado pelo diagnóstico anotou, nas linhas escritas depois de `desde`.

    Se o host podou o diagnóstico ao iniciar, ele ficou menor que `desde`, e vale o que
    restou; a última linha de dispositivo é a do host que acabou de carregar.
    """
    try:
        with log.open("rb") as arquivo:
            tamanho = arquivo.seek(0, os.SEEK_END)
            arquivo.seek(desde if desde <= tamanho else 0)
            texto = arquivo.read().decode("utf-8", "replace")
    except OSError:
        return None
    encontrados = [casamento[1] for linha in texto.splitlines() if (casamento := _LINHA_DO_DISPOSITIVO.fullmatch(linha.strip()))]
    return encontrados[-1] if encontrados else None


def _texto_do_lancador_do_windows(python: Path, pasta: Path) -> str:
    # As mesmas variáveis do lançador do Mac; o PYTHONUTF8 fixa o UTF-8 que o macOS já usa.
    # A OpenBLAS do numpy, ao ser importada, compromete um buffer por linha lógica, cerca de
    # 0,5 GB num i7 de 16 linhas, no host e no trabalhador; nenhum dos dois precisa de mais
    # de uma linha nela, porque o CTranslate2 tem as próprias.
    linhas = [
        "@echo off",
        "rem Lançador do host de Native Messaging do whispper-whatsapp-web, gravado por motor.cmd instalar.",
        'set "HF_HUB_OFFLINE=1"',
        'set "HF_HUB_DISABLE_TELEMETRY=1"',
        f'set "WHISPPER_MOTOR_PASTA={pasta}"',
        f'set "PYTHONPATH={pasta}"',
        'set "PYTHONSAFEPATH=1"',
        'set "PYTHONUTF8=1"',
        'set "OPENBLAS_NUM_THREADS=1"',
        f'"{python}" -m whispper_motor %*',
    ]
    return "\n".join(linhas) + "\n"


def _texto_do_lancador(python: Path, pasta: Path) -> str:
    # PYTHONSAFEPATH tira o diretório corrente do sys.path: nenhum outro whispper_motor
    # faz sombra à cópia instalada, qualquer que seja a pasta de onde o host é lançado.
    return (
        "#!/bin/sh\n"
        "# Lançador do host de Native Messaging do whispper-whatsapp-web, gravado por motor.sh instalar.\n"
        "export HF_HUB_OFFLINE=1\n"
        "export HF_HUB_DISABLE_TELEMETRY=1\n"
        f"export WHISPPER_MOTOR_PASTA={_aspas(pasta)}\n"
        f"export PYTHONPATH={_aspas(pasta)}\n"
        "export PYTHONSAFEPATH=1\n"
        f'exec {_aspas(python)} -m whispper_motor "$@"\n'
    )


def _manifesto_do_host(lancador: Path, extensao_id: str) -> dict:
    return {
        "name": NOME_DO_HOST,
        "description": DESCRICAO_DO_HOST,
        "path": str(lancador),
        "type": "stdio",
        "allowed_origins": [f"chrome-extension://{extensao_id}/"],
    }


def _ler_manifesto_do_host(caminho: Path) -> tuple[dict | None, str]:
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, f"não encontrado em {caminho}; instale com {MOTOR} instalar"
    except (OSError, ValueError):
        return None, f"ilegível: {caminho}"
    if (
        not isinstance(dados, dict)
        or dados.get("name") != NOME_DO_HOST
        or dados.get("type") != "stdio"
        or not isinstance(dados.get("path"), str)
        or not isinstance(dados.get("allowed_origins"), list)
        or not all(isinstance(origem, str) for origem in dados["allowed_origins"])
    ):
        return None, f"fora do formato do Chrome: {caminho}"
    return dados, str(caminho)


def _pedir_estado(processo: subprocess.Popen, leitor: plataforma.Leitor) -> dict:
    try:
        protocolo.escrever_mensagem(processo.stdin, {"tipo": "verificar", "protocolo": PROTOCOLO})
    except OSError:
        raise _HostFalhou("o host fechou a entrada") from None
    (tamanho,) = struct.unpack("=I", _ler_exato(leitor, 4))
    if tamanho > protocolo.LIMITE_SAIDA:
        raise _HostFalhou("enquadramento inválido na saída do host")
    try:
        resposta = json.loads(_ler_exato(leitor, tamanho))
    except ValueError:
        raise _HostFalhou("resposta que não é JSON") from None
    if (
        not isinstance(resposta, dict)
        or resposta.get("tipo") != "estado"
        or resposta.get("estado") not in ("carregando", "pronto", "erro")
    ):
        raise _HostFalhou("resposta fora do protocolo")
    return resposta


def _ler_exato(leitor: plataforma.Leitor, tamanho: int) -> bytes:
    dados = b""
    limite = time.monotonic() + PRAZO_DE_RESPOSTA_S
    while len(dados) < tamanho:
        try:
            pedaco = leitor.ler(tamanho - len(dados), limite)
        except plataforma.PrazoEsgotado:
            raise _HostFalhou(f"sem resposta em {PRAZO_DE_RESPOSTA_S:.0f} s") from None
        if not pedaco:
            raise _HostFalhou("o host encerrou sem responder")
        dados += pedaco
    return dados


def _encerrar_host(processo: subprocess.Popen) -> int | None:
    """Fecha a entrada, como a extensão ao fechar a porta, e espera o host sair."""
    try:
        processo.stdin.close()
    except OSError:
        pass
    try:
        return processo.wait(ESPERA_DO_ENCERRAMENTO_S)
    except subprocess.TimeoutExpired:
        processo.kill()
        processo.wait()
        return None
    finally:
        processo.stdout.close()


def _explicar_falha(falha: str, codigo: int | None, origem: str, saida_de_erro) -> str:
    if codigo == ORIGEM_RECUSADA:
        partes = [f"o host recusou a origem {origem}: confira o extensao_id da configuração"]
    elif codigo == ENTRADA_CORROMPIDA:
        partes = ["o host acusou enquadramento inválido na entrada"]
    else:
        partes = [falha] + ([f"código {codigo}"] if codigo not in (None, 0) else [])
    saida_de_erro.seek(0)
    linhas = saida_de_erro.read().decode("utf-8", "replace").strip().splitlines()
    if linhas:
        partes.append(linhas[-1])
    return "; ".join(partes)


# Linha de comando


def principal(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog=MOTOR,
        description="Instala, desinstala ou diagnostica o aplicativo auxiliar do whispper-whatsapp-web, sem acessar a rede.",
    )
    subcomandos = parser.add_subparsers(dest="comando", required=True, metavar="{instalar,desinstalar,diagnosticar}")
    subcomandos.add_parser("instalar", help="confere os pré-requisitos e registra o aplicativo no navegador")
    subcomandos.add_parser("desinstalar", help="remove o aplicativo e o registro no navegador, preservando o cache de modelos")
    subcomandos.add_parser("diagnosticar", help="confere o registro no navegador e fala diretamente com o host")
    args = parser.parse_args(argv)

    home = Path.home()
    try:
        if args.comando == "desinstalar":
            return _comando_desinstalar(home)
        try:
            extensao_id = identificador_da_extensao(ler_key(MANIFESTO_DA_EXTENSAO))
        except (OSError, ValueError) as erro:
            print(f"{MOTOR}: não foi possível ler a key de {MANIFESTO_DA_EXTENSAO}: {erro}", file=sys.stderr)
            return 1
        if args.comando == "instalar":
            return _comando_instalar(home, extensao_id)
        return _comando_diagnosticar(home, extensao_id)
    except OSError as erro:
        print(f"{MOTOR}: {erro}", file=sys.stderr)
        return 1


def _comando_instalar(home: Path, extensao_id: str) -> int:
    ambiente = detectar_ambiente(home)
    print("Pré-requisitos:")
    try:
        config = instalar(ambiente, extensao_id, Path(__file__).resolve().parent)
    except PrerequisitosAusentes as recusa:
        for falta in recusa.faltas:
            print(f"  falta  {falta}")
        _mostrar_avisos(ambiente)
        print("Instalação recusada; nada foi gravado.")
        return 1
    for item in conferir_prerequisitos(ambiente, config.modelo):
        print(f"  ok     {item.nome}: {item.detalhe}")
    _mostrar_avisos(ambiente)
    print(f"Interpretador: {ambiente.python}")
    print(f"Identificador da extensão: {extensao_id}")
    print("Gravados:")
    if plataforma.WINDOWS:
        print(f"  {pasta_app(home)} (código, config.toml, lançador {NOME_DO_LANCADOR} e manifesto do host)")
        for navegador, chave in chaves_do_registro(ambiente.raiz_do_registro):
            print(f"  HKEY_CURRENT_USER\\{chave} ({navegador})")
        print("Confira com: auxiliar\\motor.cmd diagnosticar")
    else:
        print(f"  {pasta_app(home)} (código, config.toml e lançador {NOME_DO_LANCADOR})")
        print(f"  {caminho_manifesto_host(home)}")
        print("Confira com: auxiliar/motor.sh diagnosticar")
    return 0


def _mostrar_avisos(ambiente: Ambiente) -> None:
    for aviso in avisos_de_prerequisitos(ambiente):
        print(f"  aviso  {aviso}")


def _comando_desinstalar(home: Path) -> int:
    encerrados: list[int] = []
    removidos = desinstalar(home, hosts_encerrados=encerrados)
    if not removidos:
        print("Nada a remover: o aplicativo auxiliar não está instalado.")
    for pid in encerrados:
        print(f"  encerrado  host em execução (PID {pid})")
    for caminho in removidos:
        print(f"  removido  {caminho}")
    extensoes = "brave://extensions ou chrome://extensions" if plataforma.WINDOWS else "chrome://extensions"
    print(f"O cache de modelos foi preservado. A extensão se remove em {extensoes}.")
    return 0


def _comando_diagnosticar(home: Path, extensao_id: str) -> int:
    from .servidor import PRAZO_DE_CARREGAMENTO_S

    print(f"Identificador da extensão: {extensao_id}")
    print("Conferindo; o host pode levar alguns segundos para carregar o modelo.")
    verificacoes = diagnosticar(home, extensao_id, aguardar_pronto_s=PRAZO_DE_CARREGAMENTO_S + 10)
    for item in verificacoes:
        print(f"  {'ok' if item.ok else 'falha':<6} {item.nome}: {item.detalhe}")
    return 0 if all(item.ok for item in verificacoes) else 1


if __name__ == "__main__":
    sys.exit(principal())
