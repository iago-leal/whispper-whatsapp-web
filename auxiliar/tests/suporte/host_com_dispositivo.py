"""Host completo cujo trabalhador simulado carrega no processador, para o diagnóstico do Windows."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from tests.suporte.trabalhador_simulado import laco_com_dispositivo  # noqa: E402
from whispper_motor.__main__ import principal  # noqa: E402
from whispper_motor.trabalhador import TrabalhadorEmProcesso  # noqa: E402


def fabrica(caminho_modelo):
    # Já depois da troca de descritores, a linha vai para o diagnostico.log, e não para a
    # saída do protocolo: o teste confere ali os argumentos com que o host foi lançado.
    print("argumentos do host:", *sys.argv[1:], flush=True)
    return TrabalhadorEmProcesso(caminho_modelo, alvo=laco_com_dispositivo)


if __name__ == "__main__":
    sys.exit(principal(fabrica_trabalhador=fabrica))
