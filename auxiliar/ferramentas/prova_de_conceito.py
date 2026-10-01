"""Prova de conceito de latência do motor local (portão T025).

Transcreve cada arquivo de uma pasta pelo mesmo caminho do host (decodificação
no processo principal, modelo no trabalhador) e compara o tempo com o limite
do RNF de desempenho: o maior entre 2 s e 10 s por minuto de áudio.

O texto transcrito só aparece no terminal com `--mostrar-texto` e nunca é
gravado; o relatório identifica os áudios por número, não pelo nome.

Uso:
    python -m ferramentas.prova_de_conceito <pasta> [--relatorio poc.md] [--mostrar-texto]
"""

from __future__ import annotations

import argparse
import ctypes
import sys
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from whispper_motor import audio, configuracao, modelos  # noqa: E402
from whispper_motor.trabalhador import FalhaDoWhisper, TrabalhadorMlx  # noqa: E402

MIDIA_POR_EXTENSAO = {
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".oga": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".aac": "audio/aac",
}


@dataclass(frozen=True)
class Medicao:
    numero: int
    extensao: str
    duracao_seg: float
    energia_dbfs: float
    decodificacao_ms: int
    transcricao_ms: int
    limite_ms: int
    idioma: str
    vazio: bool

    @property
    def total_ms(self) -> int:
        return self.decodificacao_ms + self.transcricao_ms

    @property
    def marca(self) -> str:
        return "OK" if self.total_ms <= self.limite_ms else "ACIMA"


def pico_de_memoria_mib(pid: int) -> float:
    """Pico do consumo físico do processo, que inclui a memória unificada do Metal.

    Lê `ri_lifetime_max_phys_footprint` de `proc_pid_rusage` (RUSAGE_INFO_V4); o
    `ru_maxrss` do `getrusage` não enxerga as alocações da GPU.
    """
    RUSAGE_INFO_V4 = 4
    POSICAO_DO_PICO = 28  # campos de 64 bits depois do uuid, até ri_lifetime_max_phys_footprint
    campos = (ctypes.c_uint64 * 48)()
    buffer = (ctypes.c_uint8 * (16 + ctypes.sizeof(campos)))()
    libproc = ctypes.CDLL("/usr/lib/libproc.dylib")
    if libproc.proc_pid_rusage(pid, RUSAGE_INFO_V4, ctypes.byref(buffer)) != 0:
        return float("nan")
    ctypes.memmove(campos, ctypes.addressof(buffer) + 16, ctypes.sizeof(campos))
    return campos[POSICAO_DO_PICO] / (1024 * 1024)


def limite_ms(duracao_seg: float) -> int:
    return round(max(2.0, 10.0 * duracao_seg / 60.0) * 1000)


def arquivos_de_audio(pasta: Path) -> list[Path]:
    return sorted(p for p in pasta.iterdir() if p.is_file() and p.suffix.lower() in MIDIA_POR_EXTENSAO)


def executar(pasta: Path, mostrar_texto: bool) -> tuple[list[Medicao], list[str], int, float]:
    config = configuracao.carregar(Path("~/Library/Application Support/whispper-motor/config.toml").expanduser())
    caminho_modelo = modelos.resolver(config.modelo, config.pasta_de_modelos)
    arquivos = arquivos_de_audio(pasta)
    if not arquivos:
        raise SystemExit(f"nenhum áudio em {pasta}")

    trabalhador = TrabalhadorMlx(caminho_modelo)
    trabalhador.iniciar()
    carregamento = trabalhador.aguardar_carregamento(timeout=600)
    if not carregamento.ok:
        raise SystemExit(f"falha no carregamento: {carregamento.motivo}")

    medicoes, recusados = [], []
    try:
        with tempfile.TemporaryDirectory() as temporarios:
            for numero, arquivo in enumerate(arquivos, start=1):
                inicio = time.monotonic()
                try:
                    decodificado = audio.decodificar(
                        arquivo.read_bytes(), MIDIA_POR_EXTENSAO[arquivo.suffix.lower()], config.ffmpeg, temporarios
                    )
                except audio.ErroDeAudio as erro:
                    recusados.append(f"{numero} ({arquivo.suffix.lower()}): {erro.motivo}")
                    print(f"{numero:>3}  {arquivo.suffix.lower():<5} recusado: {erro.motivo}", flush=True)
                    continue
                meio = time.monotonic()
                try:
                    resultado = trabalhador.transcrever(decodificado.amostras, prazo_s=600)
                except FalhaDoWhisper:
                    recusados.append(f"{numero} ({arquivo.suffix.lower()}): falha do Whisper")
                    print(f"{numero:>3}  {arquivo.suffix.lower():<5} recusado: falha do Whisper", flush=True)
                    continue
                fim = time.monotonic()
                medicao = Medicao(
                    numero=numero,
                    extensao=arquivo.suffix.lower(),
                    duracao_seg=decodificado.duracao_seg,
                    energia_dbfs=audio.energia_dbfs(decodificado.amostras),
                    decodificacao_ms=round((meio - inicio) * 1000),
                    transcricao_ms=round((fim - meio) * 1000),
                    limite_ms=limite_ms(decodificado.duracao_seg),
                    idioma=resultado.idioma,
                    vazio=resultado.texto == "",
                )
                medicoes.append(medicao)
                print(_linha(medicao), flush=True)
                if mostrar_texto:
                    print(f"    {resultado.texto}", flush=True)
        pico_mib = pico_de_memoria_mib(trabalhador.pid)
    finally:
        trabalhador.encerrar()

    return medicoes, recusados, carregamento.duracao_ms, pico_mib


def _linha(m: Medicao) -> str:
    return (
        f"{m.numero:>3}  {m.extensao:<5} {m.duracao_seg:7.1f} s  {m.energia_dbfs:6.1f} dBFS  "
        f"{m.decodificacao_ms:>6} + {m.transcricao_ms:>6} ms  limite {m.limite_ms:>6} ms  "
        f"{m.idioma or '-':<3} {'vazio' if m.vazio else '':<5} {m.marca}"
    )


def relatorio(medicoes: list[Medicao], recusados: list[str], carregamento_ms: int, pico_mib: float) -> str:
    acima = sum(m.marca == "ACIMA" for m in medicoes)
    linhas = [
        "# Prova de conceito de latência",
        "",
        f"> Data: {datetime.now().astimezone().isoformat(timespec='seconds')}",
        "> Sem texto transcrito e sem nomes de arquivo: os áudios são identificados por número.",
        "",
        f"- Carregamento do modelo: {carregamento_ms} ms",
        f"- Pico de memória do trabalhador: {pico_mib:.0f} MiB",
        f"- Resultado: {len(medicoes) - acima} de {len(medicoes)} dentro do limite",
        f"- Recusados: {', '.join(recusados) if recusados else 'nenhum'}",
        "",
        "| Nº | Formato | Duração (s) | Energia na faixa da voz (dBFS) | Decodificação (ms) | Transcrição (ms) | Total (ms) | Limite (ms) | Idioma | Texto vazio | Marca |",
        "|----|---------|-------------|--------------------------------|--------------------|------------------|------------|-------------|--------|-------------|-------|",
    ]
    for m in medicoes:
        linhas.append(
            f"| {m.numero} | {m.extensao} | {m.duracao_seg:.1f} | {m.energia_dbfs:.1f} | {m.decodificacao_ms} | "
            f"{m.transcricao_ms} | {m.total_ms} | {m.limite_ms} | {m.idioma or '-'} | {'sim' if m.vazio else 'não'} | {m.marca} |"
        )
    return "\n".join(linhas) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("pasta", type=Path)
    parser.add_argument("--relatorio", type=Path)
    parser.add_argument("--mostrar-texto", action="store_true")
    args = parser.parse_args(argv)

    medicoes, recusados, carregamento_ms, pico_mib = executar(args.pasta, args.mostrar_texto)
    texto = relatorio(medicoes, recusados, carregamento_ms, pico_mib)
    print()
    print(texto)
    if args.relatorio:
        args.relatorio.write_text(texto, encoding="utf-8")
    return 1 if any(m.marca == "ACIMA" for m in medicoes) else 0


if __name__ == "__main__":
    sys.exit(main())
