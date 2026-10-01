"""Laços de trabalhador sem modelo, com o mesmo protocolo do trabalhador real.

O `laco_simulado` escreve de propósito na saída padrão, pela camada do Python e pelo
descritor 1, para provar que essas escritas não chegam ao protocolo do Native Messaging.
"""

import os
import time
from pathlib import Path


def laco_simulado(conexao, caminho_modelo):
    print("ruído do trabalhador na saída padrão", flush=True)
    os.write(1, b"ruido cru do trabalhador no descritor 1\n")
    conexao.send(("carregado", 1))
    while True:
        mensagem = conexao.recv()
        if mensagem[0] == "parar":
            return
        print("ruído do trabalhador durante a transcrição", flush=True)
        conexao.send(("ok", "texto simulado", "pt", False))


def laco_com_falha(conexao, caminho_modelo):
    """Responde ao primeiro áudio como o laço real quando o Whisper falha nele, e atende os seguintes."""
    conexao.send(("carregado", 1))
    falhou = False
    while True:
        mensagem = conexao.recv()
        if mensagem[0] == "parar":
            return
        if falhou:
            conexao.send(("ok", "texto simulado", "pt", False))
        else:
            falhou = True
            conexao.send(("falha", "falha do Whisper"))


def laco_travado(conexao, caminho_modelo):
    """Trava na primeira transcrição; antes, cria o arquivo `caminho_modelo` para avisar que a recebeu."""
    conexao.send(("carregado", 1))
    conexao.recv()
    Path(caminho_modelo).touch()
    time.sleep(3600)
