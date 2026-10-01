import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONFIGURACAO_ESTRUTURAS } from '../src/content/configuracao-estruturas.ts';

test('CONFIGURACAO_ESTRUTURAS possui versão e data de verificação válidas', () => {
  assert.ok(CONFIGURACAO_ESTRUTURAS.versao);
  assert.match(CONFIGURACAO_ESTRUTURAS.verificadoEm, /^\d{4}-\d{2}-\d{2}$/);
});

test('CONFIGURACAO_ESTRUTURAS define seletores obrigatórios sem strings vazias', () => {
  const { seletores } = CONFIGURACAO_ESTRUTURAS;
  assert.ok(seletores.containerConversa.length > 0);
  assert.ok(seletores.balaoMensagem.length > 0);
  assert.ok(seletores.elementoMensagemVoz.length > 0);
  assert.ok(seletores.tagAudio.length > 0);
  assert.ok(seletores.botaoPlayNativo.length > 0);
});

test('CONFIGURACAO_ESTRUTURAS define atributos com prefixo whispper para evitar colisão', () => {
  const { atributos } = CONFIGURACAO_ESTRUTURAS;
  assert.equal(atributos.idMensagem, 'data-id');
  assert.ok(atributos.marcadorInjetado.startsWith('data-whispper-'));
  assert.ok(atributos.marcadorDirecao.startsWith('data-whispper-'));
});
