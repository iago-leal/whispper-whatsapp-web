"""Host completo cujo trabalhador simulado carrega no processador, para o diagnóstico do Windows."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tests.suporte.trabalhador_simulado import laco_com_dispositivo  # noqa: E402
from whispper_motor.__main__ import principal  # noqa: E402
from whispper_motor.trabalhador import TrabalhadorEmProcesso  # noqa: E402


def fabrica(caminho_modelo):
    return TrabalhadorEmProcesso(caminho_modelo, alvo=laco_com_dispositivo)


if __name__ == "__main__":
    # Vai para o diagnostico.log, pela proteção da saída padrão: o teste confere os argumentos.
    print("argumentos do host:", *sys.argv[1:], flush=True)
    sys.exit(principal(fabrica_trabalhador=fabrica))
