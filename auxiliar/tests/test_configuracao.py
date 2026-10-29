import sys
from pathlib import Path

import pytest

from whispper_motor import configuracao
from whispper_motor.configuracao import Configuracao, ConfiguracaoInvalida

ID_VALIDO = "femjlfnijaboogbcdionddnjcjpfmieg"
WINDOWS = sys.platform == "win32"
# Caminhos absolutos nesta plataforma: no Windows, "/opt/..." não tem unidade e não é absoluto.
FFMPEG_ABSOLUTO = "C:\\ffmpeg\\bin\\ffmpeg.exe" if WINDOWS else "/opt/homebrew/bin/ffmpeg"
OUTRO_FFMPEG_ABSOLUTO = "D:\\ferramentas\\ffmpeg.exe" if WINDOWS else "/usr/local/bin/ffmpeg"


def test_arquivo_ausente_usa_padroes(tmp_path):
    config = configuracao.carregar(tmp_path / "config.toml")

    assert config.modelo == configuracao.MODELO_PADRAO
    assert config.pasta_de_modelos == Path("~/.cache/huggingface/hub").expanduser()
    assert config.ocioso_min == 30
    assert config.extensao_id is None
    assert config.ffmpeg.is_absolute()


def test_le_todos_os_campos():
    config = configuracao.ler_texto(
        f"""
        modelo = "mlx-community/whisper-medium-mlx"
        pasta_de_modelos = "~/modelos"
        ffmpeg = '{FFMPEG_ABSOLUTO}'
        extensao_id = "{ID_VALIDO}"
        ocioso_min = 10
        """
    )

    assert config.modelo == "mlx-community/whisper-medium-mlx"
    assert config.pasta_de_modelos == Path("~/modelos").expanduser()
    assert config.ffmpeg == Path(FFMPEG_ABSOLUTO)
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
        # Relativo à pasta corrente da unidade C:, e não absoluto, nas duas plataformas.
        ('ffmpeg = "C:ffmpeg.exe"', "ffmpeg"),
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
        ffmpeg=Path(OUTRO_FFMPEG_ABSOLUTO),
        extensao_id=ID_VALIDO,
        ocioso_min=45,
    )
    caminho = tmp_path / "config.toml"

    configuracao.gravar(original, caminho)

    assert configuracao.carregar(caminho) == original


def test_ocioso_min_aceita_o_teto():
    assert configuracao.ler_texto(f"ocioso_min = {configuracao.OCIOSO_MIN_MAXIMO}").ocioso_min == 10080


@pytest.mark.skipif(WINDOWS, reason="padrões do macOS")
def test_padroes_do_macos():
    assert configuracao.MODELO_PADRAO == "mlx-community/whisper-large-v3-turbo"
    assert configuracao.candidatos_do_ffmpeg() == (Path("/opt/homebrew/bin/ffmpeg"), Path("/usr/local/bin/ffmpeg"))


@pytest.mark.skipif(not WINDOWS, reason="padrões do Windows: modelo do CTranslate2 e FFmpeg do winget")
def test_padroes_do_windows(tmp_path, monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))

    assert configuracao.MODELO_PADRAO == "mobiuslabsgmbh/faster-whisper-large-v3-turbo"
    # Lido na hora da chamada: a variável do perfil vale, e não a do início dos testes.
    assert configuracao.candidatos_do_ffmpeg() == (tmp_path / "Microsoft" / "WinGet" / "Links" / "ffmpeg.exe",)


@pytest.mark.skipif(not WINDOWS, reason="padrões do Windows: FFmpeg do winget fora do PATH")
def test_ffmpeg_do_winget_fora_do_path(tmp_path, monkeypatch):
    links = tmp_path / "Microsoft" / "WinGet" / "Links"
    links.mkdir(parents=True)
    (links / "ffmpeg.exe").write_bytes(b"")
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    monkeypatch.setenv("PATH", str(tmp_path / "vazio"))

    assert configuracao.ffmpeg_detectado() == links / "ffmpeg.exe"
