"""Registros locais do host: desempenho em TSV (DT-19) e diagnóstico (DT-05).

Nenhum dos dois guarda texto transcrito, trecho de áudio nem conteúdo de
mensagem do protocolo: o desempenho só aceita números e o resultado, e o
diagnóstico só mensagens fixas do código e o nome do tipo de exceção.
"""

from __future__ import annotations

import os
import sys
import threading
from datetime import datetime
from pathlib import Path

CABECALHO = ("instante", "evento", "duracao_audio_seg", "processamento_ms", "resultado")
LIMITE_DE_LINHAS = 1000

DIAGNOSTICO_LIMITE = 1024 * 1024
DIAGNOSTICO_MANTER = 512 * 1024

_trava_do_diagnostico = threading.Lock()


def _instante() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _campo(valor: str) -> str:
    return " ".join(str(valor).split())


class RegistroDeDesempenho:
    """Uma linha por pedido, carregamento ou descarregamento do modelo (RF-17).

    Ao passar de `limite` linhas de dados, o arquivo é reescrito com as mais
    recentes. Falha de escrita não interrompe o host: vai para o diagnóstico.
    """

    def __init__(self, caminho: Path, limite: int = LIMITE_DE_LINHAS):
        self.caminho = Path(caminho)
        self.limite = limite
        self._trava = threading.Lock()
        self._linhas: int | None = None

    def pedido(self, duracao_audio_seg: float, processamento_ms: float, resultado: str) -> None:
        self._acrescentar("pedido", f"{duracao_audio_seg:.1f}", str(round(processamento_ms)), resultado)

    def carregamento(self, duracao_ms: float, resultado: str) -> None:
        self._acrescentar("carregamento", "", str(round(duracao_ms)), resultado)

    def descarregamento(self, resultado: str = "ok") -> None:
        self._acrescentar("descarregamento", "", "", resultado)

    def _acrescentar(self, evento: str, duracao: str, processamento: str, resultado: str) -> None:
        linha = "\t".join((_instante(), evento, duracao, processamento, _campo(resultado))) + "\n"
        with self._trava:
            try:
                if self._linhas is None:
                    self._linhas = self._preparar()
                with self.caminho.open("a", encoding="utf-8", newline="") as arquivo:
                    arquivo.write(linha)
                self._linhas += 1
                if self._linhas > self.limite:
                    # A mesma conferência da abertura: o arquivo pode ter sido trocado por
                    # outro, ilegível, com o host em execução.
                    self._linhas = self._preparar()
            except (OSError, ValueError) as erro:
                self._linhas = None
                diagnostico("falha ao gravar o registro de desempenho", "erro", erro)

    def _preparar(self) -> int:
        """Confere o arquivo existente e devolve quantas linhas de dados ele tem."""
        try:
            texto = self.caminho.read_text(encoding="utf-8")
        except (FileNotFoundError, UnicodeDecodeError):
            texto = ""
        cabecalho, *dados = texto.splitlines() or [""]
        if tuple(cabecalho.split("\t")) != CABECALHO:
            dados = []  # arquivo ausente ou alheio: recomeça do cabeçalho
        elif texto.endswith("\n") and len(dados) <= self.limite:
            return len(dados)
        return self._reescrever(dados)

    def _reescrever(self, dados: list[str]) -> int:
        mantidos = dados[-self.limite :] if self.limite > 0 else []
        temporario = self.caminho.with_name(self.caminho.name + ".tmp")
        temporario.write_text("".join(linha + "\n" for linha in ("\t".join(CABECALHO), *mantidos)), encoding="utf-8")
        temporario.replace(self.caminho)
        return len(mantidos)


def truncar_diagnostico(caminho: Path) -> None:
    """Acima de 1 MiB, mantém só os últimos 512 KiB, a partir de uma linha inteira.

    A poda é feita no próprio arquivo, e não por substituição, para que outro host
    que o tenha aberto em modo de acréscimo continue escrevendo nele.
    """
    caminho = Path(caminho)
    try:
        tamanho = caminho.stat().st_size
    except FileNotFoundError:
        return
    if tamanho <= DIAGNOSTICO_LIMITE:
        return
    with caminho.open("r+b") as arquivo:
        arquivo.seek(tamanho - DIAGNOSTICO_MANTER)
        final = arquivo.read()
        quebra = final.find(b"\n")
        if 0 <= quebra < len(final) - 1:
            final = final[quebra + 1 :]
        arquivo.seek(0)
        arquivo.write(final)
        arquivo.truncate()


def abrir_diagnostico(caminho: Path) -> int:
    """Poda o diagnóstico e o abre para acréscimo; o host aponta a saída de erro para ele."""
    truncar_diagnostico(caminho)
    return os.open(caminho, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)


def diagnostico(mensagem: str, nivel: str = "info", erro: BaseException | None = None) -> None:
    """Escreve um evento na saída de erro, que no host é o `diagnostico.log`.

    `mensagem` deve ser fixa no código. Da exceção só entra o nome do tipo, porque
    a mensagem dela pode carregar conteúdo do pedido.
    """
    texto = _campo(mensagem)
    if erro is not None:
        texto += f": {type(erro).__name__}"
    with _trava_do_diagnostico:
        try:
            sys.stderr.write(f"{_instante()} {nivel} {texto}\n")
            sys.stderr.flush()
        except (OSError, ValueError, AttributeError):
            pass
