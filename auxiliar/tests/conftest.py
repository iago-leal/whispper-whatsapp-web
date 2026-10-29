import json
import os
from pathlib import Path

import pytest

# Fixture compartilhada pelos testes de instalação, desinstalação e diagnóstico do Windows.
from .suporte.ambiente_windows import ambiente_windows  # noqa: F401

RAIZ = Path(__file__).resolve().parents[2]
AMOSTRAS = RAIZ / "amostras" / "sinteticas"
CONTRATOS = RAIZ / "contratos"


def pytest_collection_modifyitems(config, items):
    if os.environ.get("MOTOR_REAL") == "1":
        return
    pular = pytest.mark.skip(reason="exige o modelo real; rode com MOTOR_REAL=1")
    for item in items:
        if "real" in item.keywords:
            item.add_marker(pular)


@pytest.fixture(scope="session")
def amostras() -> Path:
    return AMOSTRAS


@pytest.fixture(scope="session")
def protocolo_1() -> dict:
    return json.loads((CONTRATOS / "protocolo-1.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="session")
def ffmpeg() -> str:
    # Os mesmos candidatos que o host procura nesta plataforma (RF-15).
    from whispper_motor import configuracao

    caminho = configuracao.ffmpeg_detectado()
    if not caminho.is_file():
        pytest.skip("ffmpeg não encontrado")
    return str(caminho)
