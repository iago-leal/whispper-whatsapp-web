/**
 * Tempos e textos do indicador de espera (feature 006).
 *
 * Funções puras, compartilhadas pelo ícone, pela janela flutuante e pelo painel. O cronômetro conta
 * segundos inteiros ("7 s") para não ser confundido com a duração que o WhatsApp exibe ("0:13").
 */

import type { TemposDoPedido } from './exibicao-de-transcricao.ts';

const SEPARADOR = ' · ';

function decimal(valor: number): string {
  return (Math.round(valor * 10) / 10).toFixed(1).replace('.', ',');
}

function minutosESegundos(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min} min ${String(seg).padStart(2, '0')} s`;
}

function segundosInteiros(segundos: number): string {
  return segundos < 60 ? `${segundos} s` : minutosESegundos(segundos);
}

/**
 * Tempo decorrido do cronômetro, em segundos inteiros completos: "7 s"; a partir de 60 s, "1 min 05 s".
 */
export function formatarDecorrido(ms: number): string {
  return segundosInteiros(Math.max(0, Math.floor(ms / 1000)));
}

/**
 * Tempo final de uma espera: uma casa decimal abaixo de 60 s ("9,7 s"); a partir daí, "1 min 05 s".
 */
export function formatarDuracaoFinal(ms: number): string {
  const decimos = Math.round(Math.max(0, ms) / 100);
  if (decimos < 600) return `${decimal(decimos / 10)} s`;
  return minutosESegundos(Math.round(ms / 1000));
}

function formatarDuracaoAudio(segundos: number): string {
  return segundosInteiros(Math.round(segundos));
}

/**
 * Comparação entre a espera e o tempo de ouvir o áudio, ou null sem duração conhecida.
 */
export function formatarComparacao(esperaTotalMs: number, duracaoAudioSeg: number | undefined): string | null {
  if (!duracaoAudioSeg || duracaoAudioSeg <= 0 || esperaTotalMs <= 0) return null;
  const duracaoMs = duracaoAudioSeg * 1000;
  if (esperaTotalMs >= duracaoMs) return 'mais lento que ouvir';
  return `${decimal(duracaoMs / esperaTotalMs)}× mais rápido que ouvir`;
}

/**
 * Resumo exibido junto ao texto concluído: "Transcrito em 14,1 s (4,4 s na fila) · áudio de 13 s ·
 * mais lento que ouvir". A fila só aparece quando arredonda a pelo menos 0,1 s; sem duração
 * conhecida, o áudio e a comparação ficam de fora.
 */
export function formatarResumo(tempos: TemposDoPedido): string {
  let resumo = `Transcrito em ${formatarDuracaoFinal(tempos.esperaTotalMs)}`;
  if (Math.round(tempos.esperaFilaMs / 100) >= 1) {
    resumo += ` (${formatarDuracaoFinal(tempos.esperaFilaMs)} na fila)`;
  }
  const duracao = tempos.duracaoAudioSeg;
  if (duracao && duracao > 0) {
    resumo += `${SEPARADOR}áudio de ${formatarDuracaoAudio(duracao)}`;
    const comparacao = formatarComparacao(tempos.esperaTotalMs, duracao);
    if (comparacao) resumo += `${SEPARADOR}${comparacao}`;
  }
  return resumo;
}

/**
 * Tempo até a falha de um pedido: "Falhou após 61 s".
 */
export function formatarFalha(ms: number): string {
  return `Falhou após ${formatarDecorrido(ms)}`;
}

/**
 * Tempos de um pedido a partir dos instantes do clique, da saída da fila e do fim. Sem duração
 * positiva, o campo fica ausente.
 */
export function calcularTempos(
  instantes: { inicioEsperaEm: number; inicioTranscricaoEm?: number; fimEm?: number },
  duracaoAudioSeg?: number
): TemposDoPedido {
  const fim = instantes.fimEm ?? instantes.inicioEsperaEm;
  const saidaDaFila = instantes.inicioTranscricaoEm ?? fim;
  const tempos: TemposDoPedido = {
    esperaTotalMs: Math.max(0, fim - instantes.inicioEsperaEm),
    esperaFilaMs: Math.max(0, saidaDaFila - instantes.inicioEsperaEm)
  };
  if (duracaoAudioSeg && duracaoAudioSeg > 0) tempos.duracaoAudioSeg = duracaoAudioSeg;
  return tempos;
}

/**
 * Espera média por minuto de áudio: a soma das esperas dividida pela soma das durações, em minutos,
 * com uma casa decimal; null sem áudio acumulado.
 */
export function calcularEsperaMediaSegPorMinuto(esperaAcumuladaMs: number, audioAcumuladoMs: number): number | null {
  if (audioAcumuladoMs <= 0) return null;
  return Math.round(((esperaAcumuladaMs * 60) / audioAcumuladoMs) * 10) / 10;
}

/**
 * Linha do painel: "Espera média: 14,0 s por minuto de áudio".
 */
export function formatarEsperaMedia(esperaMediaSegPorMinuto: number | null): string {
  if (esperaMediaSegPorMinuto === null) return 'Espera média: sem transcrições ainda';
  return `Espera média: ${decimal(esperaMediaSegPorMinuto)} s por minuto de áudio`;
}
