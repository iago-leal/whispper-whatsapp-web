import shutil
import subprocess
import sys
import threading
import time

import numpy as np
import pytest

from whispper_motor import audio, plataforma
from whispper_motor.audio import ErroDeAudio

from .suporte import executavel_falso

DURACAO_FALA_PT = 12.92

# Manifesto DASH dinâmico cujos fragmentos nunca abrem: o demuxer dash tenta o seguinte sem fim.
MPD_DINAMICO = b"""<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-live:2011"
     type="dynamic" availabilityStartTime="2020-01-01T00:00:00Z" minBufferTime="PT2S">
 <Period id="0" start="PT0S">
  <AdaptationSet id="0" contentType="audio">
   <Representation id="0" mimeType="audio/mp4" codecs="mp4a.40.2" bandwidth="32000" audioSamplingRate="44100">
    <SegmentTemplate timescale="1000" duration="2000" media="data:audio/mp4;base64,AAAA$Number$" startNumber="1"/>
   </Representation>
  </AdaptationSet>
 </Period>
</MPD>
"""


def mpd_estatico(base_url):
    """Manifesto DASH estático que manda o ffmpeg ler o arquivo em `base_url`."""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT13S" minBufferTime="PT1S"
     profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
 <Period>
  <AdaptationSet mimeType="audio/mp4">
   <Representation id="a" bandwidth="64000" codecs="mp4a.40.2" audioSamplingRate="44100">
    <BaseURL>{base_url}</BaseURL>
   </Representation>
  </AdaptationSet>
 </Period>
</MPD>
""".encode()


# Corpos do ffmpeg falso: um que não produz nada e um que produz sem fim.
DORMIR = "import time\ntime.sleep(30)"
ZEROS = "import sys\nsaida = sys.stdout.buffer\nwhile True:\n    saida.write(bytes(1 << 16))"


def ffmpeg_falso(pasta, corpo):
    """Executável no lugar do ffmpeg, que grava o próprio PID e roda `corpo`, em Python."""
    gravar_pid = f"import os\nopen({str(pasta / 'pid')!r}, 'w').write(str(os.getpid()))\n"
    return executavel_falso.criar(pasta / "ffmpeg-falso", gravar_pid + corpo)


def processo_encerrado(pasta):
    arquivo_pid = pasta / "pid"
    if not arquivo_pid.exists():
        return True
    try:
        pid = int(arquivo_pid.read_text().strip())
    except ValueError:
        return True
    # O falso pode levar um instante para sair depois do pai, no Windows.
    limite = time.monotonic() + 5
    while plataforma.processo_existe(pid) and time.monotonic() < limite:
        time.sleep(0.05)
    return not plataforma.processo_existe(pid)


@pytest.mark.parametrize(
    "arquivo, midia",
    [
        ("fala-pt.ogg", "audio/ogg; codecs=opus"),
        ("fala-pt.mp3", "audio/mpeg"),
        ("fala-pt.m4a", "audio/mp4"),
    ],
)
def test_decodifica_para_pcm_mono_16khz(amostras, ffmpeg, tmp_path, arquivo, midia):
    dados = (amostras / arquivo).read_bytes()

    resultado = audio.decodificar(dados, midia, ffmpeg, tmp_path)

    assert resultado.amostras.dtype == np.float32
    assert resultado.amostras.ndim == 1
    assert resultado.duracao_seg == pytest.approx(DURACAO_FALA_PT, abs=0.1)
    assert len(resultado.amostras) == pytest.approx(DURACAO_FALA_PT * audio.TAXA, abs=0.1 * audio.TAXA)


def test_mp4_nao_deixa_temporario(amostras, ffmpeg, tmp_path):
    audio.decodificar((amostras / "fala-pt.m4a").read_bytes(), "audio/x-m4a", ffmpeg, tmp_path)

    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize("arquivo", ["corrompido.ogg", "vazio.ogg"])
def test_audio_ilegivel(amostras, ffmpeg, tmp_path, arquivo):
    with pytest.raises(ErroDeAudio) as erro:
        audio.decodificar((amostras / arquivo).read_bytes(), "audio/ogg", ffmpeg, tmp_path)

    assert erro.value.motivo == "áudio ilegível"


def test_mp4_ilegivel_nao_deixa_temporario(amostras, ffmpeg, tmp_path):
    with pytest.raises(ErroDeAudio):
        audio.decodificar((amostras / "corrompido.ogg").read_bytes(), "audio/mp4", ffmpeg, tmp_path)

    assert list(tmp_path.iterdir()) == []


def test_formato_nao_suportado(amostras, ffmpeg, tmp_path):
    with pytest.raises(ErroDeAudio) as erro:
        audio.decodificar((amostras / "fala-pt.ogg").read_bytes(), "video/webm", ffmpeg, tmp_path)

    assert erro.value.motivo == "formato não suportado"


def test_ffmpeg_ausente(amostras, tmp_path):
    with pytest.raises(ErroDeAudio) as erro:
        audio.decodificar((amostras / "fala-pt.ogg").read_bytes(), "audio/ogg", tmp_path / "sem-ffmpeg", tmp_path)

    assert erro.value.motivo == "ffmpeg ausente"


@pytest.mark.parametrize(
    "midia, base",
    [
        ("audio/ogg; codecs=opus", "audio/ogg"),
        ("Audio/OGG", "audio/ogg"),
        (" audio/mpeg ", "audio/mpeg"),
    ],
)
def test_tipo_base(midia, base):
    assert audio.tipo_base(midia) == base


def test_aceita_as_midias_do_contrato(protocolo_1):
    for midia in protocolo_1["midiasAceitas"]:
        assert audio.midia_aceita(midia), midia
    assert not audio.midia_aceita("video/webm")


def test_energia_separa_silencio_de_fala(amostras, ffmpeg, tmp_path):
    silencio = audio.decodificar((amostras / "silencio.ogg").read_bytes(), "audio/ogg", ffmpeg, tmp_path)
    fala = audio.decodificar((amostras / "fala-pt.ogg").read_bytes(), "audio/ogg", ffmpeg, tmp_path)

    assert audio.energia_dbfs(silencio.amostras) < audio.LIMIAR_SILENCIO_DBFS
    assert audio.energia_dbfs(fala.amostras) > audio.LIMIAR_SILENCIO_DBFS


def test_energia_de_vetor_vazio():
    assert audio.energia_dbfs(np.zeros(0, dtype=np.float32)) < audio.LIMIAR_SILENCIO_DBFS


@pytest.mark.parametrize("midia", ["audio/ogg; codecs=opus", "audio/mp4"])
def test_manifesto_dash_forjado_e_recusado_sem_travar(ffmpeg, tmp_path, midia):
    inicio = time.monotonic()

    with pytest.raises(ErroDeAudio) as erro:
        audio.decodificar(MPD_DINAMICO, midia, ffmpeg, tmp_path)

    assert erro.value.motivo == "áudio ilegível"
    assert time.monotonic() - inicio < 5


@pytest.mark.parametrize("midia", ["audio/mp4", "audio/x-m4a"])
@pytest.mark.parametrize("absoluto", [True, False], ids=["caminho-absoluto", "caminho-relativo"])
def test_mp4_nao_le_arquivo_indicado_na_mensagem(amostras, ffmpeg, tmp_path, midia, absoluto):
    alheio = tmp_path / "alheio.m4a"
    shutil.copy(amostras / "fala-pt.m4a", alheio)
    temporarios = tmp_path / "tmp"
    temporarios.mkdir()
    manifesto = mpd_estatico(alheio.as_uri() if absoluto else "../alheio.m4a")

    with pytest.raises(ErroDeAudio) as erro:
        audio.decodificar(manifesto, midia, ffmpeg, temporarios)

    assert erro.value.motivo == "áudio ilegível"
    assert list(temporarios.iterdir()) == []


@pytest.mark.skipif(
    sys.platform == "win32", reason="exige o macOS: no Windows, o arquivo temporário tem nome até ser fechado"
)
def test_mp4_nao_ganha_nome_no_disco(amostras, ffmpeg, tmp_path, monkeypatch):
    vistos = []
    popen = subprocess.Popen

    def espiao(*argumentos, **opcoes):
        vistos.append(list(tmp_path.iterdir()))
        return popen(*argumentos, **opcoes)

    monkeypatch.setattr(subprocess, "Popen", espiao)

    audio.decodificar((amostras / "fala-pt.m4a").read_bytes(), "audio/mp4", ffmpeg, tmp_path)

    assert vistos == [[]]


@pytest.mark.skipif(sys.platform != "win32", reason="exige o Windows: MP4 pela entrada padrão, com -fd 0")
def test_mp4_no_windows_so_existe_na_pasta_do_host(amostras, ffmpeg, tmp_path, monkeypatch):
    vistos = []
    popen = subprocess.Popen

    def espiao(argumentos, **opcoes):
        vistos.append((list(tmp_path.iterdir()), argumentos, opcoes.get("stdin")))
        return popen(argumentos, **opcoes)

    monkeypatch.setattr(subprocess, "Popen", espiao)

    resultado = audio.decodificar((amostras / "fala-pt.m4a").read_bytes(), "audio/mp4", ffmpeg, tmp_path)

    assert resultado.duracao_seg == pytest.approx(DURACAO_FALA_PT, abs=0.1)
    [(durante, argumentos, entrada)] = vistos
    # Um arquivo só, na pasta temporária do host, entregue como entrada padrão do FFmpeg.
    assert len(durante) == 1
    assert ["-protocol_whitelist", "fd", "-fd", "0", "-i", "fd:"] == argumentos[argumentos.index("-protocol_whitelist") :][:6]
    assert hasattr(entrada, "fileno")
    assert list(tmp_path.iterdir()) == []


def test_mp4_cancelado_nao_deixa_temporario(amostras, tmp_path):
    falso = ffmpeg_falso(tmp_path, DORMIR)
    temporarios = tmp_path / "tmp"
    temporarios.mkdir()
    cancelador = audio.Cancelador()
    erros = []

    def decodificar():
        try:
            audio.decodificar(
                (amostras / "fala-pt.m4a").read_bytes(), "audio/mp4", falso, temporarios, cancelador=cancelador
            )
        except ErroDeAudio as erro:
            erros.append(erro.motivo)

    linha = threading.Thread(target=decodificar)
    linha.start()
    while not (tmp_path / "pid").exists():
        time.sleep(0.01)
    cancelador.cancelar()
    linha.join(5)

    assert not linha.is_alive()
    assert erros == ["áudio ilegível"]
    assert processo_encerrado(tmp_path)
    # No Windows, o sistema apaga o arquivo quando o último processo que o mantém aberto sai.
    limite = time.monotonic() + 5
    while list(temporarios.iterdir()) and time.monotonic() < limite:
        time.sleep(0.05)
    assert list(temporarios.iterdir()) == []


def test_ffmpeg_sem_saida_e_encerrado_pelo_prazo(amostras, tmp_path, monkeypatch):
    monkeypatch.setattr(audio, "PRAZO_DE_DECODIFICACAO_S", 0.5)
    falso = ffmpeg_falso(tmp_path, DORMIR)
    inicio = time.monotonic()

    with pytest.raises(ErroDeAudio) as erro:
        audio.decodificar((amostras / "fala-pt.ogg").read_bytes(), "audio/ogg", falso, tmp_path)

    assert erro.value.motivo == "prazo excedido"
    assert time.monotonic() - inicio < 5
    assert processo_encerrado(tmp_path)


def test_saida_acima_do_teto_e_interrompida(amostras, tmp_path, monkeypatch):
    monkeypatch.setattr(audio, "DURACAO_MAXIMA_S", 1)
    falso = ffmpeg_falso(tmp_path, ZEROS)

    with pytest.raises(ErroDeAudio) as erro:
        audio.decodificar((amostras / "fala-pt.ogg").read_bytes(), "audio/ogg", falso, tmp_path)

    assert erro.value.motivo == "áudio maior que o limite"
    assert processo_encerrado(tmp_path)


def test_cancelador_interrompe_o_ffmpeg_em_curso(amostras, tmp_path):
    falso = ffmpeg_falso(tmp_path, DORMIR)
    cancelador = audio.Cancelador()
    erros = []

    def decodificar():
        try:
            audio.decodificar((amostras / "fala-pt.ogg").read_bytes(), "audio/ogg", falso, tmp_path, cancelador=cancelador)
        except ErroDeAudio as erro:
            erros.append(erro.motivo)

    linha = threading.Thread(target=decodificar)
    linha.start()
    while not (tmp_path / "pid").exists():
        time.sleep(0.01)
    cancelador.cancelar()
    linha.join(5)

    assert not linha.is_alive()
    assert erros == ["áudio ilegível"]
    assert processo_encerrado(tmp_path)
