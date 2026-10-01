"""Processo principal mínimo com um trabalhador ocupado, derrubado pelo teste do trabalhador órfão.

Uso: principal_simulado.py <marcador>. Imprime o PID do trabalhador e fica esperando uma
transcrição que o laço travado nunca devolve.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import numpy as np  # noqa: E402

from tests.suporte.trabalhador_simulado import laco_travado  # noqa: E402
from whispper_motor.trabalhador import TrabalhadorMlx  # noqa: E402

if __name__ == "__main__":
    trabalhador = TrabalhadorMlx(Path(sys.argv[1]), alvo=laco_travado)
    trabalhador.iniciar()
    trabalhador.aguardar_carregamento(timeout=30)
    print(trabalhador.pid, flush=True)
    trabalhador.transcrever(np.zeros(16, dtype=np.float32), prazo_s=3600)
