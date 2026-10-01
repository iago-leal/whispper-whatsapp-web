from pathlib import Path

import pytest

from whispper_motor import VERSAO_APP
from whispper_motor.configuracao import Configuracao
from whispper_motor.modelos import ModeloNaoEncontrado

from .suporte.falsos import (
    Coletor,
    FabricaFalsa,
    criar_servidor,
    eventos_do_registro,
    transcrever,
    verificar,
)


@pytest.fixture
def fabrica():
    return FabricaFalsa()


@pytest.fixture
def coletor():
    return Coletor()


@pytest.fixture
def servidor(tmp_path, ffmpeg, fabrica, coletor):
    servidores = []

    def _criar(**opcoes):
        s = criar_servidor(tmp_path, ffmpeg, fabrica, coletor, **opcoes)
        servidores.append(s)
        return s

    yield _criar
    for s in servidores:
        s.encerrar()


def test_carregando_e_depois_pronto(servidor, fabrica, coletor):
    fabrica.liberar_carregamento.clear()
    s = servidor()

    s.receber(verificar())
    primeiro = coletor.estado(1)
    fabrica.liberar_carregamento.set()
    s.aguardar_estado_estavel(timeout=5)
    s.receber(verificar())
    segundo = coletor.estado(2)

    assert primeiro == {
        "tipo": "estado",
        "protocolo": 1,
        "versaoApp": VERSAO_APP,
        "modelo": "mlx-community/whisper-large-v3-turbo",
        "estado": "carregando",
        "motivo": None,
    }
    assert segundo["estado"] == "pronto"


def test_verificacao_respondida_durante_transcricao(servidor, fabrica, coletor):
    s = servidor()
    fabrica.liberar_transcricao.clear()

    s.receber(transcrever("p-1"))
    s.receber(verificar())
    estado = coletor.estado()
    fabrica.liberar_transcricao.set()
    resultado = coletor.resposta("p-1")

    assert coletor.mensagens.index(estado) < coletor.mensagens.index(resultado)


def test_tres_pedidos_respondidos_em_ordem(servidor, coletor):
    s = servidor()

    for i in (1, 2, 3):
        s.receber(transcrever(f"p-{i}"))
    for i in (1, 2, 3):
        coletor.resposta(f"p-{i}")

    ids = [m["idPedido"] for m in coletor.mensagens if m["tipo"] == "resultado"]
    assert ids == ["p-1", "p-2", "p-3"]


def test_resultado_completo(servidor, coletor, tmp_path):
    s = servidor()

    s.receber(transcrever("p-1"))
    resultado = coletor.resposta("p-1")

    assert resultado["tipo"] == "resultado"
    assert resultado["texto"] == "texto simulado"
    assert resultado["idioma"] == "pt"
    assert resultado["duracaoAudioSeg"] == pytest.approx(12.9, abs=0.1)
    assert isinstance(resultado["processamentoMs"], int)
    assert eventos_do_registro(tmp_path) == ["carregamento", "pedido"]


def test_pedido_durante_carregamento_aguarda(servidor, fabrica, coletor):
    fabrica.liberar_carregamento.clear()
    s = servidor()

    s.receber(transcrever("p-1"))
    assert coletor.nenhuma(lambda m: m.get("idPedido") == "p-1", durante=0.3)
    fabrica.liberar_carregamento.set()

    assert coletor.resposta("p-1")["tipo"] == "resultado"


def test_versao_incompativel_em_transcrever(servidor, coletor):
    s = servidor()

    s.receber(transcrever("p-9", protocolo=2))

    assert coletor.resposta("p-9") == {
        "tipo": "erro",
        "idPedido": "p-9",
        "codigo": "VERSAO_INCOMPATIVEL",
        "motivo": "versão de protocolo incompatível",
        "protocoloApp": 1,
        "protocoloPedido": 2,
    }


def test_verificar_com_outra_versao_recebe_o_estado_do_host(servidor, coletor):
    s = servidor()

    s.receber(verificar(protocolo=2))

    assert coletor.estado()["protocolo"] == 1


def test_modelo_ausente_deixa_o_motor_indisponivel(servidor, coletor):
    def sem_modelo(config):
        raise ModeloNaoEncontrado()

    s = servidor(resolver_modelo=sem_modelo)
    s.aguardar_estado_estavel(timeout=5)

    s.receber(verificar())
    s.receber(transcrever("p-1"))

    assert coletor.estado() | {"versaoApp": None} == {
        "tipo": "estado",
        "protocolo": 1,
        "versaoApp": None,
        "modelo": "mlx-community/whisper-large-v3-turbo",
        "estado": "erro",
        "motivo": "modelo não encontrado",
    }
    assert coletor.resposta("p-1") == {
        "tipo": "erro",
        "idPedido": "p-1",
        "codigo": "MOTOR_INDISPONIVEL",
        "motivo": "modelo não encontrado",
    }


def test_falha_de_carregamento_do_trabalhador(servidor, fabrica, coletor):
    fabrica.carregamento_ok = False
    fabrica.motivo_carregamento = "memória insuficiente para o modelo"
    s = servidor()
    s.aguardar_estado_estavel(timeout=5)

    s.receber(verificar())

    assert coletor.estado()["motivo"] == "memória insuficiente para o modelo"


def test_ffmpeg_ausente_deixa_o_motor_indisponivel(servidor, coletor, tmp_path):
    s = servidor(config=Configuracao(ffmpeg=tmp_path / "sem-ffmpeg", pasta_de_modelos=tmp_path))

    s.receber(verificar())

    assert coletor.estado()["motivo"] == "ffmpeg ausente"


def test_erro_inicial_de_configuracao(servidor, coletor):
    s = servidor(erro_inicial="configuração inválida: ocioso_min")

    s.receber(verificar())

    estado = coletor.estado()
    assert (estado["estado"], estado["motivo"]) == ("erro", "configuração inválida: ocioso_min")
