"""Processo principal do host: estados, fila de pedidos e despacho ao trabalhador (DT-02).

`receber` roda na linha que lê a entrada e responde de imediato à verificação e às
mensagens recusadas; os pedidos de transcrição vão para a fila, atendida um por vez,
na ordem de chegada, pelo despachante, a única linha que carrega, usa e descarta o
trabalhador. As duas linhas escrevem na saída sob a mesma trava.

Estados internos: carregando, pronto, erro e ocioso. O ocioso (DT-16) nunca chega ao
protocolo: a verificação ou o pedido seguinte o trocam por carregando antes de responder.
"""

from __future__ import annotations

import functools
import os
import threading
import time
from collections import deque
from pathlib import Path
from typing import Callable, Protocol

from . import VERSAO_APP, audio, modelos, protocolo
from .configuracao import Configuracao
from .modelos import ModeloNaoEncontrado
from .protocolo import PedidoTranscrever, PedidoVerificar, Recusa
from .registro import RegistroDeDesempenho, diagnostico
from .trabalhador import Carregamento, FalhaDoWhisper, PrazoExcedido, TrabalhadorCaiu, Transcricao

CARREGANDO = "carregando"
PRONTO = "pronto"
ERRO = "erro"
OCIOSO = "ocioso"

PRAZO_DE_CARREGAMENTO_S = 180.0
ESPERA_DO_DESPACHANTE_S = 5.0
# Teto de cada espera pela ociosidade; o laço recalcula o restante a cada volta. Sem ele, uma
# ociosidade de séculos passaria do limite da trava e mataria o despachante.
ESPERA_MAXIMA_DE_OCIOSIDADE_S = 3600.0


class Trabalhador(Protocol):
    def iniciar(self) -> None: ...

    def aguardar_carregamento(self, timeout: float | None = None) -> Carregamento: ...

    def transcrever(self, amostras, prazo_s: float) -> Transcricao: ...

    def encerrar(self) -> None: ...


def prazo_padrao(duracao_seg: float) -> float:
    """O maior entre 60 s e 30 s por minuto de áudio (RF-24, DT-15)."""
    return max(60, 30 * duracao_seg / 60)


def resolver_modelo_da_configuracao(config: Configuracao) -> Path:
    return modelos.resolver(config.modelo, config.pasta_de_modelos)


class _Falha(Exception):
    def __init__(self, motivo: str, codigo: str = protocolo.FALHA_NA_TRANSCRICAO, recriar: bool = False):
        super().__init__(motivo)
        self.motivo = motivo
        self.codigo = codigo
        self.recriar = recriar


class Servidor:
    def __init__(
        self,
        config: Configuracao,
        fabrica: Callable[[Path], Trabalhador],
        enviar: Callable[[dict], None],
        registro: RegistroDeDesempenho,
        pasta_temporaria: Path,
        *,
        resolver_modelo: Callable[[Configuracao], Path] = resolver_modelo_da_configuracao,
        prazo: Callable[[float], float] = prazo_padrao,
        ocioso_s: float | None = None,
        erro_inicial: str | None = None,
        prazo_de_carregamento_s: float = PRAZO_DE_CARREGAMENTO_S,
    ):
        self._config = config
        self._fabrica = fabrica
        self._saida = enviar
        self._registro = registro
        self._pasta_temporaria = Path(pasta_temporaria)
        self._resolver_modelo = resolver_modelo
        self._prazo = prazo
        self._ocioso_s = ocioso_s if ocioso_s is not None else config.ocioso_min * 60
        self._erro_inicial = erro_inicial
        self._prazo_de_carregamento_s = prazo_de_carregamento_s

        self._trava = threading.Condition()
        self._trava_da_saida = threading.Lock()
        self._estado = OCIOSO
        self._motivo: str | None = None
        self._fila: deque[PedidoTranscrever] = deque()
        self._pendentes: set[str] = set()
        self._trabalhador: Trabalhador | None = None
        self._caminho_modelo: Path | None = None
        self._ultimo_uso = time.monotonic()
        self._encerrando = False
        self._despachante: threading.Thread | None = None
        self._cancelador = audio.Cancelador()

    def iniciar(self) -> None:
        """Confere os pré-requisitos e começa o carregamento sem esperar pedido (RF-06).

        As conferências são síncronas: a primeira verificação já encontra o erro.
        """
        motivo = self._erro_inicial or self._conferir_ffmpeg()
        if motivo is None:
            try:
                self._caminho_modelo = self._resolver_modelo(self._config)
            except ModeloNaoEncontrado as erro:
                motivo = str(erro)
        with self._trava:
            if motivo is None:
                self._mudar_estado(CARREGANDO)
            else:
                self._falhar(motivo)
        self._despachante = threading.Thread(target=self._despachar, name="despachante", daemon=True)
        self._despachante.start()

    def receber(self, bruto: bytes) -> None:
        pedido = protocolo.interpretar(bruto)
        if isinstance(pedido, Recusa):
            self._enviar(pedido.resposta)
        elif isinstance(pedido, PedidoVerificar):
            with self._trava:
                self._despertar()
                resposta = protocolo.resposta_estado(VERSAO_APP, self._config.modelo, self._estado, self._motivo)
            self._enviar(resposta)
        else:
            with self._trava:
                if self._encerrando:
                    return
                duplicado = pedido.id_pedido in self._pendentes
                if not duplicado:
                    self._pendentes.add(pedido.id_pedido)
                    self._fila.append(pedido)
                    self._despertar()
                    self._trava.notify_all()
            if duplicado:
                # Sem o idPedido, para que a extensão não atribua a recusa ao pedido pendente.
                self._enviar(protocolo.resposta_invalida("idPedido duplicado"))

    def aguardar_estado_estavel(self, timeout: float | None = None) -> str:
        with self._trava:
            if not self._trava.wait_for(lambda: self._estado != CARREGANDO, timeout):
                raise TimeoutError("o motor não saiu do estado carregando no prazo")
            return self._estado

    def encerrar(self) -> None:
        """Descarta a fila e interrompe a decodificação, o carregamento ou a transcrição em curso."""
        with self._trava:
            if self._encerrando:
                return
            self._encerrando = True
            self._fila.clear()
            trabalhador, self._trabalhador = self._trabalhador, None
            self._trava.notify_all()
        self._cancelador.cancelar()
        if trabalhador is not None:
            trabalhador.encerrar()
        if self._despachante is not None:
            self._despachante.join(ESPERA_DO_DESPACHANTE_S)

    # Despachante

    def _despachar(self) -> None:
        try:
            while True:
                try:
                    tarefa = self._proxima_tarefa()
                except Exception as erro:  # noqa: BLE001 - morta a linha, o host seguiria "pronto" sem atender a fila
                    if self._encerrando:
                        return
                    diagnostico("falha inesperada no despachante", "erro", erro)
                    # Em erro, a fila segue atendida, com MOTOR_INDISPONIVEL.
                    self._indisponibilizar("falha ao carregar o modelo")
                    continue
                if tarefa is None:
                    return
                try:
                    tarefa()
                except Exception as erro:  # noqa: BLE001 - o despachante não pode morrer
                    if not self._encerrando:
                        diagnostico("falha inesperada no despachante", "erro", erro)
        finally:
            self._descartar_trabalhador()

    def _proxima_tarefa(self) -> Callable[[], None] | None:
        with self._trava:
            while not self._encerrando:
                if self._fila and self._estado == OCIOSO:
                    self._mudar_estado(CARREGANDO)
                if self._estado == CARREGANDO:
                    return self._carregar
                if self._fila:
                    return functools.partial(self._atender, self._fila.popleft())
                if self._estado == PRONTO:
                    restante = self._ultimo_uso + self._ocioso_s - time.monotonic()
                    if restante <= 0:
                        self._mudar_estado(OCIOSO)
                        return self._descarregar
                    self._trava.wait(min(restante, ESPERA_MAXIMA_DE_OCIOSIDADE_S))
                else:
                    self._trava.wait()
            return None

    def _carregar(self) -> None:
        try:
            trabalhador = self._fabrica(self._caminho_modelo)
            trabalhador.iniciar()
            with self._trava:
                aceito = not self._encerrando
                if aceito:
                    self._trabalhador = trabalhador
            if not aceito:
                trabalhador.encerrar()
                return
            carregamento = trabalhador.aguardar_carregamento(timeout=self._prazo_de_carregamento_s)
        except Exception as erro:  # noqa: BLE001 - sem isto, o estado ficaria em carregando e o laço recriaria o trabalhador sem fim
            if self._encerrando:
                return
            diagnostico("falha ao iniciar o trabalhador", "erro", erro)
            carregamento = Carregamento(False, "falha ao carregar o modelo", 0)
        self._concluir_carregamento(carregamento)

    def _concluir_carregamento(self, carregamento: Carregamento) -> None:
        if self._encerrando:
            return
        motivo = None if carregamento.ok else (carregamento.motivo or "falha ao carregar o modelo")
        # O registro precede a troca de estado, para que quem espera o "pronto" já o encontre.
        self._registrar(self._registro.carregamento, carregamento.duracao_ms, motivo or "ok")
        if motivo is not None:
            self._descartar_trabalhador()
        with self._trava:
            if self._encerrando:
                return
            if motivo is None:
                self._ultimo_uso = time.monotonic()
                self._mudar_estado(PRONTO)
            else:
                self._falhar(motivo)

    def _descarregar(self) -> None:
        self._descartar_trabalhador()
        self._registrar(self._registro.descarregamento)
        diagnostico("modelo descarregado por ociosidade")

    def _atender(self, pedido: PedidoTranscrever) -> None:
        inicio = time.monotonic()
        duracao_seg = 0.0
        recriar = False
        velho = None
        try:
            with self._trava:
                estado, motivo, trabalhador = self._estado, self._motivo, self._trabalhador
            if estado == ERRO:
                raise _Falha(motivo, protocolo.MOTOR_INDISPONIVEL)
            decodificado = self._decodificar(pedido)
            duracao_seg = decodificado.duracao_seg
            texto = idioma = ""
            # A porta de energia barra silêncio e ruído antes do modelo, que inventaria frases (DT-14).
            if audio.tem_fala(decodificado.amostras):
                transcricao = self._transcrever(trabalhador, decodificado)
                texto, idioma = transcricao.texto, transcricao.idioma
            resposta = protocolo.resposta_resultado(pedido.id_pedido, texto, idioma, duracao_seg, _ms_desde(inicio))
            try:
                protocolo.serializar(resposta)
            except protocolo.MensagemGrandeDemais:
                raise _Falha("texto maior que o limite") from None
            resultado = "ok"
        except _Falha as falha:
            resposta = protocolo.resposta_erro(pedido.id_pedido, falha.codigo, falha.motivo)
            resultado = falha.codigo
            recriar = falha.recriar
        except Exception as erro:  # noqa: BLE001 - o pedido sempre recebe resposta
            if self._encerrando:
                return
            diagnostico("falha inesperada ao atender o pedido", "erro", erro)
            resposta = protocolo.resposta_erro(pedido.id_pedido, protocolo.FALHA_NA_TRANSCRICAO, "falha do Whisper")
            resultado = protocolo.FALHA_NA_TRANSCRICAO
            recriar = True
        if self._encerrando:
            return

        with self._trava:
            self._pendentes.discard(pedido.id_pedido)
            self._ultimo_uso = time.monotonic()
            if recriar:
                # O estado passa a carregando antes da resposta, para que a verificação
                # seguinte da extensão já veja o trabalhador novo a caminho (DT-15).
                velho, self._trabalhador = self._trabalhador, None
                if self._estado == PRONTO:
                    self._mudar_estado(CARREGANDO)
        self._registrar(self._registro.pedido, duracao_seg, _ms_desde(inicio), resultado)
        self._enviar(resposta)
        if velho is not None:
            velho.encerrar()

    def _decodificar(self, pedido: PedidoTranscrever) -> audio.AudioDecodificado:
        try:
            return audio.decodificar(
                pedido.audio, pedido.midia, self._config.ffmpeg, self._pasta_temporaria, cancelador=self._cancelador
            )
        except audio.ErroDeAudio as erro:
            if erro.motivo == audio.FFMPEG_AUSENTE:
                # A falta do ffmpeg não é deste áudio: o motor fica indisponível, como quando
                # ela é notada ao iniciar, e a extensão reconecta (RN-06).
                self._indisponibilizar(erro.motivo)
                raise _Falha(erro.motivo, protocolo.MOTOR_INDISPONIVEL) from None
            raise _Falha(erro.motivo) from None

    def _transcrever(self, trabalhador: Trabalhador | None, decodificado: audio.AudioDecodificado) -> Transcricao:
        inicio = time.monotonic()
        try:
            if trabalhador is None:
                raise TrabalhadorCaiu()
            transcricao = trabalhador.transcrever(decodificado.amostras, self._prazo(decodificado.duracao_seg))
        except PrazoExcedido:
            diagnostico("trabalhador encerrado por prazo", "aviso")
            raise _Falha("prazo excedido", recriar=True) from None
        except FalhaDoWhisper:
            # O trabalhador respondeu e segue vivo: recriá-lo custaria a recarga do modelo à toa.
            diagnostico("o Whisper falhou num áudio", "aviso")
            raise _Falha("falha do Whisper") from None
        except TrabalhadorCaiu:
            if not self._encerrando:
                diagnostico("trabalhador caiu durante a transcrição", "erro")
            raise _Falha("falha do Whisper", recriar=True) from None
        if transcricao.recarregou:
            diagnostico("o trabalhador recarregou o modelo durante a transcrição", "aviso")
            self._registrar(self._registro.carregamento, _ms_desde(inicio), "ok")
        return transcricao

    # Apoio

    def _conferir_ffmpeg(self) -> str | None:
        ffmpeg = Path(self._config.ffmpeg)
        if ffmpeg.is_file() and os.access(ffmpeg, os.X_OK):
            return None
        return "ffmpeg ausente"

    def _descartar_trabalhador(self) -> None:
        with self._trava:
            trabalhador, self._trabalhador = self._trabalhador, None
        if trabalhador is not None:
            trabalhador.encerrar()

    def _despertar(self) -> None:
        """Com a trava: a mensagem que encontra o modelo descarregado reinicia o carregamento."""
        if self._estado == OCIOSO and not self._encerrando:
            self._mudar_estado(CARREGANDO)

    def _mudar_estado(self, estado: str, motivo: str | None = None) -> None:
        self._estado = estado
        self._motivo = motivo
        self._trava.notify_all()

    def _falhar(self, motivo: str) -> None:
        self._mudar_estado(ERRO, motivo)
        diagnostico(f"motor indisponível: {motivo}", "erro")

    def _indisponibilizar(self, motivo: str) -> None:
        """Sem a trava, na linha do despachante: passa o motor a erro e devolve a memória do modelo."""
        with self._trava:
            if self._estado == ERRO or self._encerrando:
                return
            self._falhar(motivo)
        self._descartar_trabalhador()

    def _registrar(self, evento: Callable[..., None], *argumentos) -> None:
        """Grava no registro de desempenho sem deixar uma falha dele interromper o despachante."""
        try:
            evento(*argumentos)
        except Exception as erro:  # noqa: BLE001 - o registro é acessório; a resposta e o estado, não
            diagnostico("falha ao gravar o registro de desempenho", "erro", erro)

    def _enviar(self, mensagem: dict) -> None:
        with self._trava_da_saida:
            try:
                self._saida(mensagem)
            except (OSError, ValueError, protocolo.MensagemGrandeDemais) as erro:
                # A extensão pode ter fechado a porta; o fim da entrada encerra o host logo depois.
                diagnostico("falha ao escrever na saída do protocolo", "erro", erro)


def _ms_desde(inicio: float) -> float:
    return (time.monotonic() - inicio) * 1000
