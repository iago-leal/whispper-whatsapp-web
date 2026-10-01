import assert from 'node:assert/strict';
import { test } from 'node:test';
import { avaliarSaudeDasEstruturas } from '../src/content/monitor-degradacao.ts';
import { calcularCoordenadasAncora } from '../src/content/rastreador-ancora.ts';

test('avaliarSaudeDasEstruturas retorna ativa quando seletores essenciais estão presentes', () => {
  const docSimulado = {
    querySelector: (sel: string) => {
      if (sel === '#main') return {};
      return null;
    }
  } as unknown as Document;

  const resultado = avaliarSaudeDasEstruturas(docSimulado);
  assert.equal(resultado.status, 'ativa');
});

test('avaliarSaudeDasEstruturas retorna degradada quando container essencial estiver ausente', () => {
  const docVazio = {
    querySelector: () => null
  } as unknown as Document;

  const resultado = avaliarSaudeDasEstruturas(docVazio);
  assert.equal(resultado.status, 'degradada');
  if (resultado.status === 'degradada') {
    assert.ok(resultado.estruturasAusentes.includes('containerConversa'));
  }
});

test('calcularCoordenadasAncora extrai retângulo e visibilidade do elemento', () => {
  const elementoSimulado = {
    getBoundingClientRect: () => ({
      left: 100,
      top: 200,
      width: 300,
      height: 80,
      bottom: 280,
      right: 400
    }),
    isConnected: true
  } as unknown as HTMLElement;

  const ancora = calcularCoordenadasAncora('audio-xyz', elementoSimulado);
  assert.equal(ancora.idAudio, 'audio-xyz');
  assert.equal(ancora.x, 100);
  assert.equal(ancora.y, 200);
  assert.equal(ancora.largura, 300);
  assert.equal(ancora.altura, 80);
  assert.equal(ancora.visivel, true);
});
