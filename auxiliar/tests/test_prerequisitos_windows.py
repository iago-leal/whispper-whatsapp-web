"""Pré-requisitos e avisos da instalação no Windows, conferidos nas duas plataformas (RF-10, D-16).

A lista de pré-requisitos segue o sistema do `Ambiente`, e não o da máquina dos
testes: um `Ambiente` do Windows confere a lista do Windows também no Mac.
"""

import sys
import uuid
from dataclasses import replace
from pathlib import Path

import pytest

from whispper_motor import instalacao
from whispper_motor.instalacao import Ambiente, PrerequisitosAusentes

from .suporte import executavel_falso
from .suporte.ambiente_windows import ARQUIVOS_CT2, MODELO_CT2, RAIZ_DOS_TESTES, WINDOWS, apagar_chave
from .suporte.cache import criar_snapshot

ID = "femjlfnijaboogbcdionddnjcjpfmieg"
PYTHON = Path(r"C:\Users\medico\.venvs\whispper-motor\Scripts\python.exe")


@pytest.fixture
def ambiente(tmp_path, monkeypatch):
    # Se a recusa falhar, nada chega à pasta local nem ao registro reais.
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "Local"))
    raiz = rf"{RAIZ_DOS_TESTES}\{uuid.uuid4().hex}"
    perfil = tmp_path / "perfil"
    cache = perfil / ".cache" / "huggingface" / "hub"
    criar_snapshot(cache, MODELO_CT2, arquivos=ARQUIVOS_CT2)
    (tmp_path / "bin").mkdir()
    ffmpeg = executavel_falso.criar(tmp_path / "bin" / "ffmpeg", "")
    yield Ambiente(
        home=perfil,
        python=PYTHON,
        versao_python=(3, 13),
        sistema="Windows",
        arquitetura="AMD64",
        ffmpeg=ffmpeg,
        mlx_whisper=False,
        pasta_de_modelos=cache,
        faster_whisper=True,
        placa_cuda=True,
        bibliotecas_da_placa=True,
        raiz_do_registro=raiz,
    )
    if WINDOWS:
        apagar_chave(raiz)


def test_prerequisitos_atendidos_sem_avisos(ambiente):
    assert instalacao.verificar_prerequisitos(ambiente, MODELO_CT2) == []
    assert instalacao.avisos_de_prerequisitos(ambiente) == []


def test_lista_do_windows_dispensa_o_mlx(ambiente):
    nomes = [item.nome for item in instalacao.conferir_prerequisitos(ambiente, MODELO_CT2)]

    assert nomes == ["Windows de 64 bits", "Python 3.11 ou superior", "ffmpeg", "faster-whisper", "modelo"]


@pytest.mark.parametrize(
    "alteracao, nome, solucao",
    [
        ({"arquitetura": "ARM64"}, "Windows de 64 bits", "x86-64"),
        ({"arquitetura": "x86"}, "Windows de 64 bits", "x86-64"),
        ({"versao_python": (3, 10)}, "Python 3.11 ou superior", "WHISPPER_PYTHON"),
        ({"ffmpeg": None}, "ffmpeg", "winget install --id Gyan.FFmpeg --exact --source winget"),
        ({"faster_whisper": False}, "faster-whisper", f"& '{PYTHON}' -m pip install \"faster-whisper>=1.2,<1.3\""),
    ],
)
def test_falta_nomeada_com_o_comando_que_a_resolve(ambiente, alteracao, nome, solucao):
    alterado = replace(ambiente, **alteracao)

    [falta] = [item for item in instalacao.conferir_prerequisitos(alterado, MODELO_CT2) if not item.ok]

    assert falta.nome == nome
    assert solucao in falta.detalhe
    assert instalacao.verificar_prerequisitos(alterado, MODELO_CT2) == [falta.detalhe]


def test_modelo_ausente_mostra_o_download_no_powershell(ambiente):
    [falta] = instalacao.verificar_prerequisitos(ambiente, "Systran/faster-whisper-small")

    assert "modelo não encontrado" in falta
    assert (
        f"& '{PYTHON}' -c \"from huggingface_hub import snapshot_download; "
        "snapshot_download('Systran/faster-whisper-small')\""
    ) in falta


def test_download_para_cache_fora_do_padrao_define_a_variavel_no_powershell(ambiente, tmp_path):
    outro = tmp_path / "modelos"

    comando = instalacao.comando_de_download(replace(ambiente, pasta_de_modelos=outro), MODELO_CT2)

    assert comando.startswith(f"$env:HF_HUB_CACHE='{outro}'; & '{PYTHON}' -c ")


def test_aspas_simples_do_powershell_sao_dobradas(ambiente):
    python = Path(r"C:\Users\d'Ávila\.venvs\whispper-motor\Scripts\python.exe")

    comando = instalacao.comando_de_download(replace(ambiente, python=python), MODELO_CT2)

    assert comando.startswith(r"& 'C:\Users\d''Ávila\.venvs")


def test_sem_placa_nvidia_e_aviso_e_nao_falta(ambiente):
    sem_placa = replace(ambiente, placa_cuda=False, bibliotecas_da_placa=False)

    [aviso] = instalacao.avisos_de_prerequisitos(sem_placa)

    assert aviso.startswith("sem placa NVIDIA")
    assert "processador" in aviso
    assert instalacao.verificar_prerequisitos(sem_placa, MODELO_CT2) == []


def test_bibliotecas_da_placa_ausentes_sao_aviso_com_o_comando(ambiente):
    sem_bibliotecas = replace(ambiente, bibliotecas_da_placa=False)

    [aviso] = instalacao.avisos_de_prerequisitos(sem_bibliotecas)

    assert aviso.startswith("bibliotecas da placa ausentes")
    assert f"& '{PYTHON}' -m pip install nvidia-cublas-cu12 \"nvidia-cudnn-cu12>=9,<10\"" in aviso
    assert instalacao.verificar_prerequisitos(sem_bibliotecas, MODELO_CT2) == []


def test_mac_nao_tem_avisos_da_placa(ambiente):
    mac = replace(ambiente, sistema="Darwin", arquitetura="arm64", placa_cuda=False, bibliotecas_da_placa=False)

    assert instalacao.avisos_de_prerequisitos(mac) == []


def test_falta_recusa_a_instalacao_sem_gravar_nada(ambiente):
    with pytest.raises(PrerequisitosAusentes) as erro:
        instalacao.instalar(replace(ambiente, faster_whisper=False), ID, Path(instalacao.__file__).parent)

    assert "faster-whisper" in erro.value.faltas[0]
    assert not instalacao.pasta_app(ambiente.home).exists()


def test_comando_instalar_recusado_sai_com_1_e_mostra_falta_e_aviso(ambiente, monkeypatch, capsys):
    recusado = replace(ambiente, ffmpeg=None, placa_cuda=False, bibliotecas_da_placa=False)
    monkeypatch.setattr(instalacao, "detectar_ambiente", lambda home=None: recusado)

    codigo = instalacao._comando_instalar(ambiente.home, ID)

    saida = capsys.readouterr().out
    assert codigo == 1
    assert "  falta  ffmpeg ausente: instale-o com winget install" in saida
    assert "  aviso  sem placa NVIDIA" in saida
    assert "Instalação recusada; nada foi gravado." in saida
    assert not instalacao.pasta_app(ambiente.home).exists()


@pytest.mark.skipif(sys.platform != "win32", reason="exige o Windows: o FFmpeg detectado é o da máquina")
def test_ambiente_detectado_no_windows_tem_os_campos_da_placa():
    detectado = instalacao.detectar_ambiente()

    assert detectado.sistema == "Windows"
    assert isinstance(detectado.placa_cuda, bool)
    assert isinstance(detectado.bibliotecas_da_placa, bool)
    assert detectado.faster_whisper is True
