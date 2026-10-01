import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calcularPosicoesJanelas } from '../src/content/posicionador-colisoes.ts';
import type { RequisicaoPosicionamento } from '../src/content/posicionador-colisoes.ts';

test('calcularPosicoesJanelas posiciona janela ao lado da âncora em espaço suficiente', () => {
  const reqs: RequisicaoPosicionamento[] = [
    {
      idAudio: 'audio-1',
      direcao: 'recebido',
      largura: 320,
      altura: 120,
      ancora: { idAudio: 'audio-1', x: 50, y: 100, largura: 200, altura: 60, visivel: true }
    }
  ];

  const posicoes = calcularPosicoesJanelas(reqs, 1200);
  assert.equal(posicoes.length, 1);
  assert.equal(posicoes[0]?.idAudio, 'audio-1');
  assert.equal(posicoes[0]?.visivel, true);
  // À direita do balão recebido: 50 + 200 + 8 = 258
  assert.equal(posicoes[0]?.x, 258);
  assert.equal(posicoes[0]?.y, 100);
});

test('calcularPosicoesJanelas desloca verticalmente janela para resolver colisão', () => {
  const reqs: RequisicaoPosicionamento[] = [
    {
      idAudio: 'audio-1',
      direcao: 'recebido',
      largura: 320,
      altura: 100,
      ancora: { idAudio: 'audio-1', x: 50, y: 100, largura: 200, altura: 60, visivel: true }
    },
    {
      idAudio: 'audio-2',
      direcao: 'recebido',
      largura: 320,
      altura: 100,
      ancora: { idAudio: 'audio-2', x: 50, y: 140, largura: 200, altura: 60, visivel: true }
    }
  ];

  const posicoes = calcularPosicoesJanelas(reqs, 1200);
  assert.equal(posicoes.length, 2);
  // Primeira janela: y = 100
  assert.equal(posicoes[0]?.y, 100);
  // Segunda janela colidiria (140 < 100 + 100 = 200); deve ser deslocada para 100 + 100 + 8 = 208
  assert.equal(posicoes[1]?.y, 208);
});

test('calcularPosicoesJanelas usa fallback abaixo do balão quando espaço lateral for insuficiente', () => {
  const reqs: RequisicaoPosicionamento[] = [
    {
      idAudio: 'audio-estreito',
      direcao: 'recebido',
      largura: 320,
      altura: 120,
      ancora: { idAudio: 'audio-estreito', x: 50, y: 100, largura: 400, altura: 60, visivel: true }
    }
  ];

  // Viewport de 480 px: 480 - (50 + 400) = 30 px < 320 px
  const posicoes = calcularPosicoesJanelas(reqs, 480);
  assert.equal(posicoes.length, 1);
  // Posiciona abaixo do balão: x = 50, y = 100 + 60 + 8 = 168
  assert.equal(posicoes[0]?.x, 50);
  assert.equal(posicoes[0]?.y, 168);
});
