import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
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

// Os módulos internos de que a obtenção do áudio depende também são estrutura da página: mudam sem
// aviso e só podem ser nomeados aqui (RF-13, BUG-20261001-2MOY).
test('CONFIGURACAO_ESTRUTURAS nomeia os módulos internos da página, e nenhum outro fonte os cita', () => {
  const nomes = Object.values(CONFIGURACAO_ESTRUTURAS.modulosDaPagina ?? {})
    .filter((nome): nome is string => typeof nome === 'string' && nome.length > 0);
  assert.ok(nomes.length >= 2, 'modulosDaPagina ausente ou incompleto');
  const src = new URL('../src/', import.meta.url);
  const citam = readdirSync(src, { recursive: true, encoding: 'utf8' })
    .filter((arquivo) => arquivo.endsWith('.ts') && !arquivo.endsWith('configuracao-estruturas.ts'))
    .filter((arquivo) => nomes.some((nome) => readFileSync(new URL(arquivo, src), 'utf8').includes(nome)));
  assert.deepEqual(citam, []);
});
