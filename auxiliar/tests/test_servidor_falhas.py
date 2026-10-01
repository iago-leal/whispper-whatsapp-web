import json
import math
import time

import pytest

from whispper_motor import protocolo
from whispper_motor import servidor as modulo_servidor
from whispper_motor.configuracao import Configuracao
from whispper_motor.registro import RegistroDeDesempenho
from whispper_motor.trabalhador import TrabalhadorMlx

from .suporte.falsos import (
    Coletor,
    FabricaFalsa,
    criar_servidor,
    eventos_do_registro,
    transcrever,
    verificar,
)
from .suporte.trabalhador_simulado import laco_com_falha


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


def test_prazo_excedido_recria_o_trabalhador(servidor, fabrica, coletor, tmp_path):
    s = servidor(prazo=lambda duracao_seg: 0.3)
    fabrica.liberar_transcricao.clear()

    inicio = time.monotonic()
    s.receber(transcrever("p-1"))
    erro = coletor.resposta("p-1")
    decorrido = time.monotonic() - inicio
    fabrica.liberar_transcricao.set()
    s.receber(transcrever("p-2"))

    assert erro == {"tipo": "erro", "idPedido": "p-1", "codigo": "FALHA_NA_TRANSCRICAO", "motivo": "prazo excedido"}
    assert decorrido < 2
    assert coletor.resposta("p-2")["tipo"] == "resultado"
    assert len(fabrica.instancias) == 2
    assert fabrica.instancias[0].encerrado.is_set()
    assert eventos_do_registro(tmp_path).count("carregamento") == 2


def test_prazo_padrao():
    from whispper_motor.servidor import prazo_padrao

    assert prazo_padrao(10) == 60
    assert prazo_padrao(300) == 150


def test_queda_do_trabalhador_durante_transcricao(servidor, fabrica, coletor):
    s = servidor()
    fabrica.quedas = 1

    s.receber(transcrever("p-1"))
    s.receber(transcrever("p-2"))

    assert coletor.resposta("p-1") == {
        "tipo": "erro",
        "idPedido": "p-1",
        "codigo": "FALHA_NA_TRANSCRICAO",
        "motivo": "falha do Whisper",
    }
    assert coletor.resposta("p-2")["tipo"] == "resultado"
    assert len(fabrica.instancias) == 2


def test_ociosidade_descarrega_e_a_verificacao_recarrega(servidor, fabrica, coletor, tmp_path):
    s = servidor(ocioso_s=0.3)
    s.receber(transcrever("p-1"))
    coletor.resposta("p-1")

    time.sleep(0.8)
    s.receber(verificar())
    estado_apos_ocio = coletor.estado(1)
    s.aguardar_estado_estavel(timeout=5)

    assert fabrica.instancias[0].encerrado.is_set()
    assert estado_apos_ocio["estado"] == "carregando"
    assert len(fabrica.instancias) == 2
    assert eventos_do_registro(tmp_path)[:4] == ["carregamento", "pedido", "descarregamento", "carregamento"]


def test_ociosidade_recarrega_no_pedido_seguinte(servidor, fabrica, coletor):
    s = servidor(ocioso_s=0.3)
    s.receber(transcrever("p-1"))
    coletor.resposta("p-1")

    time.sleep(0.8)
    s.receber(transcrever("p-2"))

    assert coletor.resposta("p-2")["tipo"] == "resultado"
    assert len(fabrica.instancias) == 2


def test_silencio_nao_aciona_o_trabalhador(servidor, fabrica, coletor):
    s = servidor()

    s.receber(transcrever("p-1", arquivo="silencio.ogg"))
    resultado = coletor.resposta("p-1")

    assert (resultado["tipo"], resultado["texto"], resultado["idioma"]) == ("resultado", "", "")
    assert fabrica.transcricoes_recebidas == []


def test_id_pedido_duplicado(servidor, fabrica, coletor):
    s = servidor()
    fabrica.liberar_transcricao.clear()

    s.receber(transcrever("p-1"))
    s.receber(transcrever("p-1"))
    recusa = coletor.esperar(lambda m: m.get("codigo") == "MENSAGEM_INVALIDA")
    fabrica.liberar_transcricao.set()

    assert recusa == {
        "tipo": "erro",
        "idPedido": None,
        "codigo": "MENSAGEM_INVALIDA",
        "motivo": "mensagem inválida",
        "detalhe": "idPedido duplicado",
    }
    assert coletor.resposta("p-1")["tipo"] == "resultado"


def test_mensagem_invalida_nao_derruba_o_servidor(servidor, coletor):
    s = servidor()

    s.receber(b'{"tipo": "executar", "protocolo": 1}')
    s.receber(b"{tipo")
    s.aguardar_estado_estavel(timeout=5)
    s.receber(verificar())

    invalidas = [m for m in coletor.mensagens if m.get("codigo") == "MENSAGEM_INVALIDA"]
    assert [m["detalhe"] for m in invalidas] == ["tipo desconhecido: executar", "JSON inválido"]
    assert coletor.estado()["estado"] == "pronto"


def test_texto_acima_do_limite_de_saida(servidor, fabrica, coletor):
    s = servidor()
    fabrica.texto = "a" * protocolo.LIMITE_SAIDA

    s.receber(transcrever("p-1"))

    assert coletor.resposta("p-1") == {
        "tipo": "erro",
        "idPedido": "p-1",
        "codigo": "FALHA_NA_TRANSCRICAO",
        "motivo": "texto maior que o limite",
    }


def test_pasta_temporaria_vazia_apos_pedidos_com_erro(servidor, coletor, tmp_path):
    s = servidor()
    pedidos = [(f"p-{i}", "fala-pt.m4a", "audio/mp4") for i in range(8)]
    pedidos += [("p-8", "corrompido.ogg", "audio/mp4"), ("p-9", "vazio.ogg", "audio/ogg")]

    for id_pedido, arquivo, midia in pedidos:
        s.receber(transcrever(id_pedido, arquivo=arquivo, midia=midia))
    respostas = [coletor.resposta(id_pedido) for id_pedido, _, _ in pedidos]

    assert [r["tipo"] for r in respostas] == ["resultado"] * 8 + ["erro", "erro"]
    assert {r.get("motivo") for r in respostas[8:]} == {"áudio ilegível"}
    assert list((tmp_path / "tmp").iterdir()) == []


def test_registro_sem_conteudo(servidor, coletor, tmp_path):
    s = servidor()

    s.receber(transcrever("p-1"))
    coletor.resposta("p-1")

    assert "texto simulado" not in (tmp_path / "desempenho.tsv").read_text(encoding="utf-8")
    assert all(json.dumps(m, ensure_ascii=False) for m in coletor.mensagens)


def test_falha_do_whisper_num_audio_nao_recria_o_trabalhador(tmp_path, ffmpeg, coletor):
    criados = []

    def fabrica(caminho_modelo):
        criados.append(TrabalhadorMlx(caminho_modelo, alvo=laco_com_falha))
        return criados[-1]

    s = criar_servidor(tmp_path, ffmpeg, fabrica, coletor)
    try:
        s.receber(transcrever("p-1"))
        s.receber(transcrever("p-2"))

        assert coletor.resposta("p-1", timeout=10) == {
            "tipo": "erro",
            "idPedido": "p-1",
            "codigo": "FALHA_NA_TRANSCRICAO",
            "motivo": "falha do Whisper",
        }
        assert coletor.resposta("p-2", timeout=10)["tipo"] == "resultado"
        assert len(criados) == 1
        assert eventos_do_registro(tmp_path).count("carregamento") == 1
    finally:
        s.encerrar()


def test_ffmpeg_removido_com_o_host_aberto_deixa_o_motor_indisponivel(servidor, fabrica, coletor, tmp_path, ffmpeg):
    atalho = tmp_path / "ffmpeg"
    atalho.symlink_to(ffmpeg)
    s = servidor(config=Configuracao(ffmpeg=atalho, pasta_de_modelos=tmp_path))
    assert s.aguardar_estado_estavel(timeout=5) == "pronto"
    atalho.unlink()

    s.receber(transcrever("p-1"))
    primeira = coletor.resposta("p-1")
    s.receber(verificar())
    estado = coletor.estado()
    s.receber(transcrever("p-2"))

    indisponivel = {"tipo": "erro", "codigo": "MOTOR_INDISPONIVEL", "motivo": "ffmpeg ausente"}
    assert primeira == {"idPedido": "p-1", **indisponivel}
    assert (estado["estado"], estado["motivo"]) == ("erro", "ffmpeg ausente")
    assert coletor.resposta("p-2") == {"idPedido": "p-2", **indisponivel}
    assert fabrica.transcricoes_recebidas == []
    assert fabrica.instancias[0].encerrado.wait(5)


@pytest.mark.parametrize("bruto", [b'{"tipo":"\\ud800","protocolo":1}', b'{"tipo":["\\udc80"]}'])
def test_tipo_desconhecido_com_surrogate_isolado_recebe_resposta(tmp_path, ffmpeg, fabrica, coletor, bruto):
    # Como na saída real, a mensagem é serializada antes de chegar ao coletor.
    s = criar_servidor(tmp_path, ffmpeg, fabrica, lambda m: coletor(json.loads(protocolo.serializar(m))))
    try:
        s.receber(bruto)
        s.receber(verificar())
        coletor.estado()

        invalidas = [m for m in coletor.mensagens if m.get("codigo") == "MENSAGEM_INVALIDA"]
        assert len(invalidas) == 1
        assert invalidas[0]["detalhe"].startswith("tipo desconhecido: ")
    finally:
        s.encerrar()


def test_ociosidade_enorme_nao_derruba_o_despachante(servidor, coletor):
    s = servidor(ocioso_s=1e12)
    s.aguardar_estado_estavel(timeout=5)
    time.sleep(0.2)  # o despachante chega à espera da ociosidade

    s.receber(transcrever("p-1"))

    assert coletor.resposta("p-1")["tipo"] == "resultado"
    assert s._despachante.is_alive()


def test_falha_inesperada_no_despachante_deixa_o_motor_indisponivel(servidor, coletor, monkeypatch):
    # Sem o teto da espera, a ociosidade enorme faz a espera levantar fora de qualquer tarefa.
    monkeypatch.setattr(modulo_servidor, "ESPERA_MAXIMA_DE_OCIOSIDADE_S", math.inf)
    s = servidor(ocioso_s=1e12)
    estado, limite = {}, time.monotonic() + 5
    while estado.get("estado") != "erro" and time.monotonic() < limite:
        time.sleep(0.05)
        s.receber(verificar())
        estado = coletor.mensagens[-1]

    s.receber(transcrever("p-1"))

    assert (estado["estado"], estado["motivo"]) == ("erro", "falha ao carregar o modelo")
    assert coletor.resposta("p-1")["codigo"] == "MOTOR_INDISPONIVEL"
    assert s._despachante.is_alive()


class RegistroQueFalha(RegistroDeDesempenho):
    def _acrescentar(self, *argumentos):
        raise ValueError("registro ilegível")


def test_falha_do_registro_nao_impede_respostas_nem_carregamento(tmp_path, ffmpeg, fabrica, coletor):
    s = criar_servidor(tmp_path, ffmpeg, fabrica, coletor, registro=RegistroQueFalha(tmp_path / "x.tsv"), ocioso_s=0.3)
    try:
        assert s.aguardar_estado_estavel(timeout=5) == "pronto"
        s.receber(transcrever("p-1"))
        assert coletor.resposta("p-1")["tipo"] == "resultado"

        time.sleep(0.8)  # o modelo é descarregado por ociosidade
        s.receber(transcrever("p-2"))

        assert coletor.resposta("p-2")["tipo"] == "resultado"
        assert len(fabrica.instancias) == 2
        assert fabrica.instancias[0].encerrado.is_set()
    finally:
        s.encerrar()
