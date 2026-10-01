"""Protocolo 1 do Native Messaging entre a extensão e o host.

Cada mensagem é um objeto JSON em UTF-8 precedido do tamanho num inteiro de 32
bits na ordem nativa. Os exemplos canônicos ficam em `contratos/protocolo-1.json`
(DT-17), lidos também pela suíte da extensão.
"""

from __future__ import annotations

import base64
import json
import re
import struct
from dataclasses import dataclass
from typing import BinaryIO

from . import PROTOCOLO

LIMITE_ENTRADA = 64 * 1024 * 1024
LIMITE_SAIDA = 1_000_000

FALHA_NA_TRANSCRICAO = "FALHA_NA_TRANSCRICAO"
VERSAO_INCOMPATIVEL = "VERSAO_INCOMPATIVEL"
MOTOR_INDISPONIVEL = "MOTOR_INDISPONIVEL"
MENSAGEM_INVALIDA = "MENSAGEM_INVALIDA"

_CABECALHO = struct.Struct("=I")
_ID_PEDIDO = re.compile(r"[A-Za-z0-9_-]{1,64}")
_TIPO_ECOADO_MAX = 40


class EnquadramentoInvalido(Exception):
    """O fluxo de entrada perdeu o sincronismo; o host não tem como seguir lendo."""


class MensagemGrandeDemais(Exception):
    def __init__(self, tamanho: int):
        super().__init__(f"mensagem de {tamanho} bytes acima do limite de saída")
        self.tamanho = tamanho


@dataclass(frozen=True)
class PedidoVerificar:
    protocolo: int


@dataclass(frozen=True)
class PedidoTranscrever:
    id_pedido: str
    midia: str
    audio: bytes


@dataclass(frozen=True)
class Recusa:
    resposta: dict


Pedido = PedidoVerificar | PedidoTranscrever


def ler_mensagem(fluxo: BinaryIO) -> bytes | None:
    """Lê o corpo da próxima mensagem, ou `None` no fim limpo da entrada."""
    cabecalho = _ler_exato(fluxo, _CABECALHO.size)
    if not cabecalho:
        return None
    if len(cabecalho) < _CABECALHO.size:
        raise EnquadramentoInvalido("cabeçalho truncado")
    (tamanho,) = _CABECALHO.unpack(cabecalho)
    if tamanho > LIMITE_ENTRADA:
        raise EnquadramentoInvalido("tamanho acima do limite de entrada")
    corpo = _ler_exato(fluxo, tamanho)
    if len(corpo) < tamanho:
        raise EnquadramentoInvalido("corpo truncado")
    return corpo


def serializar(mensagem: dict) -> bytes:
    try:
        corpo = json.dumps(mensagem, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    except UnicodeEncodeError:
        # Surrogate isolado, que o UTF-8 não representa: o escape do JSON ainda é válido,
        # e a mensagem não se perde.
        corpo = json.dumps(mensagem, separators=(",", ":")).encode("ascii")
    if len(corpo) > LIMITE_SAIDA:
        raise MensagemGrandeDemais(len(corpo))
    return corpo


def escrever_mensagem(fluxo: BinaryIO, mensagem: dict) -> None:
    corpo = serializar(mensagem)
    fluxo.write(_CABECALHO.pack(len(corpo)) + corpo)
    fluxo.flush()


def interpretar(bruto: bytes) -> Pedido | Recusa:
    try:
        mensagem = json.loads(bruto.decode("utf-8"))
    except (ValueError, RecursionError):
        # ValueError cobre também UTF-8 inválido e inteiros acima do limite de dígitos.
        return _invalida("JSON inválido")
    if not isinstance(mensagem, dict):
        return _invalida("mensagem não é objeto")

    if "tipo" not in mensagem:
        return _invalida("campo tipo ausente")
    tipo = mensagem["tipo"]
    if tipo not in ("verificar", "transcrever"):
        return _invalida(f"tipo desconhecido: {_resumo(tipo)}")

    protocolo = mensagem.get("protocolo")
    if isinstance(protocolo, bool) or not isinstance(protocolo, int) or protocolo < 1:
        return _invalida("campo protocolo ausente ou inválido")

    if tipo == "verificar":
        # Qualquer versão recebe o estado: é por ele que a extensão percebe a incompatibilidade.
        return PedidoVerificar(protocolo=protocolo)

    id_pedido = mensagem.get("idPedido")
    if not isinstance(id_pedido, str) or not _ID_PEDIDO.fullmatch(id_pedido):
        id_pedido = None
    if protocolo != PROTOCOLO:
        return Recusa(
            resposta_erro(
                id_pedido,
                VERSAO_INCOMPATIVEL,
                "versão de protocolo incompatível",
                protocoloApp=PROTOCOLO,
                protocoloPedido=protocolo,
            )
        )
    if id_pedido is None:
        return _invalida("campo idPedido ausente ou inválido")

    midia = mensagem.get("midia")
    if not isinstance(midia, str) or not midia.strip():
        return _invalida("campo midia ausente ou inválido", id_pedido)

    audio_base64 = mensagem.get("audioBase64")
    if not isinstance(audio_base64, str):
        return _invalida("campo audioBase64 ausente ou inválido", id_pedido)
    try:
        audio = base64.b64decode(audio_base64, validate=True)
    except ValueError:
        return _invalida("campo audioBase64 não é base64 válido", id_pedido)

    return PedidoTranscrever(id_pedido=id_pedido, midia=midia, audio=audio)


def resposta_estado(versao_app: str, modelo: str, estado: str, motivo: str | None = None) -> dict:
    return {
        "tipo": "estado",
        "protocolo": PROTOCOLO,
        "versaoApp": versao_app,
        "modelo": modelo,
        "estado": estado,
        "motivo": motivo,
    }


def resposta_resultado(
    id_pedido: str, texto: str, idioma: str, duracao_audio_seg: float, processamento_ms: float
) -> dict:
    return {
        "tipo": "resultado",
        "idPedido": id_pedido,
        "texto": texto,
        "idioma": idioma,
        "duracaoAudioSeg": round(float(duracao_audio_seg), 3),
        "processamentoMs": round(processamento_ms),
    }


def resposta_erro(id_pedido: str | None, codigo: str, motivo: str, **extras) -> dict:
    return {"tipo": "erro", "idPedido": id_pedido, "codigo": codigo, "motivo": motivo, **extras}


def resposta_invalida(detalhe: str, id_pedido: str | None = None) -> dict:
    return resposta_erro(id_pedido, MENSAGEM_INVALIDA, "mensagem inválida", detalhe=detalhe)


def _invalida(detalhe: str, id_pedido: str | None = None) -> Recusa:
    return Recusa(resposta_invalida(detalhe, id_pedido))


def _resumo(valor) -> str:
    # O tipo desconhecido volta no `detalhe`; cortado, para que uma entrada de
    # até 64 MiB não produza uma recusa acima do limite de saída. Um surrogate
    # isolado, que o JSON admite e o UTF-8 não, volta escrito como `\udXXX`.
    texto = valor if isinstance(valor, str) else json.dumps(valor, ensure_ascii=False)
    texto = texto.encode("utf-8", "backslashreplace").decode("utf-8")
    return texto if len(texto) <= _TIPO_ECOADO_MAX else texto[:_TIPO_ECOADO_MAX] + "…"


def _ler_exato(fluxo: BinaryIO, tamanho: int) -> bytes:
    partes = []
    faltam = tamanho
    while faltam:
        pedaco = fluxo.read(faltam)
        if not pedaco:
            break
        partes.append(pedaco)
        faltam -= len(pedaco)
    return b"".join(partes)
