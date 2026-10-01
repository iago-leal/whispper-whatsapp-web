"""Host completo com trabalhador sem modelo, lançado como processo pelos testes."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tests.suporte.trabalhador_simulado import laco_simulado  # noqa: E402
from whispper_motor.__main__ import principal  # noqa: E402
from whispper_motor.trabalhador import TrabalhadorMlx  # noqa: E402


def fabrica(caminho_modelo):
    print("ruído do processo principal na saída padrão", flush=True)
    return TrabalhadorMlx(caminho_modelo, alvo=laco_simulado)


if __name__ == "__main__":
    sys.exit(principal(fabrica_trabalhador=fabrica))
