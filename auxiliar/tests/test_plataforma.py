"""O módulo de plataforma, nas duas plataformas (D-08, D-09, D-12)."""

import os
import subprocess
import sys
import time
from pathlib import Path

import pytest

from whispper_motor import plataforma

AUXILIAR = Path(__file__).resolve().parents[1]
AMBIENTE_DO_FILHO = {**os.environ, "PYTHONPATH": str(AUXILIAR)}


def dormir(segundos=30, **opcoes):
    return subprocess.Popen([sys.executable, "-c", f"import time; time.sleep({segundos})"], **opcoes)


def test_consultar_um_processo_vivo_nao_o_encerra():
    filho = dormir()
    try:
        assert plataforma.processo_existe(filho.pid)
        # No Windows, `os.kill(pid, 0)` já o teria encerrado aqui.
        time.sleep(0.3)
        assert filho.poll() is None
        assert plataforma.processo_existe(filho.pid)
    finally:
        filho.kill()
        filho.wait()


def test_processo_terminado_nao_existe():
    filho = subprocess.Popen([sys.executable, "-c", "pass"])
    filho.wait()

    assert not plataforma.processo_existe(filho.pid)


def test_pasta_padrao_do_aplicativo(tmp_path, monkeypatch):
    if plataforma.WINDOWS:
        monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "Local"))
        assert plataforma.pasta_padrao_do_app() == tmp_path / "Local" / "whispper-motor"
    else:
        esperada = tmp_path / "Library" / "Application Support" / "whispper-motor"
        assert plataforma.pasta_padrao_do_app(tmp_path) == esperada


# Um cabeçalho de enquadramento com 0x0A, o \n que o modo texto do Windows viraria \r\n,
# seguido de 0x1A, que o modo texto leria como fim de arquivo, e de um \r\n.
MOLDURA = b"\x0a\x01\x00\x00\x1a\r\nresto"

ECO_BINARIO = """
import os, sys
if sys.platform == "win32":
    import msvcrt
    msvcrt.setmode(0, os.O_TEXT)
    msvcrt.setmode(1, os.O_TEXT)
from whispper_motor import plataforma
plataforma.preparar_entrada_e_saida_binarias()
dados = b""
while len(dados) < %d:
    dados += os.read(0, %d - len(dados))
os.write(1, dados)
""" % (len(MOLDURA), len(MOLDURA))


def test_entrada_e_saida_binarias_preservam_a_moldura():
    eco = subprocess.run(
        [sys.executable, "-c", ECO_BINARIO], input=MOLDURA, capture_output=True, env=AMBIENTE_DO_FILHO, timeout=30
    )

    assert eco.returncode == 0, eco.stderr
    assert eco.stdout == MOLDURA


def test_leitor_entrega_os_bytes_e_o_fim():
    filho = subprocess.Popen(
        [sys.executable, "-c", "import sys; sys.stdout.buffer.write(b'x' * 100_000)"], stdout=subprocess.PIPE
    )
    dados = b""
    with plataforma.Leitor(filho.stdout) as leitor:
        while bloco := leitor.ler(4096, time.monotonic() + 10):
            assert len(bloco) <= 4096
            dados += bloco
        # Depois do fim, o fim continua.
        assert leitor.ler(4096, time.monotonic() + 10) == b""
    filho.wait()
    filho.stdout.close()

    assert dados == b"x" * 100_000


def test_leitor_interrompe_no_prazo_um_processo_mudo():
    filho = dormir(stdout=subprocess.PIPE)
    try:
        with plataforma.Leitor(filho.stdout) as leitor:
            inicio = time.monotonic()
            with pytest.raises(plataforma.PrazoEsgotado):
                leitor.ler(4096, inicio + 0.5)
            assert time.monotonic() - inicio < 3
    finally:
        filho.kill()
        filho.wait()
        filho.stdout.close()


def test_leitor_com_prazo_ja_vencido_nao_espera():
    filho = dormir(stdout=subprocess.PIPE)
    try:
        with plataforma.Leitor(filho.stdout) as leitor, pytest.raises(plataforma.PrazoEsgotado):
            leitor.ler(4096, time.monotonic() - 1)
    finally:
        filho.kill()
        filho.wait()
        filho.stdout.close()
