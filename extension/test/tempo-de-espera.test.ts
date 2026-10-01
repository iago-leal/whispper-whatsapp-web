// Tempos e textos do indicador de espera (feature 006): o cronômetro do ícone e da janela, o resumo
// da conclusão, a falha e a espera média do painel. Os exemplos vêm dos critérios do requirements.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calcularEsperaMediaSegPorMinuto,
  calcularTempos,
  formatarComparacao,
  formatarDecorrido,
  formatarDuracaoFinal,
  formatarEsperaMedia,
  formatarFalha,
  formatarResumo
} from '../src/dominio/tempo-de-espera.ts';

test('cronômetro em segundos inteiros e, a partir de 60 s, em minutos (RF-02, RF-04)', () => {
  const casos: Array<[number, string]> = [
    [0, '0 s'],
    [999, '0 s'],
    [7_400, '7 s'],
    [59_999, '59 s'],
    [60_000, '1 min 00 s'],
    [65_000, '1 min 05 s'],
    [612_000, '10 min 12 s'],
    [-50, '0 s']
  ];
  for (const [ms, esperado] of casos) assert.equal(formatarDecorrido(ms), esperado, `${ms} ms`);
});

test('o cronômetro nunca usa o formato m:ss da duração do WhatsApp (RF-02)', () => {
  for (const ms of [0, 5_000, 59_000, 65_000, 3_600_000]) {
    assert.doesNotMatch(formatarDecorrido(ms), /\d:\d\d/);
  }
});

test('tempo final com uma casa decimal abaixo de 60 s e em minutos acima (RF-05, RF-04)', () => {
  const casos: Array<[number, string]> = [
    [3_200, '3,2 s'],
    [9_660, '9,7 s'],
    [14_100, '14,1 s'],
    [59_960, '1 min 00 s'],
    [65_400, '1 min 05 s']
  ];
  for (const [ms, esperado] of casos) assert.equal(formatarDuracaoFinal(ms), esperado, `${ms} ms`);
});

test('resumo da conclusão com a duração do áudio (RF-05)', () => {
  assert.equal(
    formatarResumo({ esperaTotalMs: 9_700, esperaFilaMs: 0, duracaoAudioSeg: 13 }),
    'Transcrito em 9,7 s · áudio de 13 s · 1,3× mais rápido que ouvir'
  );
  assert.equal(
    formatarResumo({ esperaTotalMs: 3_200, esperaFilaMs: 2, duracaoAudioSeg: 13.4 }),
    'Transcrito em 3,2 s · áudio de 13 s · 4,2× mais rápido que ouvir'
  );
});

test('resumo separa a parte da fila só quando houve fila (RF-06)', () => {
  assert.equal(
    formatarResumo({ esperaTotalMs: 14_100, esperaFilaMs: 4_400, duracaoAudioSeg: 13 }),
    'Transcrito em 14,1 s (4,4 s na fila) · áudio de 13 s · mais lento que ouvir'
  );
  assert.doesNotMatch(formatarResumo({ esperaTotalMs: 5_000, esperaFilaMs: 30, duracaoAudioSeg: 13 }), /na fila/);
});

test('resumo sem duração conhecida omite o áudio e a comparação (D-08)', () => {
  assert.equal(formatarResumo({ esperaTotalMs: 9_700, esperaFilaMs: 0 }), 'Transcrito em 9,7 s');
  assert.equal(formatarResumo({ esperaTotalMs: 9_700, esperaFilaMs: 0, duracaoAudioSeg: 0 }), 'Transcrito em 9,7 s');
});

test('áudio longo usa minutos na duração', () => {
  assert.equal(
    formatarResumo({ esperaTotalMs: 20_000, esperaFilaMs: 0, duracaoAudioSeg: 65 }),
    'Transcrito em 20,0 s · áudio de 1 min 05 s · 3,3× mais rápido que ouvir'
  );
});

test('comparação com o tempo de ouvir (RF-13)', () => {
  assert.equal(formatarComparacao(10_000, 13), '1,3× mais rápido que ouvir');
  assert.equal(formatarComparacao(15_000, 13), 'mais lento que ouvir');
  assert.equal(formatarComparacao(13_000, 13), 'mais lento que ouvir');
  assert.equal(formatarComparacao(10_000, undefined), null);
  assert.equal(formatarComparacao(0, 13), null);
});

test('falha informa o tempo até o erro, no formato do RF-04 a partir de 60 s (RF-07)', () => {
  assert.equal(formatarFalha(45_000), 'Falhou após 45 s');
  assert.equal(formatarFalha(61_000), 'Falhou após 1 min 01 s');
  assert.equal(formatarFalha(75_500), 'Falhou após 1 min 15 s');
});

test('tempos do pedido derivados dos três instantes (RN-01, RF-06)', () => {
  assert.deepEqual(
    calcularTempos({ inicioEsperaEm: 1_000, inicioTranscricaoEm: 5_400, fimEm: 15_100 }, 13),
    { esperaTotalMs: 14_100, esperaFilaMs: 4_400, duracaoAudioSeg: 13 }
  );
  assert.deepEqual(
    calcularTempos({ inicioEsperaEm: 1_000, inicioTranscricaoEm: 1_000, fimEm: 10_700 }),
    { esperaTotalMs: 9_700, esperaFilaMs: 0 }
  );
});

test('espera média ponderada pela duração (RN-08, RF-14)', () => {
  // Esperas de 4,3 s e 9,7 s para áudios de 13 s e 47 s: 14 s em 1 min.
  assert.equal(calcularEsperaMediaSegPorMinuto(14_000, 60_000), 14);
  assert.equal(calcularEsperaMediaSegPorMinuto(10_000, 47_000), 12.8);
  assert.equal(calcularEsperaMediaSegPorMinuto(0, 0), null);
  assert.equal(calcularEsperaMediaSegPorMinuto(5_000, 0), null);
});

test('texto da espera média no painel (RF-14)', () => {
  assert.equal(formatarEsperaMedia(14), 'Espera média: 14,0 s por minuto de áudio');
  assert.equal(formatarEsperaMedia(12.8), 'Espera média: 12,8 s por minuto de áudio');
  assert.equal(formatarEsperaMedia(null), 'Espera média: sem transcrições ainda');
});
