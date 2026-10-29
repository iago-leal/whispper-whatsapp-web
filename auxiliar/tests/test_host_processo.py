"""O host como processo, lançado com ambiente mínimo, como faz o Chrome (RF-09, D-08)."""

import base64
import json
import os
import subprocess
import sys
import time

import pytest

from whispper_motor import VERSAO_APP, protocolo

from .suporte.host_em_processo import (  # noqa: F401 - fechar_leitores é fixture
    AMOSTRAS,
    enviar,
    esperar_pronto,
    fechar_leitores,
    lancar,
    ler,
    ler_moldura,
    preparar_ambiente,
)


@pytest.fixture
def ambiente(tmp_path, ffmpeg):
    return preparar_ambiente(tmp_path, ffmpeg)


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
    bruto = (pasta / "diagnostico.log").read_bytes()
    # UTF-8 e "\n" nas duas plataformas, também no que o host e o trabalhador imprimem.
    assert b"\r" not in bruto
    diagnostico = bruto.decode("utf-8")
    assert "ruído do processo principal" in diagnostico
    assert "ruído do trabalhador" in diagnostico
    assert "ruido cru do trabalhador" in diagnostico
    assert "texto simulado" not in diagnostico


def protocolo_que_responde_com(tamanho):
    """Um `protocolo` incompatível cuja recusa, que o ecoa, tem `tamanho` módulo 256 bytes."""
    for digitos in range(2, 600):
        pedido = int("9" * digitos)
        resposta = protocolo.resposta_erro(
            "p-1",
            protocolo.VERSAO_INCOMPATIVEL,
            "versão de protocolo incompatível",
            protocoloApp=protocolo.PROTOCOLO,
            protocoloPedido=pedido,
        )
        if len(protocolo.serializar(resposta)) % 256 == tamanho:
            return pedido
    raise AssertionError("nenhum tamanho de resposta serve")


def test_molduras_com_0x0a_e_0x1a_no_cabecalho_atravessam_intactas(ambiente):
    # 266 e 282 bytes dão cabeçalhos 0a 01 00 00 e 1a 01 00 00: no modo texto do Windows,
    # o 0x0A da saída viraria 0d 0a, e o 0x1A da entrada seria lido como fim de arquivo.
    pasta, temporarios = ambiente
    proc = lancar(pasta, temporarios)
    try:
        for tamanho in (266, 282):
            enviar(proc, {"tipo": "verificar", "protocolo": 1}, tamanho=tamanho)
            assert ler(proc)["tipo"] == "estado"
        pedido = protocolo_que_responde_com(0x0A)
        enviar(proc, {"tipo": "transcrever", "protocolo": pedido, "idPedido": "p-1"})

        cabecalho, corpo = ler_moldura(proc)

        assert cabecalho[0] == 0x0A
        resposta = json.loads(corpo)
        assert (resposta["codigo"], resposta["protocoloPedido"]) == (protocolo.VERSAO_INCOMPATIVEL, pedido)
        assert resposta == json.loads(protocolo.serializar(resposta))
        enviar(proc, {"tipo": "verificar", "protocolo": 1})
        assert ler(proc)["versaoApp"] == VERSAO_APP
    finally:
        proc.stdin.close()
        codigo = proc.wait(timeout=10)

    assert codigo == 0


def test_origem_diferente_encerra_sem_responder(ambiente):
    pasta, temporarios = ambiente
    proc = lancar(pasta, temporarios, origem="chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/")

    codigo = proc.wait(timeout=10)

    assert codigo != 0
    assert proc.stdout.read() == b""


def test_trabalhador_carrega_sem_esperar_outra_mensagem_da_extensao(ambiente):
    # O trabalhador nasce com a leitura do host já pendente. No Windows, sem a troca da
    # entrada padrão, ele só iniciava quando a mensagem seguinte chegava.
    pasta, temporarios = ambiente
    proc = lancar(pasta, temporarios)
    try:
        time.sleep(5)
        enviar(proc, {"tipo": "verificar", "protocolo": 1})

        assert ler(proc)["estado"] == "pronto"
    finally:
        proc.stdin.close()
        proc.wait(timeout=10)


def test_fim_da_entrada_encerra_e_apaga_temporarios(ambiente):
    pasta, temporarios = ambiente
    proc = lancar(pasta, temporarios)
    enviar(proc, {"tipo": "verificar", "protocolo": 1})
    ler(proc)

    proc.stdin.close()

    assert proc.wait(timeout=10) == 0
    assert list(temporarios.iterdir()) == []


def pid_encerrado():
    processo = subprocess.Popen([sys.executable, "-c", "pass"])
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
