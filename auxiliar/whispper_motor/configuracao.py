"""Configuração do aplicativo auxiliar (`config.toml`), lida quando o host inicia."""

from __future__ import annotations

import re
import shutil
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

MODELO_PADRAO = "mlx-community/whisper-large-v3-turbo"
PASTA_DE_MODELOS_PADRAO = "~/.cache/huggingface/hub"
OCIOSO_MIN_PADRAO = 30
# Uma semana: sessão nenhuma do Chrome dura tanto, e o teto afasta valores que o relógio
# das travas não representa.
OCIOSO_MIN_MAXIMO = 7 * 24 * 60
FFMPEG_CANDIDATOS = ("/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg")

_ID_DE_EXTENSAO = re.compile(r"[a-p]{32}")


class ConfiguracaoInvalida(Exception):
    def __init__(self, campo: str):
        super().__init__(f"configuração inválida: {campo}")
        self.campo = campo


def ffmpeg_detectado() -> Path:
    encontrado = shutil.which("ffmpeg")
    if encontrado:
        return Path(encontrado)
    for candidato in FFMPEG_CANDIDATOS:
        if Path(candidato).is_file():
            return Path(candidato)
    return Path(FFMPEG_CANDIDATOS[0])


@dataclass(frozen=True)
class Configuracao:
    modelo: str = MODELO_PADRAO
    pasta_de_modelos: Path = field(default_factory=lambda: Path(PASTA_DE_MODELOS_PADRAO).expanduser())
    ffmpeg: Path = field(default_factory=ffmpeg_detectado)
    extensao_id: str | None = None
    ocioso_min: int = OCIOSO_MIN_PADRAO


def carregar(caminho: Path) -> Configuracao:
    try:
        texto = Path(caminho).read_text(encoding="utf-8")
    except FileNotFoundError:
        texto = ""
    except (OSError, UnicodeDecodeError) as erro:
        raise ConfiguracaoInvalida("arquivo") from erro
    return ler_texto(texto)


def ler_texto(texto: str) -> Configuracao:
    try:
        dados = tomllib.loads(texto)
    except tomllib.TOMLDecodeError as erro:
        raise ConfiguracaoInvalida("arquivo") from erro

    modelo = dados.get("modelo", MODELO_PADRAO)
    if not isinstance(modelo, str) or not modelo.strip():
        raise ConfiguracaoInvalida("modelo")

    pasta = dados.get("pasta_de_modelos", PASTA_DE_MODELOS_PADRAO)
    if not isinstance(pasta, str) or not pasta.strip():
        raise ConfiguracaoInvalida("pasta_de_modelos")

    if "ffmpeg" in dados:
        ffmpeg = dados["ffmpeg"]
        if not isinstance(ffmpeg, str) or not Path(ffmpeg).expanduser().is_absolute():
            raise ConfiguracaoInvalida("ffmpeg")
        caminho_ffmpeg = Path(ffmpeg).expanduser()
    else:
        caminho_ffmpeg = ffmpeg_detectado()

    extensao_id = dados.get("extensao_id")
    if extensao_id is not None and (not isinstance(extensao_id, str) or not _ID_DE_EXTENSAO.fullmatch(extensao_id)):
        raise ConfiguracaoInvalida("extensao_id")

    ocioso_min = dados.get("ocioso_min", OCIOSO_MIN_PADRAO)
    if isinstance(ocioso_min, bool) or not isinstance(ocioso_min, int) or not 1 <= ocioso_min <= OCIOSO_MIN_MAXIMO:
        raise ConfiguracaoInvalida("ocioso_min")

    return Configuracao(
        modelo=modelo.strip(),
        pasta_de_modelos=Path(pasta).expanduser(),
        ffmpeg=caminho_ffmpeg,
        extensao_id=extensao_id,
        ocioso_min=ocioso_min,
    )


def gravar(config: Configuracao, caminho: Path) -> None:
    linhas = [
        "# whispper-motor: configuração do aplicativo auxiliar",
        f"modelo = {_texto_toml(config.modelo)}",
        f"pasta_de_modelos = {_texto_toml(str(config.pasta_de_modelos))}",
        f"ffmpeg = {_texto_toml(str(config.ffmpeg))}",
    ]
    if config.extensao_id is not None:
        linhas.append(f"extensao_id = {_texto_toml(config.extensao_id)}")
    linhas.append(f"ocioso_min = {config.ocioso_min}")

    caminho = Path(caminho)
    temporario = caminho.with_name(caminho.name + ".tmp")
    temporario.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    temporario.replace(caminho)


def _texto_toml(valor: str) -> str:
    escapado = valor.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escapado}"'
