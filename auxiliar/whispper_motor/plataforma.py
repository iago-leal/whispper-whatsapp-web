"""O que depende do sistema operacional no aplicativo auxiliar (D-08).

O protocolo, o servidor, a fila e os registros são os mesmos no macOS e no
Windows. O que muda de um para o outro mora aqui, e os demais módulos só chamam
estas funções: onde fica a pasta do aplicativo, como saber se um processo existe
sem afetá-lo, como encerrar um host, como prender os filhos ao host, como
entregar o MP4 ao ffmpeg e como ler um pipe com prazo.

Este módulo só usa a biblioteca padrão, para poder ser importado antes da troca
de descritores do host. No Windows, as chamadas ao sistema vão pelo `ctypes`, com
os tipos dos argumentos declarados, para que os handles de 64 bits não sejam truncados.
"""

from __future__ import annotations

import ntpath
import os
import queue
import re
import selectors
import signal
import struct
import subprocess
import sys
import threading
import time
from pathlib import Path

WINDOWS = sys.platform == "win32"
NOME_DA_PASTA = "whispper-motor"

# Leitura com prazo no Windows: blocos de 64 KiB numa fila de até 4 MiB, que segura o
# ffmpeg quando o host não lê (D-12).
_TAMANHO_DO_BLOCO = 1 << 16
_BLOCOS_NA_FILA = 64
# O host grava o registro depois de iniciar; a folga cobre a resolução dos relógios.
_FOLGA_DO_REGISTRO_S = 1.0
_ESPERA_DO_ENCERRAMENTO_MS = 5000
# A imagem do host: o python.exe do ambiente, com ou sem a versão no nome.
_IMAGEM_DO_PYTHON = re.compile(r"python[0-9.]*\.exe", re.IGNORECASE)


class PrazoEsgotado(Exception):
    """A leitura com prazo não recebeu nada até o instante limite."""


# Pastas e processos


def pasta_padrao_do_app(home: Path | None = None) -> Path:
    """Pasta do aplicativo instalado: código, configuração, lançador e registros.

    No Windows, em `%LOCALAPPDATA%`, que vale sobre o perfil quando definida.
    """
    if WINDOWS:
        local = os.environ.get("LOCALAPPDATA")
        base = Path(local) if local else Path(home or Path.home()) / "AppData" / "Local"
        return base / NOME_DA_PASTA
    return Path(home or Path.home()) / "Library" / "Application Support" / NOME_DA_PASTA


def processo_existe(pid: int) -> bool:
    """O processo existe? A consulta não o afeta: no Windows, `os.kill(pid, 0)` o encerraria (D-09)."""
    if WINDOWS:
        return _processo_existe_no_windows(pid)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except (OSError, OverflowError):
        # Sem permissão, o processo existe; fora do intervalo, o nome não é de um host.
        return True
    return True


def pasta_e_do_usuario(entrada: os.DirEntry) -> bool:
    """A pasta temporária pertence ao usuário que roda o host?

    No Windows, a pasta temporária fica no perfil do usuário, fora do alcance dos
    demais, e não há dono a conferir.
    """
    if WINDOWS:
        return True
    return entrada.stat(follow_symlinks=False).st_uid == os.getuid()


def host_vivo(pid: int) -> bool:
    """O PID é de um host em execução? O comando é conferido porque o PID pode ter sido reaproveitado.

    Só no macOS; no Windows, `encerrar_conferido` confere e encerra numa operação.
    """
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


def encerrar_conferido(pid: int, registrado_em: float) -> bool:
    """Encerra à força o host `pid`, se ele ainda for o processo registrado; devolve se encerrou (D-17).

    Só no Windows, onde não há sinal que o host possa tratar. O PID pode ter sido
    reaproveitado: só sai um python.exe iniciado antes de `registrado_em`, em segundos
    da época, o instante em que o host gravou o registro. O job do host leva os filhos.
    """
    if not WINDOWS:
        raise NotImplementedError("encerramento conferido só existe no Windows")
    import ctypes
    from ctypes import wintypes

    kernel32 = _kernel32()
    acesso = _PROCESS_QUERY_LIMITED_INFORMATION | _PROCESS_TERMINATE | _SYNCHRONIZE
    handle = kernel32.OpenProcess(acesso, False, pid) if 0 < pid <= 0xFFFFFFFF else None
    if not handle:
        return False
    try:
        codigo = wintypes.DWORD()
        if not kernel32.GetExitCodeProcess(handle, ctypes.byref(codigo)) or codigo.value != _STILL_ACTIVE:
            return False
        if not _IMAGEM_DO_PYTHON.fullmatch(ntpath.basename(_imagem(handle))):
            return False
        criado_em = _instante_de_criacao(handle)
        if criado_em is None or criado_em > registrado_em + _FOLGA_DO_REGISTRO_S:
            return False
        if not kernel32.TerminateProcess(handle, 1):
            return False
        kernel32.WaitForSingleObject(handle, _ESPERA_DO_ENCERRAMENTO_MS)
        return True
    finally:
        kernel32.CloseHandle(handle)


def nucleos_fisicos() -> int:
    """Os núcleos físicos do processador, para as linhas do CTranslate2 no processador (D-03)."""
    if WINDOWS:
        contados = _nucleos_fisicos_no_windows()
        if contados:
            return contados
    return os.cpu_count() or 1


# Entrada, saída e processos filhos


def preparar_entrada_e_saida_binarias() -> None:
    """Põe a entrada e a saída padrão em modo binário; no macOS, elas já são.

    No modo texto do Windows, o 0x0A de um cabeçalho de tamanho viraria 0x0D 0x0A na
    saída, e um 0x1A na entrada seria lido como fim de arquivo (D-08).
    """
    if WINDOWS:
        import msvcrt

        for descritor in (0, 1):
            try:
                msvcrt.setmode(descritor, os.O_BINARY)
            except OSError:
                pass


def prender_filhos_ao_host() -> bool:
    """Faz os processos filhos morrerem com o host, ainda que ele seja encerrado à força (D-10).

    No macOS não há o que fazer aqui: o ffmpeg tem limite de CPU próprio, e o
    trabalhador vigia o principal. No Windows, o host entra num job que o sistema
    encerra, com todos os filhos, quando o último handle dele se fecha, o que acontece
    quando o host morre. Devolve falso só quando a garantia não pôde ser instalada.
    """
    if WINDOWS:
        try:
            _prender_ao_job()
        except OSError:
            return False
    return True


def entrada_do_mp4(arquivo) -> tuple[list[str], dict]:
    """Argumentos do ffmpeg e opções do Popen para ler o MP4 gravado em `arquivo`, já no início.

    No macOS, o arquivo é anônimo e o ffmpeg o lê por /dev/fd, que admite posicionamento.
    No Windows, o arquivo vira a entrada padrão do ffmpeg, lida pelo protocolo `fd`, que
    também admite posicionamento num arquivo comum (D-11).
    """
    if WINDOWS:
        return ["-protocol_whitelist", "fd", "-fd", "0", "-i", "fd:"], {"stdin": arquivo}
    descritor = arquivo.fileno()
    return (
        ["-protocol_whitelist", "file", "-i", f"/dev/fd/{descritor}"],
        {"stdin": subprocess.DEVNULL, "pass_fds": (descritor,)},
    )


class Leitor:
    """Lê um pipe com prazo, sem ficar preso além dele (D-12).

    `ler` devolve até `maximo` bytes assim que houver algum e `b""` no fim do fluxo;
    sem nada até o instante `ate`, do relógio monotônico, levanta PrazoEsgotado.

    No Windows, onde o `select` não aceita pipes, uma linha auxiliar lê o pipe em
    blocos para uma fila limitada, e `ler` espera a fila com o prazo.
    """

    def __init__(self, fluxo):
        self._descritor = fluxo.fileno()
        if WINDOWS:
            self._fila: queue.Queue[bytes] = queue.Queue(_BLOCOS_NA_FILA)
            self._resto = b""
            self._fim = False
            self._fechado = False
            threading.Thread(target=self._ler_em_blocos, name="leitor-com-prazo", daemon=True).start()
        else:
            self._seletor = selectors.DefaultSelector()
            self._seletor.register(self._descritor, selectors.EVENT_READ)

    def ler(self, maximo: int, ate: float) -> bytes:
        if WINDOWS:
            return self._ler_da_fila(maximo, ate)
        restante = ate - time.monotonic()
        if restante <= 0 or not self._seletor.select(restante):
            raise PrazoEsgotado()
        return os.read(self._descritor, maximo)

    def fechar(self) -> None:
        if WINDOWS:
            # A linha auxiliar sai no próximo bloco ou no fim do pipe, sem nada a quem entregar.
            self._fechado = True
        else:
            self._seletor.close()

    def _ler_da_fila(self, maximo: int, ate: float) -> bytes:
        if not self._resto:
            if self._fim:
                return b""
            try:
                bloco = self._fila.get(timeout=max(0.0, ate - time.monotonic()))
            except queue.Empty:
                raise PrazoEsgotado() from None
            if not bloco:
                self._fim = True
                return b""
            self._resto = bloco
        pedaco, self._resto = self._resto[:maximo], self._resto[maximo:]
        return pedaco

    def _ler_em_blocos(self) -> None:
        try:
            while not self._fechado:
                bloco = os.read(self._descritor, _TAMANHO_DO_BLOCO)
                self._entregar(bloco)
                if not bloco:
                    return
        except OSError:
            self._entregar(b"")

    def _entregar(self, bloco: bytes) -> None:
        while not self._fechado:
            try:
                self._fila.put(bloco, timeout=0.1)
                return
            except queue.Full:
                continue

    def __enter__(self) -> Leitor:
        return self

    def __exit__(self, *excecao) -> None:
        self.fechar()


# Chamadas ao sistema do Windows

_PROCESS_TERMINATE = 0x0001
_PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
_SYNCHRONIZE = 0x00100000
_STILL_ACTIVE = 259
_ERROR_ACCESS_DENIED = 5
_JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000
_JOB_OBJECT_EXTENDED_LIMIT_INFORMATION = 9
_RELATION_PROCESSOR_CORE = 0
# Entre 1601 e 1970, em intervalos de 100 ns: a origem do FILETIME e a da época.
_FILETIME_DA_EPOCA = 116_444_736_000_000_000

_KERNEL32 = None
# O handle do job fica aberto até o fim do host; o sistema o fecha quando o host morre.
_JOB = None


def _kernel32():
    """O kernel32, com os tipos das funções usadas aqui declarados."""
    global _KERNEL32
    if _KERNEL32 is None:
        import ctypes
        from ctypes import wintypes

        k = ctypes.WinDLL("kernel32", use_last_error=True)
        handle, dword, bool_ = wintypes.HANDLE, wintypes.DWORD, wintypes.BOOL
        assinaturas = {
            "OpenProcess": ([dword, bool_, dword], handle),
            "CloseHandle": ([handle], bool_),
            "GetExitCodeProcess": ([handle, ctypes.POINTER(dword)], bool_),
            "GetCurrentProcess": ([], handle),
            "TerminateProcess": ([handle, wintypes.UINT], bool_),
            "WaitForSingleObject": ([handle, dword], dword),
            "QueryFullProcessImageNameW": ([handle, dword, wintypes.LPWSTR, ctypes.POINTER(dword)], bool_),
            "GetProcessTimes": ([handle, *[ctypes.POINTER(wintypes.FILETIME)] * 4], bool_),
            "CreateJobObjectW": ([ctypes.c_void_p, wintypes.LPCWSTR], handle),
            "SetInformationJobObject": ([handle, ctypes.c_int, ctypes.c_void_p, dword], bool_),
            "AssignProcessToJobObject": ([handle, handle], bool_),
            "GetLogicalProcessorInformationEx": ([ctypes.c_int, ctypes.c_void_p, ctypes.POINTER(dword)], bool_),
        }
        for nome, (argumentos, retorno) in assinaturas.items():
            funcao = getattr(k, nome)
            funcao.argtypes, funcao.restype = argumentos, retorno
        _KERNEL32 = k
    return _KERNEL32


def _processo_existe_no_windows(pid: int) -> bool:
    if not 0 < pid <= 0xFFFFFFFF:
        # Fora do intervalo, o nome não é de um host: na dúvida, como no macOS, existe.
        return True
    import ctypes
    from ctypes import wintypes

    kernel32 = _kernel32()
    handle = kernel32.OpenProcess(_PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not handle:
        # Sem acesso, o processo existe, de outro usuário ou protegido.
        return ctypes.get_last_error() == _ERROR_ACCESS_DENIED
    try:
        codigo = wintypes.DWORD()
        if not kernel32.GetExitCodeProcess(handle, ctypes.byref(codigo)):
            return True
        return codigo.value == _STILL_ACTIVE
    finally:
        kernel32.CloseHandle(handle)


def _imagem(handle) -> str:
    import ctypes
    from ctypes import wintypes

    tamanho = wintypes.DWORD(32_768)
    nome = ctypes.create_unicode_buffer(tamanho.value)
    if not _kernel32().QueryFullProcessImageNameW(handle, 0, nome, ctypes.byref(tamanho)):
        return ""
    return nome.value


def _instante_de_criacao(handle) -> float | None:
    """O início do processo, em segundos da época."""
    import ctypes
    from ctypes import wintypes

    instantes = [wintypes.FILETIME() for _ in range(4)]
    if not _kernel32().GetProcessTimes(handle, *(ctypes.byref(instante) for instante in instantes)):
        return None
    criacao = instantes[0]
    intervalos = (criacao.dwHighDateTime << 32) | criacao.dwLowDateTime
    return (intervalos - _FILETIME_DA_EPOCA) / 10_000_000


def _prender_ao_job() -> None:
    global _JOB
    import ctypes
    from ctypes import wintypes

    class LimitesBasicos(ctypes.Structure):
        _fields_ = [
            ("PerProcessUserTimeLimit", wintypes.LARGE_INTEGER),
            ("PerJobUserTimeLimit", wintypes.LARGE_INTEGER),
            ("LimitFlags", wintypes.DWORD),
            ("MinimumWorkingSetSize", ctypes.c_size_t),
            ("MaximumWorkingSetSize", ctypes.c_size_t),
            ("ActiveProcessLimit", wintypes.DWORD),
            ("Affinity", ctypes.c_size_t),
            ("PriorityClass", wintypes.DWORD),
            ("SchedulingClass", wintypes.DWORD),
        ]

    class LimitesEstendidos(ctypes.Structure):
        _fields_ = [
            ("BasicLimitInformation", LimitesBasicos),
            ("IoInfo", ctypes.c_ulonglong * 6),
            ("ProcessMemoryLimit", ctypes.c_size_t),
            ("JobMemoryLimit", ctypes.c_size_t),
            ("PeakProcessMemoryUsed", ctypes.c_size_t),
            ("PeakJobMemoryUsed", ctypes.c_size_t),
        ]

    kernel32 = _kernel32()
    job = kernel32.CreateJobObjectW(None, None)
    if not job:
        raise ctypes.WinError(ctypes.get_last_error())
    limites = LimitesEstendidos()
    limites.BasicLimitInformation.LimitFlags = _JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    if not (
        kernel32.SetInformationJobObject(
            job, _JOB_OBJECT_EXTENDED_LIMIT_INFORMATION, ctypes.byref(limites), ctypes.sizeof(limites)
        )
        and kernel32.AssignProcessToJobObject(job, kernel32.GetCurrentProcess())
    ):
        erro = ctypes.WinError(ctypes.get_last_error())
        kernel32.CloseHandle(job)
        raise erro
    _JOB = job


def _nucleos_fisicos_no_windows() -> int | None:
    import ctypes
    from ctypes import wintypes

    kernel32 = _kernel32()
    tamanho = wintypes.DWORD(0)
    kernel32.GetLogicalProcessorInformationEx(_RELATION_PROCESSOR_CORE, None, ctypes.byref(tamanho))
    if not tamanho.value:
        return None
    memoria = ctypes.create_string_buffer(tamanho.value)
    if not kernel32.GetLogicalProcessorInformationEx(_RELATION_PROCESSOR_CORE, memoria, ctypes.byref(tamanho)):
        return None
    # Cada item começa pela relação e pelo tamanho do próprio item, em 32 bits.
    nucleos, deslocamento = 0, 0
    while deslocamento + 8 <= tamanho.value:
        relacao, tamanho_do_item = struct.unpack_from("<II", memoria, deslocamento)
        if not tamanho_do_item:
            break
        nucleos += relacao == _RELATION_PROCESSOR_CORE
        deslocamento += tamanho_do_item
    return nucleos or None
