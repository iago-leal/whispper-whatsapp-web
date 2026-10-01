import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";

import { estado, idDe, resultado, tipoDe } from "./suporte/canal-simulado.ts";
import { instalarChromeFalso } from "./suporte/chrome-falso.ts";

const runtime = instalarChromeFalso();
runtime.aoEnviar = (porta, mensagem) => {
  if (tipoDe(mensagem) === "verificar") queueMicrotask(() => porta.responder(estado("pronto")));
  if (tipoDe(mensagem) === "transcrever") queueMicrotask(() => porta.responder(resultado(idDe(mensagem) as string)));
};

const amostra = new TextEncoder().encode("OggS amostra empacotada");
const buscadas: string[] = [];
Object.assign(globalThis, {
  fetch: async (url: string) => {
    buscadas.push(url);
    return new Response(amostra);
  },
});

// Importado depois dos simulacros porque o módulo instancia o adaptador ao carregar.
await import("../src/background.ts");

test("motorDiagnostico.verificar consulta o host pelo canal do Chrome", async () => {
  assert.deepEqual(await globalThis.motorDiagnostico.verificar(), {
    estado: "pronto",
    modelo: "m",
    versaoApp: "1.0.0",
    protocolo: 1,
  });
});

test("motorDiagnostico.transcreverAmostra envia a amostra empacotada em dist/diagnostico/", async () => {
  const r = await globalThis.motorDiagnostico.transcreverAmostra();

  assert.ok(r.ok);
  assert.deepEqual(buscadas, [runtime.getURL("dist/diagnostico/fala-pt.ogg")]);
  const pedido = runtime.ultima.enviadas.find((m) => tipoDe(m) === "transcrever") as Record<string, unknown>;
  assert.equal(pedido.midia, "audio/ogg; codecs=opus");
  assert.equal(pedido.audioBase64, Buffer.from(amostra).toString("base64"));
});
