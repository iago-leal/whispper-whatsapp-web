"""O host encerrado à força não deixa processo nem áudio para trás (RF-07, RF-08, D-09, D-10)."""

import base64
import csv
import io
import subprocess
import sys
import time

import pytest

from whispper_motor import plataforma
from whispper_motor.__main__ import PREFIXO_TEMPORARIO, varrer_temporarios_orfaos

from .suporte import executavel_falso
from .suporte.host_em_processo import (  # noqa: F401 - fechar_leitores é fixture
    AMOSTRAS,
    enviar,
    esperar_pronto,
    fechar_leitores,
    lancar,
    preparar_ambiente,
)

ESPERA_S = 5


def esperar(condicao, timeout=ESPERA_S):
    limite = time.monotonic() + timeout
    while time.monotonic() < limite:
        if condicao():
            return True
        time.sleep(0.05)
    return condicao()


def descendentes(pid):
    """Os PIDs que descendem de `pid`, pela tabela de processos do Windows."""
    tabela = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Csv -NoTypeInformation",
        ],
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    filhos = {}
    for linha in csv.DictReader(io.StringIO(tabela)):
        filhos.setdefault(int(linha["ParentProcessId"]), []).append(int(linha["ProcessId"]))
    encontrados, pendentes = [], [pid]
    while pendentes:
        for filho in filhos.get(pendentes.pop(), []):
            if filho not in encontrados and filho != pid:
                encontrados.append(filho)
                pendentes.append(filho)
    return encontrados


@pytest.mark.skipif(sys.platform != "win32", reason="exige o Windows: o job leva os filhos do host derrubado")
def test_host_derrubado_durante_um_mp4_nao_deixa_ffmpeg_trabalhador_nem_audio(tmp_path):
    marcador = tmp_path / "pid-do-ffmpeg"
    corpo = f"import os, time\nopen({str(marcador)!r}, 'w').write(str(os.getpid()))\ntime.sleep(60)"
    ffmpeg = executavel_falso.criar(tmp_path / "ffmpeg-lento", corpo)
    pasta, temporarios = preparar_ambiente(tmp_path, ffmpeg)
    proc = lancar(pasta, temporarios)
    filhos = []
    try:
        esperar_pronto(proc)
        [pasta_do_host] = list(temporarios.iterdir())
        # O PID do host real, e não o do lançador do ambiente virtual, vai no nome da pasta.
        host = int(pasta_do_host.name.removeprefix(PREFIXO_TEMPORARIO).split("-")[0])
        audio = base64.b64encode((AMOSTRAS / "fala-pt.m4a").read_bytes()).decode()
        enviar(proc, {"tipo": "transcrever", "protocolo": 1, "idPedido": "p-1", "midia": "audio/mp4", "audioBase64": audio})
        assert esperar(marcador.exists, 10), "o FFmpeg falso não começou"
        assert list(pasta_do_host.iterdir()), "o MP4 não estava na pasta temporária do host"
        filhos = descendentes(host)
        # O trabalhador e o FFmpeg, este pelo cmd.exe que o lança.
        assert int(marcador.read_text()) in filhos
        assert len(filhos) >= 3

        subprocess.run(["taskkill", "/F", "/PID", str(host)], capture_output=True, check=True)

        vivos = lambda: [pid for pid in filhos if plataforma.processo_existe(pid)]  # noqa: E731
        assert esperar(lambda: not vivos()), f"sobreviveram ao host: {vivos()}"
        # O sistema apaga o MP4 quando o último processo que o mantinha aberto sai.
        assert esperar(lambda: list(pasta_do_host.iterdir()) == [])
    finally:
        for pid in filhos:
            if plataforma.processo_existe(pid):
                subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True)
        if proc.poll() is None:
            proc.kill()
        proc.wait(10)


def test_varredura_preserva_a_pasta_e_o_processo_de_um_pid_vivo(tmp_path):
    vivo = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
    morto = subprocess.Popen([sys.executable, "-c", "pass"])
    morto.wait()
    try:
        do_vivo = tmp_path / f"{PREFIXO_TEMPORARIO}{vivo.pid}-abc123"
        do_morto = tmp_path / f"{PREFIXO_TEMPORARIO}{morto.pid}-def456"
        for pasta in (do_vivo, do_morto):
            pasta.mkdir()
            (pasta / "audio.m4a").write_bytes(b"audio de terceiro")

        removidas = varrer_temporarios_orfaos(tmp_path)

        assert removidas == [do_morto]
        assert do_vivo.exists()
        # A consulta não pode encerrar o processo consultado, como `os.kill(pid, 0)` faria no Windows.
        time.sleep(0.3)
        assert vivo.poll() is None
    finally:
        vivo.kill()
        vivo.wait()
