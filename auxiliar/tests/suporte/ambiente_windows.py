"""Ambiente de instalação do Windows para os testes: perfil, pasta local e registro próprios (D-20).

O registro dos testes fica em `HKCU\\Software\\whispper-motor-testes`, e não nas chaves
do Chrome e do Brave, e é apagado ao fim de cada teste. Fora do Windows, a fixture
ignora o teste, com o motivo.
"""

import sys
import uuid
from collections.abc import Iterator
from dataclasses import dataclass, replace
from pathlib import Path

import pytest

from . import executavel_falso
from .cache import criar_snapshot

WINDOWS = sys.platform == "win32"
RAIZ_DOS_TESTES = r"Software\whispper-motor-testes"
MODELO_CT2 = "mobiuslabsgmbh/faster-whisper-large-v3-turbo"
ARQUIVOS_CT2 = ("config.json", "model.bin", "tokenizer.json", "vocabulary.json", "preprocessor_config.json")
MOTIVO = "exige o Windows: registro, %LOCALAPPDATA% e lançador .bat"


@dataclass(frozen=True)
class AmbienteWindows:
    perfil: Path
    pasta_local: Path
    pasta_de_modelos: Path
    ffmpeg: Path
    raiz_do_registro: str

    @property
    def pasta_app(self) -> Path:
        return self.pasta_local / "whispper-motor"


@pytest.fixture
def ambiente_windows(tmp_path, monkeypatch) -> Iterator[AmbienteWindows]:
    if not WINDOWS:
        pytest.skip(MOTIVO)
    perfil = tmp_path / "perfil"
    pasta_local = perfil / "AppData" / "Local"
    pasta_local.mkdir(parents=True)
    monkeypatch.setenv("USERPROFILE", str(perfil))
    monkeypatch.setenv("LOCALAPPDATA", str(pasta_local))
    monkeypatch.delenv("HF_HUB_CACHE", raising=False)
    monkeypatch.delenv("HF_HOME", raising=False)
    cache = perfil / ".cache" / "huggingface" / "hub"
    criar_snapshot(cache, MODELO_CT2, arquivos=ARQUIVOS_CT2)
    (tmp_path / "bin").mkdir()
    ffmpeg = executavel_falso.criar(tmp_path / "bin" / "ffmpeg", "")
    # Uma subchave por teste: dois testes nunca enxergam o registro um do outro.
    raiz = rf"{RAIZ_DOS_TESTES}\{uuid.uuid4().hex}"
    try:
        yield AmbienteWindows(perfil, pasta_local, cache, ffmpeg, raiz)
    finally:
        apagar_chave(raiz)


def ambiente_de_instalacao(ambiente: AmbienteWindows, **alteracoes):
    """O `Ambiente` da instalação no perfil de teste, com o Python destes testes e sem placa."""
    from whispper_motor.instalacao import Ambiente

    base = Ambiente(
        home=ambiente.perfil,
        python=Path(sys.executable),
        versao_python=(sys.version_info.major, sys.version_info.minor),
        sistema="Windows",
        arquitetura="AMD64",
        ffmpeg=ambiente.ffmpeg,
        mlx_whisper=False,
        pasta_de_modelos=ambiente.pasta_de_modelos,
        faster_whisper=True,
        raiz_do_registro=ambiente.raiz_do_registro,
    )
    return replace(base, **alteracoes)


def ler_valor_padrao(caminho: str) -> str | None:
    """O valor padrão da chave `HKCU\\<caminho>`, ou None se ela não existir."""
    import winreg

    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, caminho) as chave:
            return winreg.QueryValue(chave, None)
    except FileNotFoundError:
        return None


def apagar_chave(caminho: str) -> None:
    """Apaga `HKCU\\<caminho>` com as subchaves; ausente, não faz nada."""
    import winreg

    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, caminho) as chave:
            subchaves = []
            while True:
                try:
                    subchaves.append(winreg.EnumKey(chave, len(subchaves)))
                except OSError:
                    break
    except FileNotFoundError:
        return
    for subchave in subchaves:
        apagar_chave(rf"{caminho}\{subchave}")
    winreg.DeleteKey(winreg.HKEY_CURRENT_USER, caminho)
