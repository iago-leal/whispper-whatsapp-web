import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";

import contrato from "../../contratos/protocolo-1.json" with { type: "json" };
import {
  LIMITE_ENTRADA_BYTES,
  NOME_DO_HOST,
  PROTOCOLO,
  interpretarResposta,
  paraBase64,
  pedidoTranscrever,
  pedidoVerificar,
  tamanhoDoPedido,
} from "../src/adaptadores/motor-local/protocolo.ts";

const MiB = 1024 * 1024;
const ogg = new TextEncoder().encode("OggS");

test("constantes iguais às do contrato", () => {
  assert.equal(PROTOCOLO, contrato.protocolo);
  assert.equal(NOME_DO_HOST, contrato.nomeDoHost);
  assert.equal(LIMITE_ENTRADA_BYTES, contrato.limites.entradaMaxBytes);
});

test("pedidos serializados iguais aos exemplos do contrato", () => {
  const [verificar, transcrever, vazio] = contrato.pedidosValidos.map((c) => c.mensagem);

  assert.deepEqual(pedidoVerificar(), verificar);
  assert.deepEqual(pedidoTranscrever("p-17", "audio/ogg; codecs=opus", ogg), transcrever);
  assert.deepEqual(pedidoTranscrever("p-18", "audio/mpeg", new Uint8Array(0)), vazio);
});

test("base64 igual ao do Node, inclusive acima do tamanho de bloco", () => {
  for (const n of [0, 1, 2, 3, 4, 32_767, 32_768, 100_001]) {
    const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 7919) % 256);
    assert.equal(paraBase64(bytes), Buffer.from(bytes).toString("base64"), `n = ${n}`);
  }
});

test("tamanho do pedido calculado sem serializar o áudio", () => {
  for (const n of [0, 1, 2, 3, 1000, 65_537]) {
    const pedido = pedidoTranscrever("p-1", "audio/ogg; codecs=opus", new Uint8Array(n));
    assert.equal(tamanhoDoPedido("p-1", "audio/ogg; codecs=opus", n), Buffer.byteLength(JSON.stringify(pedido)), `n = ${n}`);
  }
});

test("50 MiB passam do limite; 1 MiB cabe", () => {
  assert.ok(tamanhoDoPedido("p-1", "audio/ogg", 50 * MiB) > LIMITE_ENTRADA_BYTES);
  assert.ok(tamanhoDoPedido("p-1", "audio/ogg", 1 * MiB) <= LIMITE_ENTRADA_BYTES);
});

test("respostas válidas do contrato são reconhecidas", () => {
  for (const caso of contrato.respostasValidas) {
    assert.deepEqual(interpretarResposta(caso.mensagem), caso.mensagem, caso.nome);
  }
});

test("respostas inválidas do contrato são descartadas", () => {
  for (const caso of contrato.respostasInvalidas) {
    assert.equal(interpretarResposta(caso.mensagem), null, caso.nome);
  }
  for (const valor of [null, 42, "texto", [1, 2]]) {
    assert.equal(interpretarResposta(valor), null);
  }
});
