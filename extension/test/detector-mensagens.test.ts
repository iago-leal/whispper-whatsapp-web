import assert from 'node:assert/strict';
import { test } from 'node:test';
import { identificarMensagemDeAudio, deveIgnorarMensagem } from '../src/content/detector-mensagens.ts';

test('identificarMensagemDeAudio reconhece mensagem de voz válida', () => {
  const balaoAudio = {
    hasAttribute: (attr: string) => false,
    getAttribute: (attr: string) => (attr === 'data-id' ? 'msg_audio_123' : null),
    querySelector: (sel: string) => {
      if (sel.includes('audio') || sel.includes('Reproduzir') || sel.includes('audio-player')) {
        return { tagName: 'AUDIO' };
      }
      return null;
    }
  } as unknown as HTMLElement;

  const resultado = identificarMensagemDeAudio(balaoAudio);
  assert.ok(resultado);
  assert.equal(resultado?.idAudio, 'msg_audio_123');
});

test('deveIgnorarMensagem rejeita mensagem com marcador de visualização única ou já injetada', () => {
  const balaoVisualizacaoUnica = {
    hasAttribute: (attr: string) => attr === 'data-whispper-injetado',
    querySelector: (sel: string) => {
      if (sel.includes('view-once') || sel.includes('Visualização única')) return {};
      return null;
    }
  } as unknown as HTMLElement;

  assert.equal(deveIgnorarMensagem(balaoVisualizacaoUnica), true);

  const balaoJaInjetado = {
    hasAttribute: (attr: string) => attr === 'data-whispper-injetado',
    querySelector: () => null
  } as unknown as HTMLElement;

  assert.equal(deveIgnorarMensagem(balaoJaInjetado), true);
});
