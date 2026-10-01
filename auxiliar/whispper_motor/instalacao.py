"""Instalação, desinstalação e diagnóstico do aplicativo auxiliar (RF-16, DT-07, DT-08).

Chamado pelo `auxiliar/motor.sh`, que escolhe o interpretador em que o mlx-whisper
está instalado: `python -m whispper_motor.instalacao instalar | desinstalar | diagnosticar`.

Nada aqui acessa a rede: o modelo precisa estar no cache local e, se faltar, a
recusa mostra como baixá-lo por fora. A desinstalação não toca no cache de modelos.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import platform
import select
import shutil
import signal
import struct
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import NamedTuple

from . import NOME_DO_HOST, PROTOCOLO, configuracao, modelos, protocolo
from .__main__ import ENTRADA_CORROMPIDA, ORIGEM_RECUSADA, PASTA_DE_HOSTS, PASTA_PADRAO
from .configuracao import Configuracao, ConfiguracaoInvalida

PYTHON_MINIMO = (3, 11)
NOME_DO_LANCADOR = "whispper-motor"
DESCRICAO_DO_HOST = "Motor de transcrição local do whispper-whatsapp-web"
MANIFESTO_DA_EXTENSAO = Path(__file__).resolve().parents[2] / "extension" / "manifest.json"

PATH_DO_CHROME = "/usr/bin:/bin:/usr/sbin:/sbin"
PRAZO_DE_RESPOSTA_S = 10.0
INTERVALO_ENTRE_VERIFICACOES_S = 0.5
ESPERA_DO_ENCERRAMENTO_S = 15.0
# O host encerra o trabalhador em até 0,5 s e o despachante em até 5 s depois do SIGTERM.
ESPERA_DOS_HOSTS_S = 6.0

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
    return Path(home) / Path(PASTA_PADRAO).relative_to("~")


def caminho_manifesto_host(home: Path) -> Path:
    pasta = Path(home) / "Library" / "Application Support" / "Google" / "Chrome" / "NativeMessagingHosts"
    return pasta / f"{NOME_DO_HOST}.json"


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
    return Ambiente(
        home=home,
        python=Path(sys.executable),
        versao_python=(sys.version_info.major, sys.version_info.minor),
        sistema=platform.system(),
        arquitetura=platform.machine(),
        ffmpeg=_detectar_ffmpeg(existente),
        mlx_whisper=_importa_mlx_whisper(),
        pasta_de_modelos=existente.pasta_de_modelos if existente else _pasta_de_modelos_padrao(home),
    )


def conferir_prerequisitos(ambiente: Ambiente, modelo: str) -> list[Verificacao]:
    python = ambiente.python
    versao = ".".join(map(str, ambiente.versao_python))
    minimo = ".".join(map(str, PYTHON_MINIMO))
    plataforma = f"{ambiente.sistema} {ambiente.arquitetura}"
    return [
        _item(
            "Mac com Apple Silicon",
            (ambiente.sistema, ambiente.arquitetura) == ("Darwin", "arm64"),
            plataforma,
            f"é preciso um Mac com Apple Silicon, e este sistema é {plataforma}: "
            "o MLX só roda em macOS com processador Apple",
        ),
        _item(
            f"Python {minimo} ou superior",
            ambiente.versao_python >= PYTHON_MINIMO,
            f"{versao} em {python}",
            f"é preciso Python {minimo} ou superior, e {python} é {versao}; defina WHISPPER_PYTHON com outro interpretador",
        ),
        _conferir_ffmpeg(ambiente.ffmpeg),
        _item(
            "mlx-whisper",
            ambiente.mlx_whisper,
            f"importável por {python}",
            f"mlx-whisper ausente: {python} não o importa; instale-o nesse interpretador "
            "ou defina WHISPPER_PYTHON com o Python em que ele está instalado",
        ),
        _conferir_modelo(ambiente, modelo),
    ]


def verificar_prerequisitos(ambiente: Ambiente, modelo: str) -> list[str]:
    """As mensagens dos pré-requisitos que faltam; lista vazia quando tudo está presente."""
    return [item.detalhe for item in conferir_prerequisitos(ambiente, modelo) if not item.ok]


def comando_de_download(ambiente: Ambiente, modelo: str) -> str:
    prefixo = ""
    if ambiente.pasta_de_modelos != _pasta_de_modelos_padrao(ambiente.home, respeitar_variaveis=False):
        prefixo = f"HF_HUB_CACHE={_aspas(ambiente.pasta_de_modelos)} "
    codigo = f"from huggingface_hub import snapshot_download; snapshot_download({modelo!r})"
    return f'{prefixo}{_aspas(ambiente.python)} -c "{codigo}"'


# Instalação e desinstalação (DT-08)


def instalar(ambiente: Ambiente, extensao_id: str, codigo: Path) -> Configuracao:
    """Grava o código, a configuração, o lançador e o manifesto do host no Chrome.

    Tudo é conferido antes do primeiro arquivo: faltando um pré-requisito, nada é
    gravado. Numa reinstalação, o modelo e a ociosidade escolhidos são preservados.
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
    _gravar(lancador, _texto_do_lancador(ambiente.python, pasta), modo=0o755)
    # O manifesto vem por último: o Chrome só encontra o host quando ele já está completo.
    manifesto = caminho_manifesto_host(ambiente.home)
    manifesto.parent.mkdir(parents=True, exist_ok=True)
    _gravar(manifesto, json.dumps(_manifesto_do_host(lancador, extensao_id), ensure_ascii=False, indent=2) + "\n")
    return config


def desinstalar(home: Path, hosts_encerrados: list[int] | None = None) -> list[Path]:
    """Remove o manifesto do host e a pasta do aplicativo; devolve o que existia e foi removido.

    Os hosts desta instalação em execução são encerrados antes que a pasta suma: sem
    isso, a extensão conectada seguiria vendo o motor "pronto", com o modelo na
    memória (RF-16). Com `hosts_encerrados`, a lista recebe os PIDs deles.
    """
    removidos = []
    # O manifesto sai primeiro, para que o Chrome deixe de lançar o host antes que o código suma.
    manifesto = caminho_manifesto_host(home)
    if manifesto.exists():
        manifesto.unlink()
        removidos.append(manifesto)
    pasta = pasta_app(home)
    encerrados = encerrar_hosts(pasta)
    if hosts_encerrados is not None:
        hosts_encerrados.extend(encerrados)
    if pasta.exists():
        shutil.rmtree(pasta)
        removidos.append(pasta)
    return removidos


def encerrar_hosts(pasta: Path) -> list[int]:
    """Encerra os hosts vivos registrados em `<pasta>/hosts` e devolve os PIDs deles.

    Cada host recebe SIGTERM, que ele converte em encerramento limpo, com o
    trabalhador junto; o que não sair no prazo é morto com os filhos.
    """
    registros = pasta / PASTA_DE_HOSTS
    try:
        pids = sorted(int(registro.name) for registro in registros.iterdir() if registro.name.isdigit())
    except OSError:
        return []
    vivos = [pid for pid in pids if _host_vivo(pid)]
    for pid in vivos:
        _sinalizar(pid, signal.SIGTERM)
    # O host apaga o próprio registro por último, já sem o trabalhador.
    pendentes = list(vivos)
    limite = time.monotonic() + ESPERA_DOS_HOSTS_S
    while pendentes and time.monotonic() < limite:
        time.sleep(0.1)
        pendentes = [pid for pid in pendentes if (registros / str(pid)).exists() and _host_vivo(pid)]
    for pid in pendentes:
        filhos = _filhos(pid)
        for alvo in (pid, *filhos):
            _sinalizar(alvo, signal.SIGKILL)
    return vivos


# Diagnóstico


def diagnosticar(home: Path, extensao_id: str, *, aguardar_pronto_s: float = 0.0) -> list[Verificacao]:
    """Confere a instalação como o Chrome a encontrará e termina falando com o próprio host.

    O host é lançado pelo caminho do manifesto, com a origem que ele autoriza. Com
    `aguardar_pronto_s`, a verificação se repete até o modelo sair de "carregando";
    sem ele, basta a primeira resposta sem erro.
    """
    home = Path(home)
    esperada = f"chrome-extension://{extensao_id}/"
    manifesto, sobre_o_manifesto = _ler_manifesto_do_host(caminho_manifesto_host(home))
    if manifesto is None:
        return [
            Verificacao("manifesto do host", False, sobre_o_manifesto),
            Verificacao("lançador", False, "sem manifesto do host"),
            Verificacao("allowed_origins", False, "sem manifesto do host"),
            _conferir_configuracao(home, None),
            Verificacao("host", False, "não lançado: sem manifesto do host; instale com motor.sh instalar"),
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
        Verificacao("manifesto do host", True, sobre_o_manifesto),
        _item("lançador", lancador_ok, str(lancador), f"{lancador} ausente ou sem permissão de execução"),
        _item(
            "allowed_origins",
            origens == [esperada],
            esperada,
            f"o manifesto autoriza {', '.join(origens) or 'nenhuma origem'}, e a extensão é {esperada}; "
            "reinstale com motor.sh instalar",
        ),
        _conferir_configuracao(home, autorizada),
        host,
    ]


def verificar_host(lancador: Path, origem: str, home: Path, aguardar_pronto_s: float = 0.0) -> Verificacao:
    """Lança o host como o Chrome o lança e lhe pede o estado pelo protocolo 1.

    Como no Chrome: pelo lançador, com a origem como único argumento, na pasta do
    lançador, com o PATH mínimo dos aplicativos do macOS e mensagens precedidas de
    4 bytes de tamanho. O fim da entrada, como a porta fechada, deve encerrá-lo com 0.
    """
    ambiente = {"HOME": str(home), "PATH": PATH_DO_CHROME, "TMPDIR": tempfile.gettempdir()}
    with tempfile.TemporaryFile() as saida_de_erro:
        try:
            processo = subprocess.Popen(
                [str(lancador), origem],
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
        try:
            while True:
                resposta = _pedir_estado(processo)
                if not percurso or percurso[-1] != resposta["estado"]:
                    percurso.append(resposta["estado"])
                if resposta["estado"] != "carregando" or time.monotonic() - inicio >= aguardar_pronto_s:
                    break
                time.sleep(INTERVALO_ENTRE_VERIFICACOES_S)
        except _HostFalhou as erro:
            falha = str(erro)
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
    return Verificacao(
        "host",
        True,
        f"respondeu {respondeu} em {decorrido:.1f} s (versão {resposta.get('versaoApp')}, modelo {resposta.get('modelo')})",
    )


# Apoio


def _item(nome: str, ok: bool, sucesso: str, falta: str) -> Verificacao:
    return Verificacao(nome, ok, sucesso if ok else falta)


def _conferir_ffmpeg(ffmpeg: Path | None) -> Verificacao:
    if ffmpeg is None:
        return Verificacao("ffmpeg", False, "ffmpeg ausente: instale-o (por exemplo, com brew install ffmpeg) e instale de novo")
    if not _executavel(ffmpeg):
        return Verificacao("ffmpeg", False, f"ffmpeg ausente: {ffmpeg} não é um executável")
    return Verificacao("ffmpeg", True, str(ffmpeg))


def _conferir_modelo(ambiente: Ambiente, modelo: str) -> Verificacao:
    try:
        snapshot = modelos.resolver(modelo, ambiente.pasta_de_modelos)
    except modelos.ModeloNaoEncontrado:
        if Path(modelo).expanduser().is_absolute():
            falta = f"modelo não encontrado: {modelo} não tem config.json e os pesos (weights.safetensors ou weights.npz)"
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
            "autorizada no manifesto, e o host recusaria o Chrome; reinstale com motor.sh instalar",
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


def _host_vivo(pid: int) -> bool:
    """O PID é de um host em execução? O comando é conferido porque o PID pode ter sido reaproveitado."""
    resultado = subprocess.run(["/bin/ps", "-ww", "-o", "stat=,command=", "-p", str(pid)], capture_output=True, text=True)
    partes = resultado.stdout.split()
    if resultado.returncode != 0 or not partes or partes[0].startswith("Z"):
        return False
    # O lançador termina em `exec <python> -m whispper_motor <origem>`.
    return any(a == "-m" and b == "whispper_motor" for a, b in zip(partes[1:], partes[2:]))


def _filhos(pid: int) -> list[int]:
    resultado = subprocess.run(["/usr/bin/pgrep", "-P", str(pid)], capture_output=True, text=True)
    return [int(filho) for filho in resultado.stdout.split()]


def _sinalizar(pid: int, sinal: int) -> None:
    try:
        os.kill(pid, sinal)
    except OSError:
        pass


def _executavel(caminho: Path) -> bool:
    return Path(caminho).is_file() and os.access(caminho, os.X_OK)


def _aspas(valor) -> str:
    return "'" + str(valor).replace("'", "'\\''") + "'"


def _copiar_codigo(origem: Path, destino: Path) -> None:
    # Cópia, e não referência ao repositório, para que movê-lo não quebre o host (DT-08).
    novo = destino.with_name(destino.name + ".novo")
    shutil.rmtree(novo, ignore_errors=True)
    shutil.copytree(origem, novo, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    shutil.rmtree(destino, ignore_errors=True)
    novo.rename(destino)


def _gravar(caminho: Path, texto: str, modo: int = 0o644) -> None:
    temporario = caminho.with_name(caminho.name + ".tmp")
    temporario.write_text(texto, encoding="utf-8")
    temporario.chmod(modo)
    temporario.replace(caminho)


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
        return None, f"não encontrado em {caminho}; instale com motor.sh instalar"
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


def _pedir_estado(processo: subprocess.Popen) -> dict:
    try:
        protocolo.escrever_mensagem(processo.stdin, {"tipo": "verificar", "protocolo": PROTOCOLO})
    except OSError:
        raise _HostFalhou("o host fechou a entrada") from None
    (tamanho,) = struct.unpack("=I", _ler_exato(processo, 4))
    if tamanho > protocolo.LIMITE_SAIDA:
        raise _HostFalhou("enquadramento inválido na saída do host")
    try:
        resposta = json.loads(_ler_exato(processo, tamanho))
    except ValueError:
        raise _HostFalhou("resposta que não é JSON") from None
    if (
        not isinstance(resposta, dict)
        or resposta.get("tipo") != "estado"
        or resposta.get("estado") not in ("carregando", "pronto", "erro")
    ):
        raise _HostFalhou("resposta fora do protocolo")
    return resposta


def _ler_exato(processo: subprocess.Popen, tamanho: int) -> bytes:
    dados = b""
    limite = time.monotonic() + PRAZO_DE_RESPOSTA_S
    descritor = processo.stdout.fileno()
    while len(dados) < tamanho:
        restante = limite - time.monotonic()
        if restante <= 0 or not select.select([descritor], [], [], restante)[0]:
            raise _HostFalhou(f"sem resposta em {PRAZO_DE_RESPOSTA_S:.0f} s")
        pedaco = os.read(descritor, tamanho - len(dados))
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
        prog="motor.sh",
        description="Instala, desinstala ou diagnostica o aplicativo auxiliar do whispper-whatsapp-web, sem acessar a rede.",
    )
    subcomandos = parser.add_subparsers(dest="comando", required=True, metavar="{instalar,desinstalar,diagnosticar}")
    subcomandos.add_parser("instalar", help="confere os pré-requisitos e registra o aplicativo no Chrome")
    subcomandos.add_parser("desinstalar", help="remove o aplicativo e o registro no Chrome, preservando o cache de modelos")
    subcomandos.add_parser("diagnosticar", help="confere o registro no Chrome e fala diretamente com o host")
    args = parser.parse_args(argv)

    home = Path.home()
    try:
        if args.comando == "desinstalar":
            return _comando_desinstalar(home)
        try:
            extensao_id = identificador_da_extensao(ler_key(MANIFESTO_DA_EXTENSAO))
        except (OSError, ValueError) as erro:
            print(f"motor.sh: não foi possível ler a key de {MANIFESTO_DA_EXTENSAO}: {erro}", file=sys.stderr)
            return 1
        if args.comando == "instalar":
            return _comando_instalar(home, extensao_id)
        return _comando_diagnosticar(home, extensao_id)
    except OSError as erro:
        print(f"motor.sh: {erro}", file=sys.stderr)
        return 1


def _comando_instalar(home: Path, extensao_id: str) -> int:
    ambiente = detectar_ambiente(home)
    print("Pré-requisitos:")
    try:
        config = instalar(ambiente, extensao_id, Path(__file__).resolve().parent)
    except PrerequisitosAusentes as recusa:
        for falta in recusa.faltas:
            print(f"  falta  {falta}")
        print("Instalação recusada; nada foi gravado.")
        return 1
    for item in conferir_prerequisitos(ambiente, config.modelo):
        print(f"  ok     {item.nome}: {item.detalhe}")
    print(f"Interpretador: {ambiente.python}")
    print(f"Identificador da extensão: {extensao_id}")
    print("Gravados:")
    print(f"  {pasta_app(home)} (código, config.toml e lançador {NOME_DO_LANCADOR})")
    print(f"  {caminho_manifesto_host(home)}")
    print("Confira com: auxiliar/motor.sh diagnosticar")
    return 0


def _comando_desinstalar(home: Path) -> int:
    encerrados: list[int] = []
    removidos = desinstalar(home, hosts_encerrados=encerrados)
    if not removidos:
        print("Nada a remover: o aplicativo auxiliar não está instalado.")
    for pid in encerrados:
        print(f"  encerrado  host em execução (PID {pid})")
    for caminho in removidos:
        print(f"  removido  {caminho}")
    print("O cache de modelos foi preservado. A extensão se remove em chrome://extensions.")
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
