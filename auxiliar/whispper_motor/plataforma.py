"""O que depende do sistema operacional no aplicativo auxiliar (D-08).

O protocolo, o servidor, a fila e os registros são os mesmos no macOS e no
Windows. O que muda de um para o outro mora aqui, e os demais módulos só chamam
estas funções: onde fica a pasta do aplicativo, como saber se um processo existe
sem afetá-lo, como encerrar um host, como prender os filhos ao host, como
entregar o MP4 ao ffmpeg e como ler um pipe com prazo.

Este módulo só usa a biblioteca padrão, para poder ser importado antes da troca
de descritores do host.
"""

from __future__ import annotations

import os
import selectors
import signal
import subprocess
import sys
import time
from pathlib import Path

WINDOWS = sys.platform == "win32"
NOME_DA_PASTA = "whispper-motor"


class PrazoEsgotado(Exception):
    """A leitura com prazo não recebeu nada até o instante limite."""


# Pastas e processos


def pasta_padrao_do_app(home: Path | None = None) -> Path:
    """Pasta do aplicativo instalado: código, configuração, lançador e registros."""
    if WINDOWS:
        raise NotImplementedError
    return Path(home or Path.home()) / "Library" / "Application Support" / NOME_DA_PASTA


def processo_existe(pid: int) -> bool:
    """O processo existe? A consulta não o afeta: no Windows, `os.kill(pid, 0)` o encerraria (D-09)."""
    if WINDOWS:
        raise NotImplementedError
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except (OSError, OverflowError):
        # Sem permissão, o processo existe; fora do intervalo, o nome não é de um host.
        return True
    return True


def pasta_e_do_usuario(entrada: os.DirEntry) -> bool:
    """A pasta temporária pertence ao usuário que roda o host?"""
    if WINDOWS:
        raise NotImplementedError
    return entrada.stat(follow_symlinks=False).st_uid == os.getuid()


def host_vivo(pid: int) -> bool:
    """O PID é de um host em execução? O comando é conferido porque o PID pode ter sido reaproveitado."""
    resultado = subprocess.run(["/bin/ps", "-ww", "-o", "stat=,command=", "-p", str(pid)], capture_output=True, text=True)
    partes = resultado.stdout.split()
    if resultado.returncode != 0 or not partes or partes[0].startswith("Z"):
        return False
    # O lançador termina em `exec <python> -m whispper_motor <origem>`.
    return any(a == "-m" and b == "whispper_motor" for a, b in zip(partes[1:], partes[2:]))


def pedir_encerramento(pid: int) -> None:
    """SIGTERM, que o host converte em encerramento limpo, com o trabalhador junto."""
    _sinalizar(pid, signal.SIGTERM)


def matar_com_filhos(pid: int) -> None:
    """SIGKILL no host e nos filhos diretos dele, o trabalhador e o ffmpeg."""
    resultado = subprocess.run(["/usr/bin/pgrep", "-P", str(pid)], capture_output=True, text=True)
    for alvo in (pid, *(int(filho) for filho in resultado.stdout.split())):
        _sinalizar(alvo, signal.SIGKILL)


def _sinalizar(pid: int, sinal: int) -> None:
    try:
        os.kill(pid, sinal)
    except OSError:
        pass


# Entrada, saída e processos filhos


def preparar_entrada_e_saida_binarias() -> None:
    """Põe a entrada e a saída padrão em modo binário; no macOS, elas já são."""
    if WINDOWS:
        raise NotImplementedError


def prender_filhos_ao_host() -> bool:
    """Faz os processos filhos morrerem com o host, ainda que ele seja encerrado à força (D-10).

    No macOS não há o que fazer aqui: o ffmpeg tem limite de CPU próprio, e o
    trabalhador vigia o principal. Devolve falso só quando a garantia não pôde ser
    instalada.
    """
    if WINDOWS:
        raise NotImplementedError
    return True


def entrada_do_mp4(arquivo) -> tuple[list[str], dict]:
    """Argumentos do ffmpeg e opções do Popen para ler o MP4 gravado em `arquivo`, já no início.

    No macOS, o arquivo é anônimo e o ffmpeg o lê por /dev/fd, que admite posicionamento.
    """
    if WINDOWS:
        raise NotImplementedError
    descritor = arquivo.fileno()
    return (
        ["-protocol_whitelist", "file", "-i", f"/dev/fd/{descritor}"],
        {"stdin": subprocess.DEVNULL, "pass_fds": (descritor,)},
    )


class Leitor:
    """Lê um pipe com prazo, sem ficar preso além dele (D-12).

    `ler` devolve até `maximo` bytes assim que houver algum e `b""` no fim do fluxo;
    sem nada até o instante `ate`, do relógio monotônico, levanta PrazoEsgotado.
    """

    def __init__(self, fluxo):
        if WINDOWS:
            raise NotImplementedError
        self._descritor = fluxo.fileno()
        self._seletor = selectors.DefaultSelector()
        self._seletor.register(self._descritor, selectors.EVENT_READ)

    def ler(self, maximo: int, ate: float) -> bytes:
        restante = ate - time.monotonic()
        if restante <= 0 or not self._seletor.select(restante):
            raise PrazoEsgotado()
        return os.read(self._descritor, maximo)

    def fechar(self) -> None:
        self._seletor.close()

    def __enter__(self) -> Leitor:
        return self

    def __exit__(self, *excecao) -> None:
        self.fechar()
