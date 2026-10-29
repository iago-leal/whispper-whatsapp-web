"""Testes com o modelo Whisper real do cache local, nas duas plataformas. Rode com MOTOR_REAL=1.

O trabalhador é o da plataforma: o mlx-whisper no Mac, o faster-whisper no Windows.
"""

import subprocess
import sys
from pathlib import Path

import pytest

from whispper_motor import audio, configuracao, modelos
from whispper_motor.trabalhador import TrabalhadorEmProcesso, laco_padrao

pytestmark = pytest.mark.real


@pytest.fixture(scope="module")
def trabalhador():
    config = configuracao.carregar(Path("/inexistente/config.toml"))
    t = TrabalhadorEmProcesso(modelos.resolver(config.modelo, config.pasta_de_modelos), alvo=laco_padrao())
    t.iniciar()
    carregamento = t.aguardar_carregamento(timeout=180)
    assert carregamento.ok, carregamento.motivo
    yield t
    t.encerrar()


@pytest.fixture
def decodificar(amostras, ffmpeg, tmp_path):
    def _decodificar(nome):
        return audio.decodificar((amostras / nome).read_bytes(), "audio/ogg", ffmpeg, tmp_path).amostras

    return _decodificar


def test_fala_em_portugues(trabalhador, decodificar):
    resultado = trabalhador.transcrever(decodificar("fala-pt.ogg"), prazo_s=60)

    assert resultado.idioma == "pt"
    assert "reunião" in resultado.texto.lower()


def test_fala_em_ingles(trabalhador, decodificar):
    resultado = trabalhador.transcrever(decodificar("fala-en.ogg"), prazo_s=60)

    assert resultado.idioma == "en"
    assert "language" in resultado.texto.lower()


@pytest.mark.parametrize("arquivo", ["silencio.ogg", "ruido.ogg"])
def test_audio_sem_fala_devolve_texto_vazio(trabalhador, decodificar, arquivo):
    resultado = trabalhador.transcrever(decodificar(arquivo), prazo_s=60)

    assert resultado.texto == ""


def test_cinco_transcricoes_com_um_so_carregamento(trabalhador, decodificar):
    amostras = decodificar("fala-pt.ogg")

    for _ in range(5):
        assert not trabalhador.transcrever(amostras, prazo_s=60).recarregou


def conexoes_de_rede(pid):
    if sys.platform == "win32":
        tabela = subprocess.run(["netstat", "-ano"], capture_output=True, text=True, check=True).stdout
        return [linha for linha in tabela.splitlines() if linha.split()[-1:] == [str(pid)]]
    lsof = subprocess.run(["lsof", "-nP", "-i", "-a", "-p", str(pid)], capture_output=True, text=True)
    return lsof.stdout.strip().splitlines()


def test_trabalhador_nao_abre_conexao_de_rede(trabalhador, decodificar):
    trabalhador.transcrever(decodificar("fala-pt.ogg"), prazo_s=60)

    assert conexoes_de_rede(trabalhador.pid) == []
