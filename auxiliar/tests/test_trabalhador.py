"""O trabalhador como processo: falha isolada, corrida no encerramento, morte do principal e modelo só em inglês."""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import pytest

from whispper_motor import trabalhador
from whispper_motor.trabalhador import TrabalhadorCaiu, TrabalhadorMlx

from .suporte.trabalhador_simulado import laco_com_falha

PRINCIPAL = Path(__file__).resolve().parent / "suporte" / "principal_simulado.py"
AMOSTRAS_CURTAS = np.zeros(16, dtype=np.float32)


def vivo(pid):
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    return True


def esperar(condicao, timeout):
    limite = time.monotonic() + timeout
    while time.monotonic() < limite:
        if condicao():
            return True
        time.sleep(0.05)
    return condicao()


def test_receber_com_a_conexao_retirada_por_encerrar_em_outra_linha():
    t = TrabalhadorMlx(Path("/inexistente"))

    class ConexaoRetirada:
        def poll(self, timeout):
            t._conexao = None  # o que encerrar() faz, em outra linha, entre o poll e o recv
            return True

        def recv(self):
            raise OSError("handle is closed")

    t._conexao = ConexaoRetirada()

    with pytest.raises(TrabalhadorCaiu):
        t._receber(1)


def test_falha_do_whisper_num_audio_mantem_o_trabalhador():
    t = TrabalhadorMlx(Path("/inexistente"), alvo=laco_com_falha)
    t.iniciar()
    try:
        assert t.aguardar_carregamento(timeout=10).ok
        pid = t.pid

        with pytest.raises(trabalhador.FalhaDoWhisper):
            t.transcrever(AMOSTRAS_CURTAS, prazo_s=10)
        seguinte = t.transcrever(AMOSTRAS_CURTAS, prazo_s=10)

        assert seguinte.texto == "texto simulado"
        assert t.pid == pid
    finally:
        t.encerrar()


def test_trabalhador_ocupado_morre_com_o_principal(tmp_path):
    marcador = tmp_path / "transcricao-recebida"
    principal = subprocess.Popen([sys.executable, str(PRINCIPAL), str(marcador)], stdout=subprocess.PIPE)
    pid = None
    try:
        pid = int(principal.stdout.readline())
        assert esperar(marcador.exists, 10), "o trabalhador não recebeu a transcrição"

        principal.send_signal(signal.SIGKILL)
        principal.wait()

        assert esperar(lambda: not vivo(pid), 5), "o trabalhador ocupado sobreviveu ao principal"
    finally:
        if principal.poll() is None:
            principal.kill()
            principal.wait()
        principal.stdout.close()
        if pid is not None and vivo(pid):
            os.kill(pid, signal.SIGKILL)


def test_modelo_so_em_ingles_dispensa_a_deteccao_de_idioma():
    class ModeloSoEmIngles:
        is_multilingual = False

        def detect_language(self, *argumentos):
            raise ValueError("This model doesn't have language tokens so it can't perform lang id")

    assert trabalhador.detectar_idioma(ModeloSoEmIngles(), None, AMOSTRAS_CURTAS) == "en"


def test_modelo_so_em_ingles_carrega_e_transcreve(tmp_path):
    pytest.importorskip("mlx_whisper")
    from .suporte.modelo_sintetico import N_VOCAB_SO_EM_INGLES, criar_modelo_minimo

    modelo = criar_modelo_minimo(tmp_path / "whisper-minimo.en", N_VOCAB_SO_EM_INGLES)
    t = TrabalhadorMlx(modelo)
    t.iniciar()
    try:
        carregamento = t.aguardar_carregamento(timeout=120)
        assert carregamento.ok, carregamento.motivo

        t.transcrever(np.zeros(16_000, dtype=np.float32), prazo_s=120)
    finally:
        t.encerrar()
