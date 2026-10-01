import json
import os
import select
import struct
import subprocess
import sys
from dataclasses import replace
from pathlib import Path

import pytest

from whispper_motor import configuracao, instalacao, protocolo
from whispper_motor.instalacao import Ambiente, PrerequisitosAusentes

from .suporte.cache import criar_snapshot

RAIZ = Path(__file__).resolve().parents[2]
CODIGO = RAIZ / "auxiliar" / "whispper_motor"
ID = "femjlfnijaboogbcdionddnjcjpfmieg"
MODELO = "mlx-community/whisper-large-v3-turbo"


@pytest.fixture
def ambiente(tmp_path):
    home = tmp_path / "home"
    cache = home / ".cache" / "huggingface" / "hub"
    criar_snapshot(cache, MODELO)
    ffmpeg = tmp_path / "bin" / "ffmpeg"
    ffmpeg.parent.mkdir()
    ffmpeg.write_text("#!/bin/sh\n")
    ffmpeg.chmod(0o755)
    return Ambiente(
        home=home,
        python=Path("/Library/Frameworks/Python.framework/Versions/3.14/bin/python3"),
        versao_python=(3, 14),
        sistema="Darwin",
        arquitetura="arm64",
        ffmpeg=ffmpeg,
        mlx_whisper=True,
        pasta_de_modelos=cache,
    )


def test_identificador_da_chave_do_manifesto():
    chave = instalacao.ler_key(RAIZ / "extension" / "manifest.json")

    assert instalacao.identificador_da_extensao(chave) == ID


def test_prerequisitos_atendidos(ambiente):
    assert instalacao.verificar_prerequisitos(ambiente, MODELO) == []


@pytest.mark.parametrize(
    "alteracao, trecho",
    [
        ({"sistema": "Linux"}, "Mac com Apple Silicon"),
        ({"arquitetura": "x86_64"}, "Mac com Apple Silicon"),
        ({"versao_python": (3, 10)}, "Python 3.11"),
        ({"ffmpeg": None}, "ffmpeg"),
        ({"mlx_whisper": False}, "mlx-whisper"),
    ],
)
def test_prerequisito_ausente_e_nomeado(ambiente, alteracao, trecho):
    faltas = instalacao.verificar_prerequisitos(replace(ambiente, **alteracao), MODELO)

    assert len(faltas) == 1
    assert trecho in faltas[0]


def test_modelo_ausente_mostra_como_baixar(ambiente):
    faltas = instalacao.verificar_prerequisitos(ambiente, "mlx-community/whisper-small-mlx")

    assert len(faltas) == 1
    assert "modelo não encontrado" in faltas[0]
    assert "snapshot_download('mlx-community/whisper-small-mlx')" in faltas[0]
    assert str(ambiente.python) in faltas[0]


def test_instalar_grava_codigo_configuracao_lancador_e_manifesto(ambiente):
    instalacao.instalar(ambiente, ID, CODIGO)

    pasta = instalacao.pasta_app(ambiente.home)
    assert (pasta / "whispper_motor" / "__main__.py").exists()
    assert not list((pasta / "whispper_motor").rglob("__pycache__"))

    config = configuracao.carregar(pasta / "config.toml")
    assert (config.modelo, config.extensao_id, config.ffmpeg) == (MODELO, ID, ambiente.ffmpeg)
    assert config.pasta_de_modelos == ambiente.pasta_de_modelos

    lancador = pasta / "whispper-motor"
    assert os.access(lancador, os.X_OK)
    texto = lancador.read_text()
    assert "HF_HUB_OFFLINE=1" in texto
    assert "HF_HUB_DISABLE_TELEMETRY=1" in texto
    assert f"exec '{ambiente.python}' -m whispper_motor" in texto

    manifesto = json.loads(instalacao.caminho_manifesto_host(ambiente.home).read_text())
    assert manifesto == {
        "name": "whispper_whatsapp_web.motor",
        "description": "Motor de transcrição local do whispper-whatsapp-web",
        "path": str(lancador),
        "type": "stdio",
        "allowed_origins": [f"chrome-extension://{ID}/"],
    }


def test_instalar_recusa_sem_escrever_nada(ambiente):
    with pytest.raises(PrerequisitosAusentes) as erro:
        instalacao.instalar(replace(ambiente, ffmpeg=None), ID, CODIGO)

    assert "ffmpeg" in erro.value.faltas[0]
    assert not instalacao.pasta_app(ambiente.home).exists()
    assert not instalacao.caminho_manifesto_host(ambiente.home).exists()


def test_reinstalar_preserva_o_modelo_escolhido(ambiente):
    criar_snapshot(ambiente.pasta_de_modelos, "mlx-community/whisper-medium-mlx")
    instalacao.instalar(ambiente, ID, CODIGO)
    caminho = instalacao.pasta_app(ambiente.home) / "config.toml"
    configuracao.gravar(replace(configuracao.carregar(caminho), modelo="mlx-community/whisper-medium-mlx", ocioso_min=10), caminho)

    instalacao.instalar(ambiente, ID, CODIGO)

    config = configuracao.carregar(caminho)
    assert (config.modelo, config.ocioso_min) == ("mlx-community/whisper-medium-mlx", 10)


def test_desinstalar_remove_tudo_e_preserva_o_cache(ambiente):
    instalacao.instalar(ambiente, ID, CODIGO)

    removidos = instalacao.desinstalar(ambiente.home)

    assert set(removidos) == {instalacao.pasta_app(ambiente.home), instalacao.caminho_manifesto_host(ambiente.home)}
    assert not instalacao.pasta_app(ambiente.home).exists()
    assert not instalacao.caminho_manifesto_host(ambiente.home).exists()
    assert (ambiente.pasta_de_modelos / "models--mlx-community--whisper-large-v3-turbo").exists()
    assert instalacao.desinstalar(ambiente.home) == []


def test_diagnostico_confere_manifesto_e_origem(ambiente):
    instalacao.instalar(ambiente, ID, CODIGO)

    certo = instalacao.diagnosticar(ambiente.home, ID)
    errado = instalacao.diagnosticar(ambiente.home, "a" * 32)

    assert all(ok for _, ok, _ in certo)
    assert [nome for nome, ok, _ in errado if not ok] == ["allowed_origins"]


def test_diagnostico_sem_instalacao(ambiente):
    resultado = dict((nome, ok) for nome, ok, _ in instalacao.diagnosticar(ambiente.home, ID))

    assert resultado["manifesto do host"] is False


def test_desinstalar_encerra_o_host_em_execucao(ambiente, tmp_path):
    ambiente = replace(ambiente, python=Path(sys.executable))
    instalacao.instalar(ambiente, ID, CODIGO)
    lancador = instalacao.pasta_app(ambiente.home) / "whispper-motor"
    temporarios = tmp_path / "t"
    temporarios.mkdir()
    # Como o Chrome: pelo lançador, com a origem, na pasta dele e com o PATH mínimo.
    host = subprocess.Popen(
        [str(lancador), f"chrome-extension://{ID}/"],
        cwd=lancador.parent,
        env={"HOME": str(ambiente.home), "PATH": instalacao.PATH_DO_CHROME, "TMPDIR": str(temporarios)},
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    try:
        # Qualquer estado serve: com o modelo falso, o host segue vivo mesmo em "erro".
        protocolo.escrever_mensagem(host.stdin, {"tipo": "verificar", "protocolo": 1})
        assert select.select([host.stdout], [], [], 15)[0], "o host não respondeu"
        (tamanho,) = struct.unpack("=I", host.stdout.read(4))
        assert json.loads(host.stdout.read(tamanho))["tipo"] == "estado"

        encerrados = []
        instalacao.desinstalar(ambiente.home, hosts_encerrados=encerrados)

        assert host.wait(timeout=10) == 0
        assert host.stdout.read() == b""
        assert encerrados == [host.pid]
        assert not instalacao.pasta_app(ambiente.home).exists()
    finally:
        if host.poll() is None:
            host.kill()
            host.wait()
