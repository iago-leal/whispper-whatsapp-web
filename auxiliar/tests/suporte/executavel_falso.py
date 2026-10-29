"""Executáveis falsos para os testes, escritos em Python e lançados como um programa qualquer.

No macOS, o falso é um script com `#!` para o interpretador dos testes. No Windows,
que não executa scripts por `#!`, é um `.py` com lançador `.cmd`; como o Popen então
encerra o `cmd.exe`, e não o Python, o falso vigia o pai e sai quando ele morre, para
se comportar como o executável único que imita.
"""

import sys
from pathlib import Path

WINDOWS = sys.platform == "win32"

_VIGIA_DO_PAI = """\
import ctypes, os, threading

def _vigiar_o_pai():
    kernel32 = ctypes.WinDLL("kernel32")
    kernel32.OpenProcess.restype = ctypes.c_void_p
    pai = kernel32.OpenProcess(0x00100000, False, os.getppid())  # SYNCHRONIZE
    if pai:
        kernel32.WaitForSingleObject(ctypes.c_void_p(pai), 0xFFFFFFFF)
    os._exit(1)

threading.Thread(target=_vigiar_o_pai, daemon=True).start()
"""


def criar(caminho: Path, corpo: str) -> Path:
    """Grava um executável que roda `corpo` e devolve o caminho a passar ao Popen."""
    caminho = Path(caminho)
    if WINDOWS:
        script = caminho.with_suffix(".py")
        script.write_text(_VIGIA_DO_PAI + corpo + "\n", encoding="utf-8")
        # O interpretador de base, e não o lançador do ambiente virtual, que poria um
        # processo a mais entre o `cmd.exe` e o falso.
        python = getattr(sys, "_base_executable", None) or sys.executable
        lancador = caminho.with_suffix(".cmd")
        lancador.write_text(f'@"{python}" "{script}" %*\r\n', encoding="utf-8")
        return lancador
    caminho.write_text(f"#!{sys.executable}\n{corpo}\n", encoding="utf-8")
    caminho.chmod(0o755)
    return caminho
