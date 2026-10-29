"""Escolha entre a placa de vídeo e o processador no Windows, com fábrica de modelo falsa (D-05, D-07).

Nada aqui precisa da placa nem do faster-whisper: a fábrica, a contagem de placas e a
conferência das bibliotecas são injetadas, e os testes rodam nas duas plataformas.
"""

import os
from pathlib import Path

import pytest

from whispper_motor import trabalhador
from whispper_motor.trabalhador import TrabalhadorEmProcesso

from .suporte.trabalhador_simulado import laco_com_dispositivo


class Fabrica:
    """Cria modelos falsos, anota cada pedido e falha nos dispositivos indicados."""

    def __init__(self, falhas=None, falha_no_aquecimento=None):
        self.falhas = falhas or {}
        self.falha_no_aquecimento = falha_no_aquecimento or {}
        self.pedidos = []

    def __call__(self, caminho, device, compute_type, **opcoes):
        self.pedidos.append((device, compute_type, opcoes))
        if device in self.falhas:
            raise self.falhas[device]
        return {"device": device}

    def aquecer(self, modelo):
        if modelo["device"] in self.falha_no_aquecimento:
            raise self.falha_no_aquecimento[modelo["device"]]


def carregar(fabrica, placas=1, bibliotecas=True):
    contar = placas if callable(placas) else (lambda: placas)
    return trabalhador.carregar_com_reserva(
        "modelo", fabrica, contar, lambda: bibliotecas, aquecer=fabrica.aquecer, nucleos=lambda: 8
    )


def test_placa_disponivel_carrega_na_placa_em_int8():
    fabrica = Fabrica()

    carregado = carregar(fabrica)

    assert carregado.dispositivo == "cuda"
    assert (carregado.linha, carregado.nivel) == ("modelo carregado na placa de vídeo", "info")
    assert fabrica.pedidos == [("cuda", "int8", {})]


SEGREDO = "C:\\Users\\paciente\\audio-da-consulta.ogg"


@pytest.mark.parametrize(
    "placas, bibliotecas, falhas, aquecimento, motivo",
    [
        (0, True, {}, {}, "sem placa NVIDIA"),
        (1, False, {}, {}, "bibliotecas da placa ausentes"),
        (1, True, {"cuda": RuntimeError(f"CUDA failed with error out of memory {SEGREDO}")}, {}, "memória da placa insuficiente"),
        (1, True, {"cuda": RuntimeError(f"cuDNN failed {SEGREDO}")}, {}, "falha da placa"),
        (1, True, {}, {"cuda": RuntimeError(f"CUDA error: illegal memory access {SEGREDO}")}, "falha da placa"),
    ],
    ids=["sem-placa", "sem-bibliotecas", "sem-memoria", "falha-ao-carregar", "falha-no-aquecimento"],
)
def test_reserva_no_processador_com_o_motivo(placas, bibliotecas, falhas, aquecimento, motivo):
    fabrica = Fabrica(falhas, aquecimento)

    carregado = carregar(fabrica, placas, bibliotecas)

    assert carregado.dispositivo == "cpu"
    assert (carregado.linha, carregado.nivel) == (f"modelo carregado no processador: {motivo}", "aviso")
    assert motivo in trabalhador.MOTIVOS_DO_PROCESSADOR
    assert "paciente" not in carregado.linha
    # No processador, int8 com uma linha por núcleo físico.
    assert fabrica.pedidos[-1] == ("cpu", "int8", {"cpu_threads": 8})


def test_contagem_de_placas_que_falha_conta_como_sem_placa():
    def contar():
        raise RuntimeError("driver da NVIDIA ausente")

    carregado = carregar(Fabrica(), contar)

    assert carregado.linha == "modelo carregado no processador: sem placa NVIDIA"


def test_falha_tambem_no_processador_sobe_ao_laco():
    fabrica = Fabrica({"cuda": RuntimeError("cuDNN failed"), "cpu": MemoryError()})

    with pytest.raises(MemoryError):
        carregar(fabrica)


def test_registra_so_as_pastas_de_bibliotecas_existentes(tmp_path, monkeypatch):
    base = tmp_path / "site-packages"
    cublas = base / "nvidia" / "cublas" / "bin"
    cudnn = base / "nvidia" / "cudnn" / "bin"
    cublas.mkdir(parents=True)
    cudnn.mkdir(parents=True)
    (base / "nvidia" / "cuda_nvrtc").mkdir()
    monkeypatch.setenv("PATH", "original")
    registradas = []

    resultado = trabalhador.registrar_bibliotecas_da_nvidia([base, tmp_path / "inexistente"], adicionar=registradas.append)

    assert sorted(resultado) == sorted([cublas, cudnn])
    assert registradas == resultado
    assert os.environ["PATH"].split(os.pathsep) == [str(p) for p in resultado] + ["original"]


def test_sem_pasta_da_nvidia_nada_e_registrado(tmp_path, monkeypatch):
    monkeypatch.setenv("PATH", "original")
    registradas = []

    assert trabalhador.registrar_bibliotecas_da_nvidia([tmp_path], adicionar=registradas.append) == []
    assert registradas == []
    assert os.environ["PATH"] == "original"


def test_bibliotecas_da_placa_presentes_so_quando_todas_carregam():
    carregadas = []

    def carregar_todas(nome):
        carregadas.append(nome)

    def faltar_o_cudnn(nome):
        if nome.startswith("cudnn"):
            raise OSError(126, "módulo não encontrado")

    assert trabalhador.bibliotecas_da_placa_presentes(carregar_todas)
    assert carregadas == list(trabalhador.BIBLIOTECAS_DA_PLACA)
    assert not trabalhador.bibliotecas_da_placa_presentes(faltar_o_cudnn)


def test_linha_do_dispositivo_vai_ao_diagnostico_do_principal(capfd):
    t = TrabalhadorEmProcesso(Path("/inexistente"), alvo=laco_com_dispositivo)
    t.iniciar()
    try:
        carregamento = t.aguardar_carregamento(timeout=30)
    finally:
        t.encerrar()

    assert carregamento.ok
    assert "aviso modelo carregado no processador: sem placa NVIDIA" in capfd.readouterr().err
