from pathlib import Path

import pytest

from whispper_motor import configuracao
from whispper_motor.configuracao import Configuracao, ConfiguracaoInvalida

ID_VALIDO = "femjlfnijaboogbcdionddnjcjpfmieg"


def test_arquivo_ausente_usa_padroes(tmp_path):
    config = configuracao.carregar(tmp_path / "config.toml")

    assert config.modelo == "mlx-community/whisper-large-v3-turbo"
    assert config.pasta_de_modelos == Path("~/.cache/huggingface/hub").expanduser()
    assert config.ocioso_min == 30
    assert config.extensao_id is None
    assert config.ffmpeg.is_absolute()


def test_le_todos_os_campos():
    config = configuracao.ler_texto(
        f"""
        modelo = "mlx-community/whisper-medium-mlx"
        pasta_de_modelos = "~/modelos"
        ffmpeg = "/opt/homebrew/bin/ffmpeg"
        extensao_id = "{ID_VALIDO}"
        ocioso_min = 10
        """
    )

    assert config.modelo == "mlx-community/whisper-medium-mlx"
    assert config.pasta_de_modelos == Path("~/modelos").expanduser()
    assert config.ffmpeg == Path("/opt/homebrew/bin/ffmpeg")
    assert config.extensao_id == ID_VALIDO
    assert config.ocioso_min == 10


@pytest.mark.parametrize(
    "texto, campo",
    [
        ("ocioso_min = 0", "ocioso_min"),
        ("ocioso_min = 10081", "ocioso_min"),
        ("ocioso_min = 153722868", "ocioso_min"),
        ('ocioso_min = "30"', "ocioso_min"),
        ('extensao_id = "xyz"', "extensao_id"),
        ('modelo = ""', "modelo"),
        ("pasta_de_modelos = 3", "pasta_de_modelos"),
        ('ffmpeg = "ffmpeg"', "ffmpeg"),
        ("modelo = [", "arquivo"),
    ],
)
def test_campo_invalido(texto, campo):
    with pytest.raises(ConfiguracaoInvalida) as erro:
        configuracao.ler_texto(texto)

    assert erro.value.campo == campo
    assert str(erro.value) == f"configuração inválida: {campo}"


def test_gravar_e_carregar(tmp_path):
    original = Configuracao(
        modelo="mlx-community/whisper-small-mlx",
        pasta_de_modelos=tmp_path / "cache",
        ffmpeg=Path("/usr/local/bin/ffmpeg"),
        extensao_id=ID_VALIDO,
        ocioso_min=45,
    )
    caminho = tmp_path / "config.toml"

    configuracao.gravar(original, caminho)

    assert configuracao.carregar(caminho) == original


def test_ocioso_min_aceita_o_teto():
    assert configuracao.ler_texto(f"ocioso_min = {configuracao.OCIOSO_MIN_MAXIMO}").ocioso_min == 10080
