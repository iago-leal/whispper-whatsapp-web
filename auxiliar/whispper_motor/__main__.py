"""Ponto de entrada do host de Native Messaging: `python -m whispper_motor <origem>`.

O Chrome lança o host com a origem da extensão como primeiro argumento e fala com
ele pela entrada e pela saída padrão. O host termina com código 0 no fim da entrada.
"""

from __future__ import annotations

import os
import re
import shutil
import signal
import sys
import tempfile
from pathlib import Path

PASTA_PADRAO = "~/Library/Application Support/whispper-motor"
# Na pasta do aplicativo, um arquivo por host em execução, com o PID por nome (RF-16).
PASTA_DE_HOSTS = "hosts"
ORIGEM_RECUSADA = 2
ENTRADA_CORROMPIDA = 3

PREFIXO_TEMPORARIO = "whispper-motor-"
# O PID do dono vai no nome da pasta temporária, entre o prefixo e o sufixo do mkdtemp.
_PASTA_TEMPORARIA_DE_HOST = re.compile(re.escape(PREFIXO_TEMPORARIO) + r"(\d+)-[a-z0-9_]+")


def principal(argv: list[str] | None = None, fabrica_trabalhador=None) -> int:
    saida = _proteger_saida_padrao()
    pasta = Path(os.environ.get("WHISPPER_MOTOR_PASTA") or PASTA_PADRAO).expanduser()
    _desviar_saida_de_erro(pasta / "diagnostico.log")

    # Importados só depois da troca de descritores: nem uma biblioteca, ao carregar,
    # alcança a saída do protocolo.
    from . import VERSAO_APP, configuracao, protocolo
    from .registro import RegistroDeDesempenho, diagnostico
    from .servidor import Servidor
    from .trabalhador import TrabalhadorMlx

    argv = sys.argv[1:] if argv is None else argv
    erro_inicial = None
    try:
        config = configuracao.carregar(pasta / "config.toml")
    except configuracao.ConfiguracaoInvalida as erro:
        # Sem configuração legível não há identificador a conferir; o host só responde
        # "erro" com o motivo, sem decodificar nem carregar nada.
        config, erro_inicial = configuracao.Configuracao(), str(erro)
    else:
        origem = argv[0] if argv else None
        if config.extensao_id is None or origem != f"chrome-extension://{config.extensao_id}/":
            diagnostico("origem recusada", "erro")
            return ORIGEM_RECUSADA

    os.environ.setdefault("HF_HUB_OFFLINE", "1")
    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    signal.signal(signal.SIGTERM, _ao_receber_sigterm)

    temporarios = criar_pasta_temporaria()
    registro_do_host = _registrar_host(pasta)
    servidor = Servidor(
        config,
        fabrica_trabalhador or TrabalhadorMlx,
        lambda mensagem: protocolo.escrever_mensagem(saida, mensagem),
        RegistroDeDesempenho(pasta / "desempenho.tsv"),
        temporarios,
        erro_inicial=erro_inicial,
    )
    diagnostico(f"host iniciado, versão {VERSAO_APP}")
    codigo = 0
    try:
        servidor.iniciar()
        entrada = sys.stdin.buffer
        while (bruto := protocolo.ler_mensagem(entrada)) is not None:
            servidor.receber(bruto)
    except protocolo.EnquadramentoInvalido:
        # Sem o tamanho certo não há como achar o início da mensagem seguinte.
        diagnostico("enquadramento inválido na entrada", "erro")
        codigo = ENTRADA_CORROMPIDA
    finally:
        # A pasta sai primeiro: encerrar um trabalhador ocupado leva segundos, e o Chrome
        # pode matar o host nesse meio-tempo. Sem ela, a decodificação em curso só falha.
        shutil.rmtree(temporarios, ignore_errors=True)
        servidor.encerrar()
        diagnostico("host encerrado")
        # Por último: a desinstalação espera este arquivo sumir para apagar a pasta.
        if registro_do_host is not None:
            registro_do_host.unlink(missing_ok=True)
    return codigo


def criar_pasta_temporaria(base: Path | None = None) -> Path:
    """Cria a pasta temporária privada deste host, depois de varrer as dos hosts que já não existem."""
    base = Path(base or tempfile.gettempdir())
    varrer_temporarios_orfaos(base)
    return Path(tempfile.mkdtemp(prefix=f"{PREFIXO_TEMPORARIO}{os.getpid()}-", dir=base))


def varrer_temporarios_orfaos(base: Path) -> list[Path]:
    """Apaga as pastas temporárias deixadas por hosts derrubados à força; devolve as apagadas.

    Um host morto por SIGKILL não chega a apagar a própria pasta. A dona de cada uma
    é identificada pelo PID no nome, e só sai a pasta cujo processo já não existe:
    nunca a de outro host vivo, pois dois podem coexistir, como durante o
    diagnóstico. Na dúvida, inclusive quando o PID foi reaproveitado por outro
    processo, a pasta fica. As do formato anterior, sem o PID, também ficam.
    """
    removidas = []
    try:
        entradas = list(os.scandir(base))
    except OSError:
        return removidas
    for entrada in entradas:
        casamento = _PASTA_TEMPORARIA_DE_HOST.fullmatch(entrada.name)
        if casamento is None or _processo_existe(int(casamento[1])):
            continue
        try:
            if not entrada.is_dir(follow_symlinks=False) or entrada.stat(follow_symlinks=False).st_uid != os.getuid():
                continue
        except OSError:
            continue
        shutil.rmtree(entrada.path, ignore_errors=True)
        removidas.append(Path(entrada.path))
    return removidas


def _processo_existe(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except (OSError, OverflowError):
        # Sem permissão, o processo existe; fora do intervalo, o nome não é de um host.
        return True
    return True


def _registrar_host(pasta: Path) -> Path | None:
    """Anota o PID deste host na pasta do aplicativo, onde a desinstalação o encontra.

    Sem a pasta, não grava nada, para não deixar resíduo depois da desinstalação. Os
    registros de hosts derrubados à força saem aqui.
    """
    if not pasta.is_dir():
        return None
    registros = pasta / PASTA_DE_HOSTS
    try:
        registros.mkdir(exist_ok=True)
        for antigo in registros.iterdir():
            if antigo.name.isdigit() and not _processo_existe(int(antigo.name)):
                antigo.unlink(missing_ok=True)
        registro = registros / str(os.getpid())
        registro.touch()
    except OSError:
        return None
    return registro


def _proteger_saida_padrao():
    """Troca de descritores (DT-04): o protocolo escreve num duplicado privado da saída
    padrão, e o descritor 1 passa a apontar para a saída de erro, de modo que nenhuma
    escrita acidental, do Python, de biblioteca nativa ou de processo filho, alcance o Chrome.
    """
    privado = os.dup(1)
    os.dup2(2, 1)
    return os.fdopen(privado, "wb")


def _desviar_saida_de_erro(caminho: Path) -> None:
    """Aponta os descritores 1 e 2 para o `diagnostico.log`, podado ao iniciar (DT-05).

    Sem a pasta do aplicativo, a saída de erro herdada fica como está: o host não cria
    a pasta, para não deixar resíduo depois da desinstalação.
    """
    from .registro import abrir_diagnostico

    try:
        descritor = abrir_diagnostico(caminho)
    except OSError:
        return
    os.dup2(descritor, 2)
    os.dup2(descritor, 1)
    os.close(descritor)


def _ao_receber_sigterm(sinal, quadro):
    # Vira SystemExit na linha principal, e o `finally` encerra o trabalhador e apaga
    # a pasta temporária.
    raise SystemExit(0)


if __name__ == "__main__":
    sys.exit(principal())
