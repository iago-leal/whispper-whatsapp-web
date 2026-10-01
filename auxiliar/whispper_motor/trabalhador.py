"""Trabalhador: processo separado que carrega o modelo e transcreve (DT-02).

O processo principal fala com o trabalhador por um `Pipe` do multiprocessing,
no modo spawn. Encerrar o trabalhador é a única forma de interromper um cálculo
em andamento na GPU e de devolver toda a memória do modelo.

Mensagens do trabalhador: ("carregado", ms), ("falha_no_carregamento", motivo),
("ok", texto, idioma, recarregou) e ("falha", motivo). Mensagens do principal:
("transcrever", amostras) e ("parar",).

O trabalhador vigia o principal e sai quando ele morre, ainda que por SIGKILL, para
não ficar órfão com o modelo na memória.
"""

from __future__ import annotations

import multiprocessing
import multiprocessing.connection
import os
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np

from . import audio

LIMIAR_SEM_FALA = 0.6
# Bem abaixo dos 2 s que o Chrome dá ao host depois de fechar a porta: vencidos, ele mata o
# host, e o trabalhador ocupado só sairia pela vigia do principal. O ocioso atende ao
# "parar" em cerca de 0,2 s.
ESPERA_AO_ENCERRAR_S = 0.5
# Intervalo da segunda conferência da vigia, a troca de pai; a primeira, o sentinela, é imediata.
INTERVALO_DA_VIGIA_S = 1.0


class PrazoExcedido(Exception):
    pass


class TrabalhadorCaiu(Exception):
    pass


class FalhaDoWhisper(Exception):
    """O Whisper falhou num áudio, e o trabalhador, vivo, segue apto para o pedido seguinte."""


@dataclass(frozen=True)
class Carregamento:
    ok: bool
    motivo: str | None
    duracao_ms: int


@dataclass(frozen=True)
class Transcricao:
    texto: str
    idioma: str
    recarregou: bool = False


class TrabalhadorMlx:
    def __init__(self, caminho_modelo: Path, alvo: Callable | None = None):
        self.caminho_modelo = Path(caminho_modelo)
        self._alvo = alvo or laco_mlx
        self._processo: multiprocessing.process.BaseProcess | None = None
        self._conexao = None

    @property
    def pid(self) -> int | None:
        return self._processo.pid if self._processo else None

    def iniciar(self) -> None:
        contexto = multiprocessing.get_context("spawn")
        local, remota = contexto.Pipe()
        self._processo = contexto.Process(
            target=_executar, args=(self._alvo, remota, str(self.caminho_modelo)), daemon=True
        )
        self._processo.start()
        remota.close()
        self._conexao = local

    def aguardar_carregamento(self, timeout: float | None = None) -> Carregamento:
        try:
            mensagem = self._receber(timeout)
        except PrazoExcedido:
            return Carregamento(False, "falha ao carregar o modelo", 0)
        except TrabalhadorCaiu:
            return Carregamento(False, "falha ao carregar o modelo", 0)
        if mensagem[0] == "carregado":
            return Carregamento(True, None, int(mensagem[1]))
        return Carregamento(False, str(mensagem[1]), 0)

    def transcrever(self, amostras, prazo_s: float) -> Transcricao:
        conexao = self._conexao
        if conexao is None:
            raise TrabalhadorCaiu()
        try:
            conexao.send(("transcrever", amostras))
        except (OSError, EOFError) as erro:
            raise TrabalhadorCaiu() from erro
        mensagem = self._receber(prazo_s)
        if mensagem[0] == "ok":
            return Transcricao(mensagem[1], mensagem[2], bool(mensagem[3]))
        if mensagem[0] == "falha":
            # Resposta de um trabalhador vivo: a falha é do áudio, não do processo.
            raise FalhaDoWhisper(str(mensagem[1]))
        raise TrabalhadorCaiu()

    def encerrar(self) -> None:
        processo, conexao = self._processo, self._conexao
        self._processo = self._conexao = None
        if conexao is not None:
            try:
                conexao.send(("parar",))
            except (OSError, EOFError):
                pass
        if processo is not None:
            processo.join(ESPERA_AO_ENCERRAR_S)
            if processo.is_alive():
                processo.kill()
                processo.join()
        if conexao is not None:
            conexao.close()

    def _receber(self, timeout: float | None):
        # Uma leitura só do atributo: encerrar(), em outra linha, pode anulá-lo a qualquer momento.
        conexao = self._conexao
        if conexao is None:
            raise TrabalhadorCaiu()
        try:
            if not conexao.poll(timeout):
                raise PrazoExcedido()
            return conexao.recv()
        except (OSError, EOFError) as erro:
            raise TrabalhadorCaiu() from erro


def _executar(alvo: Callable, conexao, caminho_modelo: str) -> None:
    # A saída padrão do trabalhador nunca pode alcançar o protocolo (DT-04): o
    # descritor 1 passa a apontar para a saída de erro, e a entrada, que ainda
    # seria o pipe do Chrome, para /dev/null.
    os.dup2(2, 1)
    nulo = os.open(os.devnull, os.O_RDONLY)
    os.dup2(nulo, 0)
    os.close(nulo)
    _vigiar_principal()
    alvo(conexao, caminho_modelo)


def _vigiar_principal() -> None:
    """Encerra o trabalhador quando o principal morre, inclusive por SIGKILL ou falta de memória.

    Sem a vigia, o trabalhador ocupado só perceberia a morte ao responder pelo pipe, e o
    travado ficaria órfão para sempre, com o modelo na memória. O sentinela do principal,
    ponta de leitura de um pipe cuja escrita só o principal mantém aberta, fica legível
    quando ele morre; a troca de pai confere o mesmo por outro caminho. A saída é por
    `os._exit`, que não depende da linha principal, presa no cálculo. O MLX solta a GIL
    durante o cálculo na GPU, e a vigia roda nesse meio-tempo.
    """
    principal = multiprocessing.parent_process()
    if principal is None:
        return
    pai = os.getppid()

    def vigiar() -> None:
        while not multiprocessing.connection.wait([principal.sentinel], timeout=INTERVALO_DA_VIGIA_S):
            if os.getppid() != pai:
                break
        os._exit(1)

    threading.Thread(target=vigiar, name="vigia-do-principal", daemon=True).start()


def laco_mlx(conexao, caminho_modelo: str) -> None:
    inicio = time.monotonic()
    try:
        import mlx.core as mx
        from mlx_whisper.transcribe import ModelHolder, transcribe
    except ImportError:
        conexao.send(("falha_no_carregamento", "mlx-whisper ausente"))
        return
    try:
        modelo = ModelHolder.get_model(caminho_modelo, mx.float16)
        memoria = instalar_memoria_do_codificador(modelo)
        # Aquecimento: a primeira execução compila os núcleos do Metal; pagá-la
        # durante o "carregando" poupa o primeiro pedido real.
        aquecimento = np.zeros(audio.TAXA, dtype=np.float32)
        transcribe(aquecimento, path_or_hf_repo=caminho_modelo, verbose=None, fp16=True,
                   language=detectar_idioma(modelo, memoria, aquecimento))
        memoria.esquecer()
    except Exception as erro:  # noqa: BLE001 - qualquer falha vira motivo do protocolo
        conexao.send(("falha_no_carregamento", motivo_de_carregamento(erro)))
        return
    conexao.send(("carregado", round((time.monotonic() - inicio) * 1000)))

    while True:
        mensagem = conexao.recv()
        if mensagem[0] == "parar":
            return
        amostras = mensagem[1]
        modelo_antes = ModelHolder.model
        try:
            resultado = transcribe(
                amostras,
                path_or_hf_repo=caminho_modelo,
                verbose=None,
                condition_on_previous_text=False,
                fp16=True,
                language=detectar_idioma(modelo, memoria, amostras),
            )
        except Exception:  # noqa: BLE001
            conexao.send(("falha", "falha do Whisper"))
            continue
        finally:
            memoria.esquecer()
        texto = texto_com_fala(resultado, amostras)
        idioma = (resultado.get("language") or "") if texto else ""
        conexao.send(("ok", texto, idioma, ModelHolder.model is not modelo_antes))


def instalar_memoria_do_codificador(modelo):
    """Troca o codificador do modelo por um que lembra a última janela codificada.

    O `transcribe` do mlx-whisper codifica a primeira janela de 30 s duas vezes,
    uma para detectar o idioma e outra para transcrever, e a codificação domina o
    tempo de um áudio curto. Com a memória, `detectar_idioma` codifica a janela
    exatamente como o laço do `transcribe` a montará, e o laço reaproveita o
    resultado. Se uma versão futura montar a janela de outro jeito, a memória
    apenas deixa de acertar, sem mudar o resultado.
    """
    import mlx.core as mx
    import mlx.nn as nn

    class CodificadorComMemoria(nn.Module):
        def __init__(self, original):
            super().__init__()
            self.original = original
            self._entrada = None
            self._saida = None

        def __call__(self, mel):
            entrada = self._entrada
            if entrada is not None and mel.shape == entrada.shape and mel.dtype == entrada.dtype:
                if mx.array_equal(mel, entrada).item():
                    return self._saida
            return self.original(mel)

        def lembrar(self, mel):
            self._entrada, self._saida = mel, self.original(mel)
            return self._saida

        def esquecer(self):
            self._entrada = self._saida = None

    memoria = CodificadorComMemoria(modelo.encoder)
    modelo.encoder = memoria
    return memoria


def detectar_idioma(modelo, memoria, amostras) -> str:
    # Um modelo só em inglês (.en) não tem os tokens de idioma, e o detect_language falharia;
    # o `transcribe` do mlx-whisper faz o mesmo desvio.
    if not modelo.is_multilingual:
        return "en"
    import mlx.core as mx
    from mlx_whisper.audio import N_FRAMES, N_SAMPLES, log_mel_spectrogram, pad_or_trim

    # Mesma montagem da primeira janela no laço do `transcribe`: só os quadros de
    # conteúdo, completados com zeros até 30 s.
    mel = log_mel_spectrogram(amostras, n_mels=modelo.dims.n_mels, padding=N_SAMPLES)
    quadros_de_conteudo = mel.shape[-2] - N_FRAMES
    janela = pad_or_trim(mel[: min(N_FRAMES, quadros_de_conteudo)], N_FRAMES, axis=-2).astype(mx.float16)
    caracteristicas = memoria.lembrar(janela[None])
    _, probabilidades = modelo.detect_language(caracteristicas[0])
    return max(probabilidades, key=probabilidades.get)


def texto_com_fala(resultado: dict, amostras) -> str:
    """Junta os segmentos com fala, descartando os inventados sobre silêncio ou ruído.

    O `no_speech_prob` do large-v3-turbo fica perto de zero mesmo em silêncio
    digital, por isso o segmento também é descartado quando o trecho de áudio
    que ele cobre não tem energia na faixa da voz (DT-14).
    """
    trechos = []
    for segmento in resultado.get("segments", []):
        if segmento.get("no_speech_prob", 0.0) > LIMIAR_SEM_FALA:
            continue
        inicio = int(segmento.get("start", 0.0) * audio.TAXA)
        fim = int(segmento.get("end", 0.0) * audio.TAXA)
        if fim > inicio and not audio.tem_fala(amostras[inicio:fim]):
            continue
        trechos.append(segmento["text"])
    return "".join(trechos).strip()


def motivo_de_carregamento(erro: BaseException) -> str:
    if isinstance(erro, MemoryError):
        return "memória insuficiente para o modelo"
    texto = str(erro).lower()
    if "memory" in texto or "malloc" in texto:
        return "memória insuficiente para o modelo"
    if isinstance(erro, FileNotFoundError):
        return "modelo não encontrado"
    return "falha ao carregar o modelo"
