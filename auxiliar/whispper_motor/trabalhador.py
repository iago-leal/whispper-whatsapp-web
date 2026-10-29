"""Trabalhador: processo separado que carrega o modelo e transcreve (DT-02).

O processo principal fala com o trabalhador por um `Pipe` do multiprocessing,
no modo spawn. Encerrar o trabalhador é a única forma de interromper um cálculo
em andamento na GPU e de devolver toda a memória do modelo.

Mensagens do trabalhador: ("carregado", ms) ou ("carregado", ms, (linha, nível)), com a
linha do dispositivo para o diagnóstico; ("falha_no_carregamento", motivo);
("ok", texto, idioma, recarregou) e ("falha", motivo). Mensagens do principal:
("transcrever", amostras) e ("parar",).

O laço é o da plataforma: o mlx-whisper no Mac e o faster-whisper, sobre o
CTranslate2, no Windows, na placa de vídeo da NVIDIA ou, na falta dela, no processador.

O trabalhador vigia o principal e sai quando ele morre, ainda que por SIGKILL, para
não ficar órfão com o modelo na memória.
"""

from __future__ import annotations

import multiprocessing
import multiprocessing.connection
import os
import site
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np

from . import audio, plataforma
from .registro import VARIAVEL_DO_DIAGNOSTICO, abrir_para_acrescimo, diagnostico, fluxo_do_diagnostico

LIMIAR_SEM_FALA = 0.6
# Bem abaixo dos 2 s que o Chrome dá ao host depois de fechar a porta: vencidos, ele mata o
# host, e o trabalhador ocupado só sairia pela vigia do principal. O ocioso atende ao
# "parar" em cerca de 0,2 s.
ESPERA_AO_ENCERRAR_S = 0.5
# Intervalo da segunda conferência da vigia, a troca de pai; a primeira, o sentinela, é imediata.
INTERVALO_DA_VIGIA_S = 1.0

# Por que o modelo foi para o processador, numa lista fixa: a linha do diagnóstico nunca
# leva o texto da exceção, que pode citar caminhos e nomes do usuário (D-05).
SEM_PLACA = "sem placa NVIDIA"
SEM_BIBLIOTECAS = "bibliotecas da placa ausentes"
SEM_MEMORIA_NA_PLACA = "memória da placa insuficiente"
FALHA_DA_PLACA = "falha da placa"
MOTIVOS_DO_PROCESSADOR = (SEM_PLACA, SEM_BIBLIOTECAS, SEM_MEMORIA_NA_PLACA, FALHA_DA_PLACA)
# As bibliotecas que o CTranslate2 carrega para a placa, das rodas nvidia-cublas-cu12 e
# nvidia-cudnn-cu12. Conferidas antes: sem uma delas, o cuDNN derruba o processo em vez
# de levantar exceção (D-07).
BIBLIOTECAS_DA_PLACA = ("cublas64_12", "cublasLt64_12", "cudnn64_9", "cudnn_ops64_9", "cudnn_cnn64_9")
# Paridade com o Mac (D-04): busca gulosa, sem o texto do trecho anterior como contexto,
# sem o filtro de voz do faster-whisper, que mudaria o comportamento entre plataformas, e
# com a detecção de idioma na primeira janela.
PARAMETROS_DO_FASTER_WHISPER = {"beam_size": 1, "condition_on_previous_text": False, "vad_filter": False, "language": None}


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


@dataclass(frozen=True)
class ModeloCarregado:
    modelo: object
    dispositivo: str
    linha: str
    nivel: str


class TrabalhadorEmProcesso:
    """O trabalhador num processo separado, com o laço da plataforma ou o `alvo` dado."""

    def __init__(self, caminho_modelo: Path, alvo: Callable | None = None):
        self.caminho_modelo = Path(caminho_modelo)
        self._alvo = alvo or laco_padrao()
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
            if len(mensagem) > 2:
                linha, nivel = mensagem[2]
                diagnostico(linha, nivel)
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
    if plataforma.WINDOWS:
        _desviar_saidas_para_o_diagnostico()
    else:
        os.dup2(2, 1)
    nulo = os.open(os.devnull, os.O_RDONLY)
    os.dup2(nulo, 0)
    os.close(nulo)
    _vigiar_principal()
    alvo(conexao, caminho_modelo)


def _desviar_saidas_para_o_diagnostico() -> None:
    """No Windows, aponta os descritores 1 e 2 para o `diagnostico.log` do host, ou para o nulo.

    O multiprocessing inicia o trabalhador sem herdar as saídas do host, e o que uma
    biblioteca nativa escrevesse se perderia; o Python recria `sys.stdout` e `sys.stderr`
    sobre os descritores novos.
    """
    caminho = os.environ.get(VARIAVEL_DO_DIAGNOSTICO) or os.devnull
    try:
        descritor = abrir_para_acrescimo(caminho)
    except OSError:
        descritor = os.open(os.devnull, os.O_WRONLY)
    os.dup2(descritor, 1)
    os.dup2(descritor, 2)
    os.close(descritor)
    sys.stdout = fluxo_do_diagnostico(1)
    sys.stderr = fluxo_do_diagnostico(2)


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


def laco_padrao() -> Callable:
    """O laço que carrega e transcreve nesta plataforma: o mlx-whisper no Mac, o faster-whisper no Windows."""
    return laco_ct2 if plataforma.WINDOWS else laco_mlx


def laco_ct2(
    conexao,
    caminho_modelo: str,
    *,
    criar: Callable | None = None,
    contar_placas: Callable[[], int] | None = None,
    bibliotecas_presentes: Callable[[], bool] | None = None,
    nucleos: Callable[[], int] | None = None,
) -> None:
    """Carrega e transcreve com o faster-whisper, na placa ou no processador (D-01 a D-07).

    A fábrica do modelo, a contagem de placas, a conferência das bibliotecas e a dos
    núcleos podem ser injetadas; sem elas, valem as do faster-whisper e do CTranslate2.
    """
    inicio = time.monotonic()
    if criar is None:
        registrar_bibliotecas_da_nvidia()
        try:
            from faster_whisper import WhisperModel
            import ctranslate2
        except ImportError:
            conexao.send(("falha_no_carregamento", "faster-whisper ausente"))
            return
        criar = WhisperModel
        contar_placas = contar_placas or ctranslate2.get_cuda_device_count
    try:
        carregado = carregar_com_reserva(
            caminho_modelo,
            criar,
            contar_placas or (lambda: 0),
            bibliotecas_presentes or bibliotecas_da_placa_presentes,
            aquecer=_aquecer,
            nucleos=nucleos or plataforma.nucleos_fisicos,
        )
    except Exception as erro:  # noqa: BLE001 - qualquer falha vira motivo do protocolo
        conexao.send(("falha_no_carregamento", motivo_de_carregamento(erro)))
        return
    conexao.send(("carregado", round((time.monotonic() - inicio) * 1000), (carregado.linha, carregado.nivel)))

    modelo = carregado.modelo
    while True:
        mensagem = conexao.recv()
        if mensagem[0] == "parar":
            return
        amostras = mensagem[1]
        try:
            segmentos, informacao = modelo.transcribe(amostras, **PARAMETROS_DO_FASTER_WHISPER)
            # O faster-whisper transcreve à medida que os segmentos são consumidos.
            resultado = {"segments": [_segmento(segmento) for segmento in segmentos], "language": informacao.language}
        except Exception:  # noqa: BLE001
            if carregado.dispositivo == "cuda":
                # Uma falha da placa no meio da sessão tende a se repetir. Sem resposta, o
                # principal vê o trabalhador cair, responde FALHA_NA_TRANSCRICAO e o recria,
                # e o novo escolhe outra vez entre a placa e o processador (D-06).
                return
            conexao.send(("falha", "falha do Whisper"))
            continue
        texto = texto_com_fala(resultado, amostras)
        idioma = (resultado["language"] or "") if texto else ""
        conexao.send(("ok", texto, idioma, False))


def carregar_com_reserva(
    caminho_modelo: str,
    criar: Callable,
    contar_placas: Callable[[], int],
    bibliotecas_presentes: Callable[[], bool],
    aquecer: Callable,
    nucleos: Callable[[], int],
) -> ModeloCarregado:
    """Carrega na placa de vídeo e, se ela não servir, no processador, com o motivo da lista fixa (D-05).

    O aquecimento conta como parte do carregamento: é nele que a placa executa o modelo
    pela primeira vez. A falha também no processador sobe para o laço.
    """
    motivo = _motivo_para_dispensar_a_placa(contar_placas, bibliotecas_presentes)
    if motivo is None:
        try:
            modelo = criar(caminho_modelo, device="cuda", compute_type="int8")
            aquecer(modelo)
        except Exception as erro:  # noqa: BLE001
            motivo = SEM_MEMORIA_NA_PLACA if _falta_memoria(erro) else FALHA_DA_PLACA
        else:
            return ModeloCarregado(modelo, "cuda", "modelo carregado na placa de vídeo", "info")
        # A referência ao modelo da placa sai antes do carregamento no processador.
        modelo = None
    modelo = criar(caminho_modelo, device="cpu", compute_type="int8", cpu_threads=nucleos())
    aquecer(modelo)
    return ModeloCarregado(modelo, "cpu", f"modelo carregado no processador: {motivo}", "aviso")


def registrar_bibliotecas_da_nvidia(bases=None, adicionar: Callable | None = None) -> list[Path]:
    """Põe as DLLs das rodas da NVIDIA ao alcance do CTranslate2, antes de importá-lo (D-07).

    As rodas `nvidia-cublas-cu12` e `nvidia-cudnn-cu12` instalam as bibliotecas em
    `site-packages\\nvidia\\<pacote>\\bin`, fora do caminho de busca do Windows. Cada pasta
    existente entra no `os.add_dll_directory` e no início do PATH; devolve as registradas.
    """
    if bases is None:
        bases = [*site.getsitepackages(), site.getusersitepackages()]
    if adicionar is None:
        adicionar = _adicionar_pasta_de_dlls
    pastas = [pasta for base in bases for pasta in sorted((Path(base) / "nvidia").glob("*/bin")) if pasta.is_dir()]
    for pasta in pastas:
        adicionar(pasta)
    if pastas:
        atual = os.environ.get("PATH", "")
        os.environ["PATH"] = os.pathsep.join([*(str(pasta) for pasta in pastas), *([atual] if atual else [])])
    return pastas


# Os registros do `os.add_dll_directory`, que valem enquanto não forem fechados.
_ADICIONADAS: list = []


def _adicionar_pasta_de_dlls(pasta: Path) -> None:
    if hasattr(os, "add_dll_directory"):
        _ADICIONADAS.append(os.add_dll_directory(str(pasta)))


def bibliotecas_da_placa_presentes(carregar: Callable | None = None) -> bool:
    """As bibliotecas da placa carregam todas? Sem uma delas, o modelo vai para o processador."""
    if carregar is None:
        import ctypes

        carregar = ctypes.WinDLL
    try:
        for nome in BIBLIOTECAS_DA_PLACA:
            carregar(nome)
    except OSError:
        return False
    return True


def _motivo_para_dispensar_a_placa(contar_placas, bibliotecas_presentes) -> str | None:
    try:
        placas = contar_placas()
    except Exception:  # noqa: BLE001 - driver ausente ou quebrado conta como sem placa
        placas = 0
    if placas < 1:
        return SEM_PLACA
    if not bibliotecas_presentes():
        return SEM_BIBLIOTECAS
    return None


def _falta_memoria(erro: BaseException) -> bool:
    return isinstance(erro, MemoryError) or "out of memory" in str(erro).lower()


def _aquecer(modelo) -> None:
    # A primeira execução prepara os núcleos da placa ou do processador; pagá-la durante
    # o "carregando" poupa o primeiro pedido real, como no Mac.
    segmentos, _ = modelo.transcribe(np.zeros(audio.TAXA, dtype=np.float32), **PARAMETROS_DO_FASTER_WHISPER)
    list(segmentos)


def _segmento(segmento) -> dict:
    return {
        "start": segmento.start,
        "end": segmento.end,
        "text": segmento.text,
        "no_speech_prob": segmento.no_speech_prob,
    }


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
