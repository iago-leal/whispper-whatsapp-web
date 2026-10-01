import json
import os
import shutil
from pathlib import Path

import pytest

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
    caminho = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
    if not Path(caminho).exists():
        pytest.skip("ffmpeg não encontrado")
    return caminho
