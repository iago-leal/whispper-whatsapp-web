"""O host completo como processo, com ambiente mínimo como o do Chrome, para os testes (RF-09, D-08).

No macOS, o ambiente vazio do `env -i`; no Windows, só as variáveis sem as quais o
Python não inicia, e o `--parent-window` que o Chrome acrescenta aos argumentos.
"""

import json
import os
import struct
import subprocess
import sys
import time
from pathlib import Path

import pytest

from whispper_motor import configuracao, plataforma
from whispper_motor.configuracao import Configuracao

AUXILIAR = Path(__file__).resolve().parents[2]
HOST = AUXILIAR / "tests" / "suporte" / "host_simulado.py"
AMOSTRAS = AUXILIAR.parent / "amostras" / "sinteticas"
ID = "femjlfnijaboogbcdionddnjcjpfmieg"
ORIGEM = f"chrome-extension://{ID}/"


def preparar_ambiente(tmp_path, ffmpeg):
    """Pasta do aplicativo com configuração válida e pasta temporária própria do host."""
    pasta = tmp_path / "app"
    pasta.mkdir()
    modelo = tmp_path / "modelo"
    modelo.mkdir()
    (modelo / "config.json").write_text("{}")
    (modelo / "weights.safetensors").write_text("")
    configuracao.gravar(
        Configuracao(modelo=str(modelo), pasta_de_modelos=tmp_path, ffmpeg=Path(ffmpeg), extensao_id=ID),
        pasta / "config.toml",
    )
    temporarios = tmp_path / "t"
    temporarios.mkdir()
    return pasta, temporarios


_LEITORES = {}


@pytest.fixture(autouse=True)
def fechar_leitores():
    yield
    for leitor in _LEITORES.values():
        leitor.fechar()
    _LEITORES.clear()


def lancar(pasta, temporarios, origem=ORIGEM):
    argumentos = [sys.executable, str(HOST), origem, "--parent-window=0"]
    if plataforma.WINDOWS:
        sistema = os.environ["SystemRoot"]
        ambiente = {
            "SystemRoot": sistema,
            "PATH": rf"{sistema}\System32;{sistema}",
            "TEMP": str(temporarios),
            "TMP": str(temporarios),
            "PYTHONPATH": str(AUXILIAR),
            "WHISPPER_MOTOR_PASTA": str(pasta),
        }
    else:
        ambiente = {"PYTHONPATH": str(AUXILIAR), "WHISPPER_MOTOR_PASTA": str(pasta), "TMPDIR": str(temporarios)}
        argumentos = ["/usr/bin/env", "-i", *(f"{nome}={valor}" for nome, valor in ambiente.items()), *argumentos]
        ambiente = None
    return subprocess.Popen(
        argumentos, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=ambiente
    )


def enviar(proc, mensagem, tamanho=None):
    corpo = json.dumps(mensagem).encode()
    if tamanho is not None:
        # Espaços depois do objeto: JSON válido, com o tamanho exato pedido.
        corpo = corpo.ljust(tamanho)
    proc.stdin.write(struct.pack("=I", len(corpo)) + corpo)
    proc.stdin.flush()


def ler_exato(proc, n, timeout):
    leitor = _LEITORES.get(proc) or _LEITORES.setdefault(proc, plataforma.Leitor(proc.stdout))
    dados = b""
    limite = time.monotonic() + timeout
    while len(dados) < n:
        try:
            pedaco = leitor.ler(n - len(dados), limite)
        except plataforma.PrazoEsgotado:
            raise AssertionError("o host não respondeu no prazo") from None
        if not pedaco:
            raise AssertionError("o host fechou a saída")
        dados += pedaco
    return dados


def ler_moldura(proc, timeout=10):
    cabecalho = ler_exato(proc, 4, timeout)
    (tamanho,) = struct.unpack("=I", cabecalho)
    assert tamanho < 1_000_000, "enquadramento corrompido por escrita estranha na saída padrão"
    return cabecalho, ler_exato(proc, tamanho, timeout)


def ler(proc, timeout=10):
    return json.loads(ler_moldura(proc, timeout)[1])


def esperar_pronto(proc):
    limite = time.monotonic() + 15
    while time.monotonic() < limite:
        enviar(proc, {"tipo": "verificar", "protocolo": 1})
        if ler(proc)["estado"] == "pronto":
            return
        time.sleep(0.1)
    raise AssertionError("o host não ficou pronto")
