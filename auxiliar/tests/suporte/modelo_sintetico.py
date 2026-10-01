"""Modelo Whisper mínimo, com pesos aleatórios em float16, para testar o carregamento sem o modelo real."""

import json
from pathlib import Path

N_VOCAB_MULTILINGUE = 51865
N_VOCAB_SO_EM_INGLES = 51864


def criar_modelo_minimo(pasta: Path, n_vocab: int) -> Path:
    import mlx.core as mx
    from mlx.utils import tree_flatten
    from mlx_whisper import whisper

    dimensoes = dict(
        n_mels=80, n_audio_ctx=1500, n_audio_state=64, n_audio_head=1, n_audio_layer=1,
        n_vocab=n_vocab, n_text_ctx=448, n_text_state=64, n_text_head=1, n_text_layer=1,
    )
    pasta.mkdir(parents=True)
    (pasta / "config.json").write_text(json.dumps(dimensoes))
    modelo = whisper.Whisper(whisper.ModelDimensions(**dimensoes), mx.float16)
    # Pesos em float32 falhariam por outro motivo, no codificador; o modelo real vem em float16.
    pesos = {nome: valor.astype(mx.float16) for nome, valor in tree_flatten(modelo.parameters())}
    mx.save_safetensors(str(pasta / "weights.safetensors"), pesos)
    return pasta
