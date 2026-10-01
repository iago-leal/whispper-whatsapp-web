"""Resolução do modelo para a pasta local do snapshot, sem rede (DT-06).

Com um caminho local existente, o `load_model` do mlx-whisper não aciona o
cliente do Hugging Face; por isso o identificador do repositório nunca é
repassado adiante.
"""

from __future__ import annotations

from pathlib import Path

ARQUIVOS_DE_PESOS = ("weights.safetensors", "weights.npz")


class ModeloNaoEncontrado(Exception):
    def __init__(self) -> None:
        super().__init__("modelo não encontrado")


def resolver(modelo: str, pasta_de_modelos: Path) -> Path:
    caminho = Path(modelo).expanduser()
    if caminho.is_absolute():
        return _conferir(caminho)

    base = Path(pasta_de_modelos) / ("models--" + modelo.replace("/", "--"))
    try:
        referencia = (base / "refs" / "main").read_text(encoding="utf-8").strip()
    except OSError as erro:
        raise ModeloNaoEncontrado() from erro
    if not referencia or "/" in referencia:
        raise ModeloNaoEncontrado()
    return _conferir(base / "snapshots" / referencia)


def _conferir(pasta: Path) -> Path:
    if not (pasta / "config.json").is_file():
        raise ModeloNaoEncontrado()
    if not any((pasta / nome).is_file() for nome in ARQUIVOS_DE_PESOS):
        raise ModeloNaoEncontrado()
    return pasta
