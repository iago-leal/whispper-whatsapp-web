import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extrairAudioDeElemento } from '../src/content/extrator-audio.ts';

test('extrairAudioDeElemento obtém bytes do blobUrl sem acionar play()', async () => {
  const dadosBytes = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x01, 0x02]); // Fake OggS
  let playChamado = false;

  const elementoAudioFalso = {
    src: 'blob:https://web.whatsapp.com/fake-audio-uuid',
    duration: 12.5,
    play: () => {
      playChamado = true;
      return Promise.resolve();
    }
  };

  const balaoFalso = {
    querySelector: (sel: string) => {
      if (sel.includes('audio')) return elementoAudioFalso;
      return null;
    }
  } as unknown as HTMLElement;

  const fetchAntigo = globalThis.fetch;
  globalThis.fetch = async (url: string | URL | Request) => {
    if (String(url) === 'blob:https://web.whatsapp.com/fake-audio-uuid') {
      return new Response(dadosBytes, {
        headers: { 'Content-Type': 'audio/ogg; codecs=opus' }
      });
    }
    throw new Error('URL inesperada');
  };

  try {
    const resultado = await extrairAudioDeElemento(balaoFalso, 'audio-123');
    assert.equal(resultado.idAudio, 'audio-123');
    assert.deepEqual(resultado.bytes, dadosBytes);
    assert.equal(resultado.duracaoSeg, 12.5);
    assert.equal(playChamado, false, 'play() não deve ser invocado');
  } finally {
    globalThis.fetch = fetchAntigo;
  }
});

test('extrairAudioDeElemento falha com AUDIO_INDISPONIVEL se elemento de áudio não existir', async () => {
  const balaoVazio = {
    querySelector: () => null
  } as unknown as HTMLElement;

  await assert.rejects(
    async () => {
      await extrairAudioDeElemento(balaoVazio, 'audio-sem-tag');
    },
    (err: Error) => err.message.includes('AUDIO_INDISPONIVEL')
  );
});
