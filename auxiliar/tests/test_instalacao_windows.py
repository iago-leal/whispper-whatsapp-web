"""Instalação no Windows, com perfil, pasta local e raiz do registro de teste (RF-11, RF-15, D-13, D-14)."""

import json
from dataclasses import replace
from pathlib import Path

import pytest

from whispper_motor import NOME_DO_HOST, configuracao, instalacao
from whispper_motor.instalacao import PrerequisitosAusentes

from .suporte.ambiente_windows import ARQUIVOS_CT2, MODELO_CT2, ambiente_de_instalacao, ler_valor_padrao
from .suporte.cache import criar_snapshot

CODIGO = Path(instalacao.__file__).resolve().parent
ID = "femjlfnijaboogbcdionddnjcjpfmieg"


def chaves(raiz):
    return [chave for _, chave in instalacao.chaves_do_registro(raiz)]


def test_instalar_grava_codigo_configuracao_lancador_manifesto_e_registro(ambiente_windows):
    ambiente = ambiente_de_instalacao(ambiente_windows)

    instalacao.instalar(ambiente, ID, CODIGO)

    pasta = ambiente_windows.pasta_app
    assert instalacao.pasta_app(ambiente.home) == pasta
    assert (pasta / "whispper_motor" / "__main__.py").exists()
    assert not list((pasta / "whispper_motor").rglob("__pycache__"))

    config = configuracao.carregar(pasta / "config.toml")
    assert (config.modelo, config.extensao_id, config.ffmpeg) == (MODELO_CT2, ID, ambiente.ffmpeg)
    assert config.pasta_de_modelos == ambiente.pasta_de_modelos

    lancador = pasta / "whispper-motor.bat"
    bruto = lancador.read_bytes()
    assert bruto.count(b"\r\n") == bruto.count(b"\n")
    linhas = bruto.decode("oem").splitlines()
    assert linhas[0] == "@echo off"
    for variavel in (
        "HF_HUB_OFFLINE=1",
        "HF_HUB_DISABLE_TELEMETRY=1",
        f"WHISPPER_MOTOR_PASTA={pasta}",
        f"PYTHONPATH={pasta}",
        "PYTHONSAFEPATH=1",
        "PYTHONUTF8=1",
        "OPENBLAS_NUM_THREADS=1",
    ):
        assert f'set "{variavel}"' in linhas
    assert linhas[-1] == f'"{ambiente.python}" -m whispper_motor %*'

    manifesto = pasta / f"{NOME_DO_HOST}.json"
    assert instalacao.caminho_manifesto_host(ambiente.home) == manifesto
    assert json.loads(manifesto.read_text(encoding="utf-8")) == {
        "name": NOME_DO_HOST,
        "description": "Motor de transcrição local do whispper-whatsapp-web",
        "path": str(lancador),
        "type": "stdio",
        "allowed_origins": [f"chrome-extension://{ID}/"],
    }
    raiz = ambiente_windows.raiz_do_registro
    assert chaves(raiz) == [
        rf"{raiz}\Google\Chrome\NativeMessagingHosts\{NOME_DO_HOST}",
        rf"{raiz}\BraveSoftware\Brave-Browser\NativeMessagingHosts\{NOME_DO_HOST}",
    ]
    assert [ler_valor_padrao(chave) for chave in chaves(raiz)] == [str(manifesto)] * 2


def test_entradas_do_registro_sao_as_ultimas_gravadas(ambiente_windows, monkeypatch):
    gravacoes = []
    gravar, gravar_registro = instalacao._gravar, instalacao._gravar_registro

    def espiar_arquivo(caminho, *argumentos, **opcoes):
        gravacoes.append(("arquivo", Path(caminho).name))
        return gravar(caminho, *argumentos, **opcoes)

    def espiar_registro(chave, valor):
        gravacoes.append(("registro", chave))
        return gravar_registro(chave, valor)

    monkeypatch.setattr(instalacao, "_gravar", espiar_arquivo)
    monkeypatch.setattr(instalacao, "_gravar_registro", espiar_registro)

    instalacao.instalar(ambiente_de_instalacao(ambiente_windows), ID, CODIGO)

    # O navegador só encontra o host depois do manifesto completo; o Brave, por último.
    assert gravacoes[-3:] == [
        ("arquivo", f"{NOME_DO_HOST}.json"),
        *(("registro", chave) for chave in chaves(ambiente_windows.raiz_do_registro)),
    ]


@pytest.mark.parametrize("caractere", list("%^&|<>!"))
def test_caminho_com_caractere_especial_do_cmd_e_recusado_sem_gravar(ambiente_windows, caractere):
    python = Path(rf"C:\Python{caractere}313\python.exe")

    with pytest.raises(PrerequisitosAusentes) as erro:
        instalacao.instalar(ambiente_de_instalacao(ambiente_windows, python=python), ID, CODIGO)

    [falta] = erro.value.faltas
    assert caractere in falta
    assert str(python) in falta
    assert not ambiente_windows.pasta_app.exists()
    assert [ler_valor_padrao(chave) for chave in chaves(ambiente_windows.raiz_do_registro)] == [None, None]


def test_pasta_local_com_caractere_especial_e_recusada(ambiente_windows, monkeypatch):
    local = ambiente_windows.perfil / "Dados & Programas"
    local.mkdir()
    monkeypatch.setenv("LOCALAPPDATA", str(local))

    with pytest.raises(PrerequisitosAusentes) as erro:
        instalacao.instalar(ambiente_de_instalacao(ambiente_windows), ID, CODIGO)

    assert str(local / "whispper-motor") in erro.value.faltas[0]
    assert list(local.iterdir()) == []


def test_reinstalar_preserva_o_modelo_escolhido(ambiente_windows):
    ambiente = ambiente_de_instalacao(ambiente_windows)
    criar_snapshot(ambiente.pasta_de_modelos, "Systran/faster-whisper-small", arquivos=ARQUIVOS_CT2)
    instalacao.instalar(ambiente, ID, CODIGO)
    caminho = ambiente_windows.pasta_app / "config.toml"
    escolhido = replace(configuracao.carregar(caminho), modelo="Systran/faster-whisper-small", ocioso_min=10)
    configuracao.gravar(escolhido, caminho)

    instalacao.instalar(ambiente, ID, CODIGO)

    config = configuracao.carregar(caminho)
    assert (config.modelo, config.ocioso_min) == ("Systran/faster-whisper-small", 10)
