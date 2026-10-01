import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONFIGURACAO_ESTRUTURAS } from '../src/content/configuracao-estruturas.ts';
import { avaliarSaudeDasEstruturas } from '../src/content/monitor-degradacao.ts';
import { calcularCoordenadasAncora } from '../src/content/rastreador-ancora.ts';

const { containerConversa, containerMensagens } = CONFIGURACAO_ESTRUTURAS.seletores;

// Documento com a conversa aberta (#main), com ou sem a lista de mensagens dentro dela.
function docComConversa(comListaDeMensagens: boolean): Document {
  const painel = {
    querySelector: (sel: string) => (sel === containerMensagens && comListaDeMensagens ? {} : null)
  };
  return {
    querySelector: (sel: string) => (sel === containerConversa ? painel : null)
  } as unknown as Document;
}

test('avaliarSaudeDasEstruturas retorna ativa quando a conversa aberta tem a lista de mensagens', () => {
  const resultado = avaliarSaudeDasEstruturas(docComConversa(true));
  assert.equal(resultado.status, 'ativa');
});

test('avaliarSaudeDasEstruturas não acusa degradação sem conversa aberta (EC-10, BUG-20261001-GAOZ)', () => {
  const docSemConversa = {
    querySelector: () => null
  } as unknown as Document;

  const resultado = avaliarSaudeDasEstruturas(docSemConversa);
  assert.equal(resultado.status, 'ativa');
});

test('avaliarSaudeDasEstruturas acusa degradação quando a conversa aberta não tem a lista de mensagens (RF-11)', () => {
  const resultado = avaliarSaudeDasEstruturas(docComConversa(false));
  assert.equal(resultado.status, 'degradada');
  if (resultado.status === 'degradada') {
    assert.deepEqual(resultado.estruturasAusentes, ['containerMensagens']);
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
