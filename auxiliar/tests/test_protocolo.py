import io
import json
import struct

import pytest

from whispper_motor import protocolo
from whispper_motor.protocolo import (
    EnquadramentoInvalido,
    MensagemGrandeDemais,
    PedidoTranscrever,
    PedidoVerificar,
    Recusa,
)


def test_limites_iguais_ao_contrato(protocolo_1):
    assert protocolo.LIMITE_ENTRADA == protocolo_1["limites"]["entradaMaxBytes"]
    assert protocolo.LIMITE_SAIDA == protocolo_1["limites"]["saidaMaxBytes"]
    assert protocolo_1["protocolo"] == 1


def test_escreve_e_le_o_enquadramento():
    fluxo = io.BytesIO()
    mensagem = {"tipo": "estado", "motivo": "ação"}

    protocolo.escrever_mensagem(fluxo, mensagem)

    corpo = json.dumps(mensagem, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    assert fluxo.getvalue()[:4] == struct.pack("=I", len(corpo))
    fluxo.seek(0)
    assert json.loads(protocolo.ler_mensagem(fluxo)) == mensagem


def test_fim_limpo_da_entrada():
    assert protocolo.ler_mensagem(io.BytesIO(b"")) is None


@pytest.mark.parametrize(
    "bruto",
    [
        b"\x05\x00",
        struct.pack("=I", 10) + b"{}",
        struct.pack("=I", 64 * 1024 * 1024 + 1),
    ],
    ids=["cabecalho-truncado", "corpo-truncado", "acima-do-limite"],
)
def test_enquadramento_invalido(bruto):
    with pytest.raises(EnquadramentoInvalido):
        protocolo.ler_mensagem(io.BytesIO(bruto))


def test_recusa_saida_acima_de_1mb():
    with pytest.raises(MensagemGrandeDemais):
        protocolo.escrever_mensagem(io.BytesIO(), {"texto": "a" * protocolo.LIMITE_SAIDA})


def test_pedidos_validos(protocolo_1):
    verificar, transcrever, vazio = (c["mensagem"] for c in protocolo_1["pedidosValidos"])

    assert protocolo.interpretar(json.dumps(verificar).encode()) == PedidoVerificar(protocolo=1)
    assert protocolo.interpretar(json.dumps(transcrever).encode()) == PedidoTranscrever(
        id_pedido="p-17", midia="audio/ogg; codecs=opus", audio=b"OggS"
    )
    assert protocolo.interpretar(json.dumps(vazio).encode()) == PedidoTranscrever(
        id_pedido="p-18", midia="audio/mpeg", audio=b""
    )


def test_pedidos_recusados(protocolo_1):
    for caso in protocolo_1["pedidosRecusados"]:
        bruto = caso["bruto"].encode() if "bruto" in caso else json.dumps(caso["mensagem"]).encode()

        resultado = protocolo.interpretar(bruto)

        assert isinstance(resultado, Recusa), caso["nome"]
        assert resultado.resposta == caso["esperado"], caso["nome"]


def test_verificar_com_outra_versao_e_aceito():
    assert protocolo.interpretar(b'{"tipo":"verificar","protocolo":2}') == PedidoVerificar(protocolo=2)


def test_respostas_montadas_iguais_ao_contrato(protocolo_1):
    exemplos = {c["nome"]: c["mensagem"] for c in protocolo_1["respostasValidas"]}

    assert protocolo.resposta_estado("1.0.0", "mlx-community/whisper-large-v3-turbo", "pronto") == exemplos["estado pronto"]
    assert (
        protocolo.resposta_estado("1.0.0", "mlx-community/whisper-large-v3-turbo", "erro", "modelo não encontrado")
        == exemplos["estado em erro"]
    )
    assert protocolo.resposta_resultado("p-17", "Oi, tudo bem?", "pt", 42.0, 3100) == exemplos["resultado"]
    assert protocolo.resposta_erro("p-17", "FALHA_NA_TRANSCRICAO", "áudio ilegível") == exemplos["falha na transcrição"]
    assert (
        protocolo.resposta_erro("p-20", "VERSAO_INCOMPATIVEL", "versão de protocolo incompatível", protocoloApp=1, protocoloPedido=2)
        == exemplos["versão incompatível"]
    )


@pytest.mark.parametrize(
    "bruto",
    [
        b'{"tipo":"\\ud800","protocolo":1}',
        b'{"tipo":["\\udc80"]}',
        b'{"tipo":{"\\ud800":1}}',
        b'{"tipo":"verificar\\ud800"}',
    ],
)
def test_eco_do_tipo_com_surrogate_isolado_sai_em_utf8_valido(bruto):
    recusa = protocolo.interpretar(bruto)

    detalhe = json.loads(protocolo.serializar(recusa.resposta))["detalhe"]

    assert detalhe.startswith("tipo desconhecido: ")
    detalhe.encode("utf-8")


def test_serializar_nao_perde_a_mensagem_com_surrogate_isolado():
    corpo = protocolo.serializar({"texto": "a\ud800b"})

    assert json.loads(corpo) == {"texto": "a\ud800b"}
