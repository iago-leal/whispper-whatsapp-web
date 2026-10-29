"""O laço do faster-whisper com modelo falso injetado, nas duas plataformas (D-03, D-04, D-06, RF-02).

O laço roda numa linha do próprio teste, ligado a um `Pipe`, como no processo do
trabalhador; o modelo falso imita o `WhisperModel` só no que o laço usa.
"""

import multiprocessing
import os
import sys
import threading
from dataclasses import dataclass

import numpy as np
import pytest

from whispper_motor import audio, plataforma, trabalhador

ESPERA_S = 10
UM_SEGUNDO = audio.TAXA
# Um segundo de tom na faixa da voz e outro de silêncio digital.
FALA_E_SILENCIO = np.concatenate(
    [0.3 * np.sin(2 * np.pi * 440 * np.arange(UM_SEGUNDO) / audio.TAXA), np.zeros(UM_SEGUNDO)]
).astype(np.float32)


@dataclass
class Segmento:
    start: float
    end: float
    text: str
    no_speech_prob: float = 0.0


@dataclass
class Info:
    language: str


class Modelo:
    """Imita o `WhisperModel`: anota cada chamada e falha quando mandado."""

    def __init__(self, dispositivo, segmentos, idioma):
        self.dispositivo = dispositivo
        self.segmentos = segmentos
        self.idioma = idioma
        self.chamadas = []
        self.falhar_a_partir_de = None

    def transcribe(self, amostras, **parametros):
        self.chamadas.append(parametros)
        if self.falhar_a_partir_de is not None and len(self.chamadas) >= self.falhar_a_partir_de:
            raise RuntimeError("CUDA error: an illegal memory access C:\\Users\\paciente\\consulta.ogg")

        # Gerador, como o do faster-whisper: o trabalho só acontece quando o laço o consome.
        def gerar():
            yield from self.segmentos

        return gerar(), Info(self.idioma)


class Fabrica:
    def __init__(self, segmentos=(), idioma="pt", falha_ao_criar=None):
        self.segmentos = list(segmentos)
        self.idioma = idioma
        self.falha_ao_criar = falha_ao_criar
        self.pedidos = []
        self.modelo = None

    def __call__(self, caminho, device, compute_type, **opcoes):
        self.pedidos.append((caminho, device, compute_type, opcoes))
        if self.falha_ao_criar is not None:
            raise self.falha_ao_criar
        self.modelo = Modelo(device, self.segmentos, self.idioma)
        return self.modelo


class Laco:
    """O `laco_ct2` numa linha, com a outra ponta do pipe na mão do teste."""

    def __init__(self, fabrica, placas=0, nucleos=6):
        self.conexao, remota = multiprocessing.Pipe()
        self.linha = threading.Thread(
            target=trabalhador.laco_ct2,
            args=(remota, "C:\\modelo"),
            kwargs={
                "criar": fabrica,
                "contar_placas": lambda: placas,
                "bibliotecas_presentes": lambda: True,
                "nucleos": lambda: nucleos,
            },
            daemon=True,
        )
        self.linha.start()

    def receber(self):
        assert self.conexao.poll(ESPERA_S), "o laço não respondeu"
        return self.conexao.recv()

    def transcrever(self, amostras=FALA_E_SILENCIO):
        self.conexao.send(("transcrever", amostras))
        return self.receber()

    def parar(self):
        if self.linha.is_alive():
            self.conexao.send(("parar",))
            self.linha.join(ESPERA_S)
        self.conexao.close()


@pytest.fixture
def lacos():
    abertos = []

    def abrir(fabrica, **opcoes):
        laco = Laco(fabrica, **opcoes)
        abertos.append(laco)
        return laco

    yield abrir
    for laco in abertos:
        laco.parar()


def test_carrega_no_processador_em_int8_com_uma_linha_por_nucleo(lacos):
    fabrica = Fabrica()

    mensagem = lacos(fabrica, placas=0, nucleos=6).receber()

    assert mensagem[0] == "carregado"
    assert mensagem[2] == ("modelo carregado no processador: sem placa NVIDIA", "aviso")
    assert fabrica.pedidos == [("C:\\modelo", "cpu", "int8", {"cpu_threads": 6})]


def test_carrega_na_placa_em_int8(lacos):
    fabrica = Fabrica()

    mensagem = lacos(fabrica, placas=1).receber()

    assert mensagem[0] == "carregado"
    assert mensagem[2] == ("modelo carregado na placa de vídeo", "info")
    assert fabrica.pedidos == [("C:\\modelo", "cuda", "int8", {})]


def test_transcreve_com_os_parametros_da_paridade_e_devolve_o_idioma(lacos):
    fabrica = Fabrica([Segmento(0.0, 1.0, " Olá, doutor.")], idioma="pt")
    laco = lacos(fabrica)
    laco.receber()

    resposta = laco.transcrever()

    assert resposta == ("ok", "Olá, doutor.", "pt", False)
    # O aquecimento e o pedido usam os mesmos parâmetros: busca gulosa, sem contexto do
    # trecho anterior, sem o filtro de voz do faster-whisper e com detecção de idioma.
    assert len(fabrica.modelo.chamadas) == 2
    for parametros in fabrica.modelo.chamadas:
        assert parametros["beam_size"] == 1
        assert parametros["condition_on_previous_text"] is False
        assert parametros["vad_filter"] is False
        assert parametros.get("language") is None


def test_segmento_sobre_silencio_e_descartado(lacos):
    fabrica = Fabrica([Segmento(0.0, 1.0, " Bom dia."), Segmento(1.0, 2.0, " Thank you.")])
    laco = lacos(fabrica)
    laco.receber()

    assert laco.transcrever()[1] == "Bom dia."


def test_audio_so_de_silencio_volta_sem_texto_e_sem_idioma(lacos):
    fabrica = Fabrica([Segmento(0.0, 1.0, " Thank you.")], idioma="en")
    laco = lacos(fabrica)
    laco.receber()

    assert laco.transcrever(np.zeros(UM_SEGUNDO, dtype=np.float32)) == ("ok", "", "", False)


def test_segmento_com_alta_probabilidade_de_nao_fala_e_descartado(lacos):
    fabrica = Fabrica([Segmento(0.0, 1.0, " Legendas pela comunidade.", no_speech_prob=0.9)])
    laco = lacos(fabrica)
    laco.receber()

    assert laco.transcrever()[1] == ""


def test_erro_da_placa_durante_um_pedido_encerra_o_laco_sem_responder(lacos):
    fabrica = Fabrica([Segmento(0.0, 1.0, " Olá.")])
    laco = lacos(fabrica, placas=1)
    laco.receber()
    fabrica.modelo.falhar_a_partir_de = 2

    laco.conexao.send(("transcrever", FALA_E_SILENCIO))
    laco.linha.join(ESPERA_S)

    # Sem resposta, só o fim do pipe, como quando o processo do trabalhador termina: o
    # principal vê o trabalhador cair, responde FALHA_NA_TRANSCRICAO e o recria, e o novo
    # escolhe outra vez entre a placa e o processador (D-06). O fim chega como EOFError na
    # leitura no macOS e como BrokenPipeError já na consulta no Windows.
    assert not laco.linha.is_alive()
    with pytest.raises((EOFError, BrokenPipeError)):
        assert laco.conexao.poll(ESPERA_S)
        laco.conexao.recv()


def test_erro_no_processador_falha_o_pedido_e_mantem_o_laco(lacos):
    fabrica = Fabrica([Segmento(0.0, 1.0, " Olá.")])
    laco = lacos(fabrica, placas=0)
    laco.receber()
    fabrica.modelo.falhar_a_partir_de = 2

    assert laco.transcrever() == ("falha", "falha do Whisper")
    fabrica.modelo.falhar_a_partir_de = None
    assert laco.transcrever()[0] == "ok"
    assert laco.linha.is_alive()


def test_falha_ao_carregar_tambem_no_processador_vira_motivo_do_protocolo(lacos):
    fabrica = Fabrica(falha_ao_criar=MemoryError())

    assert lacos(fabrica).receber() == ("falha_no_carregamento", "memória insuficiente para o modelo")


def test_sem_faster_whisper_o_carregamento_falha_com_o_motivo(monkeypatch):
    monkeypatch.setitem(sys.modules, "faster_whisper", None)
    monkeypatch.setattr(trabalhador, "registrar_bibliotecas_da_nvidia", lambda: [])
    conexao, remota = multiprocessing.Pipe()
    try:
        trabalhador.laco_ct2(remota, "C:\\modelo")

        assert conexao.poll(0)
        assert conexao.recv() == ("falha_no_carregamento", "faster-whisper ausente")
    finally:
        conexao.close()
        remota.close()


def test_nucleos_fisicos_entre_um_e_os_logicos():
    assert 1 <= plataforma.nucleos_fisicos() <= (os.cpu_count() or 1)
