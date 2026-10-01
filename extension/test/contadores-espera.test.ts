// Espera acumulada do painel (feature 006): soma das esperas sem fila e das durações dos áudios
// recebidos, média ponderada, zeramento junto com os contadores e leitura de registro antigo.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GerenciadorContadores } from '../src/dominio/contadores.ts';
import { ArmazenamentoMemoria } from '../src/adaptadores/armazenamento-chrome.ts';
import type { ArmazenamentoNavegador, ContadoresPersistidos } from '../src/dominio/armazenamento-navegador.ts';

test('acumula espera e duração e calcula a média ponderada (RN-08, RF-14)', async () => {
  const contadores = new GerenciadorContadores(new ArmazenamentoMemoria());
  await contadores.registrarTempoDeEspera('recebido', 4_300, 13_000);
  await contadores.registrarTempoDeEspera('recebido', 9_700, 47_000);

  const metricas = await contadores.obterMetricas();
  assert.equal(metricas.esperaMediaSegPorMinuto, 14);
});

test('sem transcrição contada, a média é nula', async () => {
  const contadores = new GerenciadorContadores(new ArmazenamentoMemoria());
  assert.equal((await contadores.obterMetricas()).esperaMediaSegPorMinuto, null);
});

test('áudio enviado pelo próprio usuário e áudio sem duração ficam fora (RN-07, D-08)', async () => {
  const armazenamento = new ArmazenamentoMemoria();
  const contadores = new GerenciadorContadores(armazenamento);
  await contadores.registrarTempoDeEspera('enviado', 5_000, 30_000);
  await contadores.registrarTempoDeEspera('recebido', 5_000, 0);

  const salvos = await armazenamento.carregarContadores();
  assert.equal(salvos.esperaAcumuladaMs, 0);
  assert.equal(salvos.audioAcumuladoMs, 0);
});

test('zerar os contadores zera o acumulado (RN-09, RF-15)', async () => {
  const contadores = new GerenciadorContadores(new ArmazenamentoMemoria());
  await contadores.registrarTempoDeEspera('recebido', 6_000, 60_000);

  const metricas = await contadores.zerar();
  assert.equal(metricas.esperaMediaSegPorMinuto, null);
  assert.equal(metricas.lidos, 0);
});

test('o zeramento feito pelo painel não é desfeito pela cópia do script de conteúdo (D-11)', async () => {
  const armazenamento = new ArmazenamentoMemoria();
  const conteudo = new GerenciadorContadores(armazenamento);
  const painel = new GerenciadorContadores(armazenamento);

  await conteudo.registrarTranscricaoConcluida('a', 'recebido');
  await conteudo.registrarTempoDeEspera('recebido', 30_000, 60_000);
  await painel.zerar();
  await conteudo.registrarTranscricaoConcluida('b', 'recebido');
  await conteudo.registrarTempoDeEspera('recebido', 6_000, 60_000);

  const metricas = await new GerenciadorContadores(armazenamento).obterMetricas();
  assert.equal(metricas.lidos, 1);
  assert.equal(metricas.esperaMediaSegPorMinuto, 6);
});

test('registro gravado antes da feature, sem os campos novos, é lido como zero', async () => {
  const antigo = { lidos: 18, ouvidos: 2, lidosETocados: 1, inicioContagem: '2026-09-30T12:00:00.000Z' };
  let gravado: ContadoresPersistidos | null = null;
  const armazenamento: ArmazenamentoNavegador = {
    async carregarContadores() {
      return (gravado ?? antigo) as ContadoresPersistidos;
    },
    async salvarContadores(c) {
      gravado = { ...c };
    },
    async zerarContadores() {
      throw new Error('não usado');
    }
  };
  const contadores = new GerenciadorContadores(armazenamento);

  const antes = await contadores.obterMetricas();
  assert.equal(antes.esperaMediaSegPorMinuto, null);
  assert.equal(antes.taxaAdocaoPercentual, 90);

  await contadores.registrarTempoDeEspera('recebido', 3_000, 30_000);
  assert.deepEqual(gravado, { ...antigo, esperaAcumuladaMs: 3_000, audioAcumuladoMs: 30_000 });
});

test('o adaptador em memória inclui os campos novos e os zera', async () => {
  const armazenamento = new ArmazenamentoMemoria({ lidos: 3 });
  const inicial = await armazenamento.carregarContadores();
  assert.equal(inicial.esperaAcumuladaMs, 0);
  assert.equal(inicial.audioAcumuladoMs, 0);

  await armazenamento.salvarContadores({ ...inicial, esperaAcumuladaMs: 10, audioAcumuladoMs: 20 });
  const zerado = await armazenamento.zerarContadores();
  assert.equal(zerado.esperaAcumuladaMs, 0);
  assert.equal(zerado.audioAcumuladoMs, 0);
});
