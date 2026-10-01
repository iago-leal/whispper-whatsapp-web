"""Decodificação das mensagens de voz em PCM mono de 16 kHz (DT-03, DT-14).

O ffmpeg é chamado pelo caminho absoluto da configuração, porque o Chrome lança
o host com PATH mínimo. A entrada vai por pipe; só o MP4, cujo contêiner exige
leitura com posicionamento, passa por um arquivo temporário anônimo, que nunca
tem nome no disco.

Os bytes e o tipo de mídia vêm de terceiros. Por isso o ffmpeg só abre os
demuxers dos formatos aceitos e só o protocolo da própria entrada: sem isso, um
manifesto DASH rotulado como áudio o faria ler arquivos locais indicados na
mensagem (RN-04) ou girar em laço. A decodificação tem ainda prazo, teto de saída
e limite de CPU próprios, independentes do prazo da transcrição (RF-24).
"""

from __future__ import annotations

import math
import os
import selectors
import subprocess
import tempfile
import threading
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np

TAXA = 16_000
LIMIAR_SILENCIO_DBFS = -45.0
FAIXA_DE_VOZ_HZ = (300, 3400)

MIDIAS_ACEITAS = frozenset(
    {"audio/ogg", "audio/opus", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac"}
)
MIDIAS_MP4 = frozenset({"audio/mp4", "audio/x-m4a"})

# Demuxers dos formatos aceitos; "mov" é o do MP4 e do M4A. Uma lista, e não um formato
# fixo por tipo, tolera o rótulo inexato dentro deles, como AAC em ADTS rotulado audio/mp4.
FORMATOS_ACEITOS = "ogg,mp3,mov,aac"
PRAZO_DE_DECODIFICACAO_S = 60.0
# Teto da saída: acima disso, o áudio é longo demais ou é uma bomba de descompressão.
DURACAO_MAXIMA_S = 2 * 60 * 60
# Limite de CPU aplicado pelo próprio ffmpeg: o derruba mesmo depois de um SIGKILL no host.
LIMITE_DE_CPU_S = 2 * round(PRAZO_DE_DECODIFICACAO_S)

FFMPEG_AUSENTE = "ffmpeg ausente"
_BLOCO = 1 << 16


class ErroDeAudio(Exception):
    def __init__(self, motivo: str):
        super().__init__(motivo)
        self.motivo = motivo


@dataclass(frozen=True)
class AudioDecodificado:
    amostras: np.ndarray
    duracao_seg: float


class Cancelador:
    """Deixa outra linha interromper a decodificação em curso, como a do encerramento do host."""

    def __init__(self) -> None:
        self._trava = threading.Lock()
        self._processo: subprocess.Popen | None = None
        self._cancelado = False

    def cancelar(self) -> None:
        """Mata o ffmpeg em curso e recusa os seguintes."""
        with self._trava:
            self._cancelado = True
            processo = self._processo
        if processo is not None:
            processo.kill()

    def _vincular(self, processo: subprocess.Popen) -> bool:
        with self._trava:
            self._processo = None if self._cancelado else processo
            return not self._cancelado

    def _desvincular(self) -> None:
        with self._trava:
            self._processo = None


def tipo_base(midia: str) -> str:
    return midia.split(";", 1)[0].strip().lower()


def midia_aceita(midia: str) -> bool:
    return tipo_base(midia) in MIDIAS_ACEITAS


def decodificar(
    dados: bytes,
    midia: str,
    ffmpeg: str | os.PathLike,
    pasta_temporaria: str | os.PathLike,
    *,
    cancelador: Cancelador | None = None,
) -> AudioDecodificado:
    if not midia_aceita(midia):
        raise ErroDeAudio("formato não suportado")
    if not Path(ffmpeg).is_file():
        raise ErroDeAudio(FFMPEG_AUSENTE)
    if not dados:
        raise ErroDeAudio("áudio ilegível")

    if tipo_base(midia) in MIDIAS_MP4:
        bruto = _decodificar_por_arquivo(dados, ffmpeg, Path(pasta_temporaria), cancelador)
    else:
        bruto = _executar(ffmpeg, "pipe:0", "pipe", dados, cancelador)

    amostras = np.frombuffer(bruto, dtype=np.int16).astype(np.float32) / 32768.0
    if amostras.size == 0:
        raise ErroDeAudio("áudio ilegível")
    return AudioDecodificado(amostras=amostras, duracao_seg=amostras.size / TAXA)


def energia_dbfs(amostras: np.ndarray) -> float:
    """Energia RMS, em dBFS, só na faixa da voz (300 a 3400 Hz).

    Medir a faixa inteira deixaria passar ruído grave, que o Whisper transforma
    em frases inventadas; pelo teorema de Parseval, a energia sai do espectro
    sem a transformada inversa.
    """
    if amostras.size == 0:
        return -math.inf
    espectro = np.fft.rfft(amostras.astype(np.float64))
    frequencias = np.fft.rfftfreq(amostras.size, 1 / TAXA)
    faixa = (frequencias >= FAIXA_DE_VOZ_HZ[0]) & (frequencias <= FAIXA_DE_VOZ_HZ[1])
    potencia = 2 * float(np.sum(np.abs(espectro[faixa]) ** 2)) / amostras.size**2
    return 10 * math.log10(potencia) if potencia > 0 else -math.inf


def tem_fala(amostras: np.ndarray) -> bool:
    return energia_dbfs(amostras) >= LIMIAR_SILENCIO_DBFS


def _decodificar_por_arquivo(dados: bytes, ffmpeg, pasta: Path, cancelador: Cancelador | None) -> bytearray:
    # No macOS, TemporaryFile cria o arquivo com permissão 0600 e o desvincula antes do
    # primeiro byte: o áudio não ganha nome no disco nem sobrevive a um SIGKILL do host
    # (RN-02). O ffmpeg o lê por /dev/fd, que admite posicionamento.
    with tempfile.TemporaryFile(dir=pasta) as arquivo:
        arquivo.write(dados)
        arquivo.flush()
        arquivo.seek(0)
        descritor = arquivo.fileno()
        return _executar(ffmpeg, f"/dev/fd/{descritor}", "file", None, cancelador, (descritor,))


def _executar(
    ffmpeg,
    entrada: str,
    protocolo_da_entrada: str,
    dados: bytes | None,
    cancelador: Cancelador | None,
    descritores: tuple[int, ...] = (),
) -> bytearray:
    comando = [
        os.fspath(ffmpeg), "-nostdin", "-hide_banner", "-loglevel", "error",
        "-timelimit", str(LIMITE_DE_CPU_S),
        "-format_whitelist", FORMATOS_ACEITOS, "-protocol_whitelist", protocolo_da_entrada,
        "-i", entrada, "-vn", "-f", "s16le", "-ac", "1", "-ar", str(TAXA), "pipe:1",
    ]
    try:
        # A saída de erro nunca é lida; guardada, um laço de erros esgotaria a memória do host.
        processo = subprocess.Popen(
            comando,
            stdin=subprocess.DEVNULL if dados is None else subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            pass_fds=descritores,
        )
    except (FileNotFoundError, PermissionError, NotADirectoryError) as erro:
        raise ErroDeAudio(FFMPEG_AUSENTE) from erro
    except OSError as erro:
        # Falha do sistema ao criar o processo, e não do ffmpeg: não deve derrubar o motor.
        raise ErroDeAudio("áudio ilegível") from erro

    escritor = None
    try:
        if cancelador is not None and not cancelador._vincular(processo):
            processo.kill()
        if dados is not None:
            # Numa linha à parte: o ffmpeg só lê a entrada se a saída dele estiver sendo lida.
            escritor = threading.Thread(target=_escrever, args=(processo.stdin, dados), daemon=True)
            escritor.start()
        saida = _ler_saida(processo, PRAZO_DE_DECODIFICACAO_S, DURACAO_MAXIMA_S * TAXA * 2)
    finally:
        if processo.poll() is None:
            processo.kill()
        processo.wait()
        processo.stdout.close()
        if escritor is not None:
            escritor.join()
        if cancelador is not None:
            cancelador._desvincular()
    if processo.returncode != 0:
        raise ErroDeAudio("áudio ilegível")
    return saida


def _escrever(entrada, dados: bytes) -> None:
    try:
        entrada.write(dados)
    except OSError:
        # O ffmpeg saiu antes de ler tudo, por formato recusado, prazo ou cancelamento.
        pass
    finally:
        try:
            entrada.close()
        except OSError:
            pass


def _ler_saida(processo: subprocess.Popen, prazo_s: float, limite_de_bytes: int) -> bytearray:
    fim = time.monotonic() + prazo_s
    saida = bytearray()
    descritor = processo.stdout.fileno()
    with selectors.DefaultSelector() as seletor:
        seletor.register(descritor, selectors.EVENT_READ)
        while True:
            restante = fim - time.monotonic()
            if restante <= 0 or not seletor.select(restante):
                raise ErroDeAudio("prazo excedido")
            bloco = os.read(descritor, _BLOCO)
            if not bloco:
                break
            saida += bloco
            if len(saida) > limite_de_bytes:
                raise ErroDeAudio("áudio maior que o limite")
    try:
        processo.wait(max(0.0, fim - time.monotonic()))
    except subprocess.TimeoutExpired:
        raise ErroDeAudio("prazo excedido") from None
    return saida
