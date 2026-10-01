"""O host como processo, lançado com ambiente vazio (`env -i`), como faz o Chrome."""

import base64
import json
import os
import select
import struct
import subprocess
import sys
import time
from pathlib import Path

import pytest

from whispper_motor import configuracao
from whispper_motor.configuracao import Configuracao

AUXILIAR = Path(__file__).resolve().parents[1]
HOST = AUXILIAR / "tests" / "suporte" / "host_simulado.py"
AMOSTRAS = AUXILIAR.parent / "amostras" / "sinteticas"
ID = "femjlfnijaboogbcdionddnjcjpfmieg"
ORIGEM = f"chrome-extension://{ID}/"


@pytest.fixture
def ambiente(tmp_path, ffmpeg):
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


def lancar(pasta, temporarios, origem=ORIGEM):
    return subprocess.Popen(
        [
            "/usr/bin/env",
            "-i",
            f"PYTHONPATH={AUXILIAR}",
            f"WHISPPER_MOTOR_PASTA={pasta}",
            f"TMPDIR={temporarios}",
            sys.executable,
            str(HOST),
            origem,
        ],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )


def enviar(proc, mensagem):
    corpo = json.dumps(mensagem).encode()
    proc.stdin.write(struct.pack("=I", len(corpo)) + corpo)
    proc.stdin.flush()


def ler_exato(proc, n, timeout):
    dados = b""
    limite = time.monotonic() + timeout
    while len(dados) < n:
        restante = limite - time.monotonic()
        if restante <= 0 or not select.select([proc.stdout], [], [], restante)[0]:
            raise AssertionError("o host não respondeu no prazo")
        pedaco = os.read(proc.stdout.fileno(), n - len(dados))
        if not pedaco:
            raise AssertionError("o host fechou a saída")
        dados += pedaco
    return dados


def ler(proc, timeout=10):
    (tamanho,) = struct.unpack("=I", ler_exato(proc, 4, timeout))
    assert tamanho < 1_000_000, "enquadramento corrompido por escrita estranha na saída padrão"
    return json.loads(ler_exato(proc, tamanho, timeout))


def esperar_pronto(proc):
    limite = time.monotonic() + 15
    while time.monotonic() < limite:
        enviar(proc, {"tipo": "verificar", "protocolo": 1})
        if ler(proc)["estado"] == "pronto":
            return
        time.sleep(0.1)
    raise AssertionError("o host não ficou pronto")


def test_protocolo_integro_apesar_de_escritas_na_saida_padrao(ambiente):
    pasta, temporarios = ambiente
    proc = lancar(pasta, temporarios)
    try:
        esperar_pronto(proc)
        audio = base64.b64encode((AMOSTRAS / "fala-pt.ogg").read_bytes()).decode()
        enviar(proc, {"tipo": "transcrever", "protocolo": 1, "idPedido": "p-1", "midia": "audio/ogg", "audioBase64": audio})

        resultado = ler(proc)

        assert (resultado["tipo"], resultado["idPedido"], resultado["texto"]) == ("resultado", "p-1", "texto simulado")
    finally:
        proc.stdin.close()
        codigo = proc.wait(timeout=10)

    assert codigo == 0
    diagnostico = (pasta / "diagnostico.log").read_text(encoding="utf-8")
    assert "ruído do processo principal" in diagnostico
    assert "ruído do trabalhador" in diagnostico
    assert "ruido cru do trabalhador" in diagnostico
    assert "texto simulado" not in diagnostico


def test_origem_diferente_encerra_sem_responder(ambiente):
    pasta, temporarios = ambiente
    proc = lancar(pasta, temporarios, origem="chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/")

    codigo = proc.wait(timeout=10)

    assert codigo != 0
    assert proc.stdout.read() == b""


def test_fim_da_entrada_encerra_e_apaga_temporarios(ambiente):
    pasta, temporarios = ambiente
    proc = lancar(pasta, temporarios)
    enviar(proc, {"tipo": "verificar", "protocolo": 1})
    ler(proc)

    proc.stdin.close()

    assert proc.wait(timeout=10) == 0
    assert list(temporarios.iterdir()) == []


def pid_encerrado():
    processo = subprocess.Popen(["/usr/bin/true"])
    processo.wait()
    return processo.pid


def test_varredura_apaga_so_as_pastas_de_hosts_que_nao_existem(tmp_path):
    from whispper_motor.__main__ import varrer_temporarios_orfaos

    orfa = tmp_path / f"whispper-motor-{pid_encerrado()}-abc123"
    orfa.mkdir()
    (orfa / "tmpxyz.m4a").write_bytes(b"audio de terceiro")
    viva = tmp_path / f"whispper-motor-{os.getpid()}-def456"
    viva.mkdir()
    antiga = tmp_path / "whispper-motor-r5gn0kfw"  # formato anterior, sem o PID do dono
    antiga.mkdir()
    alheia = tmp_path / f"outro-programa-{pid_encerrado()}-abc"
    alheia.mkdir()

    removidas = varrer_temporarios_orfaos(tmp_path)

    assert removidas == [orfa]
    assert sorted(p.name for p in tmp_path.iterdir()) == sorted(p.name for p in (viva, antiga, alheia))


def test_pasta_de_host_derrubado_e_varrida_pelo_host_seguinte(ambiente):
    pasta, temporarios = ambiente
    derrubado = lancar(pasta, temporarios)
    enviar(derrubado, {"tipo": "verificar", "protocolo": 1})
    ler(derrubado)
    [orfa] = list(temporarios.iterdir())
    derrubado.kill()
    derrubado.wait()
    assert orfa.exists()

    vivos = []
    try:
        for _ in range(2):
            vivos.append(lancar(pasta, temporarios))
            enviar(vivos[-1], {"tipo": "verificar", "protocolo": 1})
            ler(vivos[-1])

        # O segundo host varreu a pasta do derrubado; o terceiro preservou a do segundo, vivo.
        assert not orfa.exists()
        assert len(list(temporarios.iterdir())) == 2
    finally:
        for proc in vivos:
            proc.stdin.close()
            proc.wait(timeout=10)

    assert list(temporarios.iterdir()) == []
