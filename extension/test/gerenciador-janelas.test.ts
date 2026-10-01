import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GerenciadorDeJanelas } from '../src/content/gerenciador-janelas.ts';

test('GerenciadorDeJanelas abre janela e atualiza estados corretamente', () => {
  const gerenciador = new GerenciadorDeJanelas();

  gerenciador.abrir('audio-teste-1');
  assert.equal(gerenciador.temJanelaAberta('audio-teste-1'), true);

  gerenciador.definirEstado('audio-teste-1', {
    tipo: 'transcrevendo',
    inicioEsperaEm: 0
  });
  const estadoAtual = gerenciador.obterEstado('audio-teste-1');
  assert.equal(estadoAtual?.tipo, 'transcrevendo');

  gerenciador.definirEstado('audio-teste-1', {
    tipo: 'concluido',
    texto: 'Mensagem de voz transcrita com perfeição.',
    idioma: 'pt',
    tempos: { esperaTotalMs: 9_700, esperaFilaMs: 0, duracaoAudioSeg: 13 }
  });
  const estadoConcluido = gerenciador.obterEstado('audio-teste-1');
  assert.equal(estadoConcluido?.tipo, 'concluido');
  if (estadoConcluido?.tipo === 'concluido') {
    assert.equal(estadoConcluido.texto, 'Mensagem de voz transcrita com perfeição.');
    assert.equal(estadoConcluido.tempos?.esperaTotalMs, 9_700);
  }

  gerenciador.fechar('audio-teste-1');
  assert.equal(gerenciador.temJanelaAberta('audio-teste-1'), false);
});

test('GerenciadorDeJanelas respeita limite máximo de 20 janelas', () => {
  const gerenciador = new GerenciadorDeJanelas();

  for (let i = 1; i <= 25; i++) {
    gerenciador.abrir(`audio-${i}`);
  }

  assert.equal(gerenciador.totalAbertas(), 20);
});
