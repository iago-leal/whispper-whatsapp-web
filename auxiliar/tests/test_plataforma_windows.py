"""O job do host e o encerramento conferido, exclusivos do Windows (D-10, D-17, RF-08)."""

import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

from whispper_motor import plataforma

pytestmark = pytest.mark.skipif(sys.platform != "win32", reason="exige o Windows: job do sistema e TerminateProcess")

AUXILIAR = Path(__file__).resolve().parents[1]
AMBIENTE_DO_FILHO = {**os.environ, "PYTHONPATH": str(AUXILIAR)}
# O interpretador de base: a imagem do processo é python.exe, como a do host.
PYTHON = getattr(sys, "_base_executable", None) or sys.executable

INTERMEDIARIO = """
import os, subprocess, sys, time
from whispper_motor import plataforma
preso = plataforma.prender_filhos_ao_host()
filho = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
print(preso, os.getpid(), filho.pid, flush=True)
time.sleep(60)
"""


def esperar(condicao, timeout):
    limite = time.monotonic() + timeout
    while time.monotonic() < limite:
        if condicao():
            return True
        time.sleep(0.05)
    return condicao()


def test_filho_morre_com_o_processo_preso_ao_job():
    intermediario = subprocess.Popen(
        [sys.executable, "-c", INTERMEDIARIO], stdout=subprocess.PIPE, text=True, env=AMBIENTE_DO_FILHO
    )
    pid = None
    try:
        preso, real, pid = intermediario.stdout.readline().split()
        pid = int(pid)
        assert preso == "True"
        assert plataforma.processo_existe(pid)

        # O Python real, e não o lançador do ambiente virtual, cujo job próprio levaria o filho.
        subprocess.run(["taskkill", "/F", "/PID", real], capture_output=True, check=True)
        intermediario.wait(5)

        assert esperar(lambda: not plataforma.processo_existe(pid), 5), "o filho sobreviveu ao processo do job"
    finally:
        if intermediario.poll() is None:
            intermediario.kill()
            intermediario.wait()
        intermediario.stdout.close()
        if pid is not None and plataforma.processo_existe(pid):
            subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True)


def test_job_recusado_devolve_falso(monkeypatch):
    def recusar():
        raise OSError(5, "acesso negado")

    monkeypatch.setattr(plataforma, "_prender_ao_job", recusar)

    assert plataforma.prender_filhos_ao_host() is False


def test_encerramento_conferido_encerra_o_python_registrado():
    processo = subprocess.Popen([PYTHON, "-c", "import time; time.sleep(60)"])
    try:
        assert plataforma.encerrar_conferido(processo.pid, registrado_em=time.time() + 1)
        assert processo.wait(5) is not None
    finally:
        if processo.poll() is None:
            processo.kill()
            processo.wait()


def test_encerramento_conferido_recusa_processo_iniciado_depois_do_registro():
    # Um registro anterior ao início do processo indica PID reaproveitado.
    registrado_em = time.time() - 60
    processo = subprocess.Popen([PYTHON, "-c", "import time; time.sleep(60)"])
    try:
        assert not plataforma.encerrar_conferido(processo.pid, registrado_em=registrado_em)
        time.sleep(0.3)
        assert processo.poll() is None
    finally:
        processo.kill()
        processo.wait()


def test_encerramento_conferido_recusa_outro_executavel():
    processo = subprocess.Popen(["ping", "-n", "30", "127.0.0.1"], stdout=subprocess.DEVNULL)
    try:
        assert not plataforma.encerrar_conferido(processo.pid, registrado_em=time.time() + 1)
        time.sleep(0.3)
        assert processo.poll() is None
    finally:
        processo.kill()
        processo.wait()


def test_encerramento_conferido_de_processo_terminado():
    processo = subprocess.Popen([PYTHON, "-c", "pass"])
    processo.wait()

    assert not plataforma.encerrar_conferido(processo.pid, registrado_em=time.time() + 1)
