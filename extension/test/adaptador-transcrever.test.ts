import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";

import { AdaptadorMotorLocal, INSTRUCAO_INSTALACAO } from "../src/adaptadores/motor-local/adaptador-motor-local.ts";
import { CanalSimulado, ERROS_DO_CHROME, erro, estado, idDe, resultado, tipoDe, tique } from "./suporte/canal-simulado.ts";
import { RelogioFalso } from "./suporte/relogio-falso.ts";

const MiB = 1024 * 1024;
const audio = new TextEncoder().encode("OggS e mais bytes");

function montar() {
  const canal = new CanalSimulado();
  const relogio = new RelogioFalso();
  const registros: string[] = [];
  const motor = new AdaptadorMotorLocal(canal, { relogio, registrar: (m) => registros.push(m) });
  return { canal, relogio, motor, registros };
}

function responderTranscricoesCom(canal: CanalSimulado, fazer: (id: string) => unknown) {
  canal.aoEnviar = (porta, mensagem) => {
    if (tipoDe(mensagem) === "verificar") queueMicrotask(() => porta.responder(estado("pronto")));
    if (tipoDe(mensagem) === "transcrever") queueMicrotask(() => porta.responder(fazer(idDe(mensagem) as string)));
  };
}

test("recusa áudio acima do limite sem abrir conexão", async () => {
  const { canal, motor } = montar();

  const r = await motor.transcrever(new Uint8Array(50 * MiB), "audio/ogg");

  assert.deepEqual(r, { ok: false, codigo: "FALHA_NA_TRANSCRICAO", motivo: "áudio maior que o limite" });
  assert.equal(canal.portas.length, 0);
});

test("conecta sob demanda, envia o pedido e copia o resultado", async () => {
  const { canal, motor } = montar();
  responderTranscricoesCom(canal, (id) => resultado(id));

  const r = await motor.transcrever(audio, "audio/ogg; codecs=opus");

  assert.deepEqual(r, { ok: true, texto: "olá", idioma: "pt", duracaoAudioSeg: 2.5, processamentoMs: 300 });
  assert.deepEqual(canal.ultima.enviadas, [
    {
      tipo: "transcrever",
      protocolo: 1,
      idPedido: "p-1",
      midia: "audio/ogg; codecs=opus",
      audioBase64: Buffer.from(audio).toString("base64"),
    },
  ]);
});

for (const codigo of ["FALHA_NA_TRANSCRICAO", "VERSAO_INCOMPATIVEL", "MOTOR_INDISPONIVEL"] as const) {
  test(`erro ${codigo} do host é repassado`, async () => {
    const { canal, motor } = montar();
    responderTranscricoesCom(canal, (id) => erro(id, codigo, "motivo do host"));

    assert.deepEqual(await motor.transcrever(audio, "audio/ogg"), { ok: false, codigo, motivo: "motivo do host" });
  });
}

test("MENSAGEM_INVALIDA do host vira falha e fica registrada", async () => {
  const { canal, motor, registros } = montar();
  responderTranscricoesCom(canal, (id) => ({ ...erro(id, "MENSAGEM_INVALIDA", "mensagem inválida"), detalhe: "x" }));

  const r = await motor.transcrever(audio, "audio/ogg");

  assert.deepEqual(r, { ok: false, codigo: "FALHA_NA_TRANSCRICAO", motivo: "mensagem inválida" });
  assert.equal(registros.length, 1);
});

test("queda com pedido pendente vira MOTOR_INDISPONIVEL e o pedido seguinte reconecta", async () => {
  const { canal, motor } = montar();

  const pendente = motor.transcrever(audio, "audio/ogg");
  canal.ultima.cair(ERROS_DO_CHROME.encerrou);
  const r1 = await pendente;
  responderTranscricoesCom(canal, (id) => resultado(id));
  const r2 = await motor.transcrever(audio, "audio/ogg");

  assert.deepEqual(r1, {
    ok: false,
    codigo: "MOTOR_INDISPONIVEL",
    motivo: "aplicativo auxiliar encerrou durante a transcrição",
    instrucao: INSTRUCAO_INSTALACAO,
  });
  assert.ok(r2.ok);
  assert.equal(canal.portas.length, 2);
});

test("host não instalado: uma única tentativa de conexão por pedido", async () => {
  const { canal, motor } = montar();
  canal.falharAoConectar(ERROS_DO_CHROME.naoEncontrado);

  const r = await motor.transcrever(audio, "audio/ogg");

  assert.deepEqual(r, {
    ok: false,
    codigo: "MOTOR_INDISPONIVEL",
    motivo: "aplicativo auxiliar não instalado",
    instrucao: INSTRUCAO_INSTALACAO,
  });
  assert.equal(canal.portas.length, 1);
});

test("pedidos simultâneos saem em ordem e são correlacionados por idPedido", async () => {
  const { canal, motor } = montar();

  const promessas = [1, 2, 3].map(() => motor.transcrever(audio, "audio/ogg"));
  const porta = canal.ultima;
  porta.responder(resultado("p-2", { texto: "dois" }));
  porta.responder(estado("pronto"));
  porta.responder(resultado("p-1", { texto: "um" }));
  porta.responder(resultado("p-3", { texto: "três" }));
  const textos = (await Promise.all(promessas)).map((r) => (r.ok ? r.texto : r.codigo));

  assert.deepEqual(porta.enviadas.map(idDe), ["p-1", "p-2", "p-3"]);
  assert.deepEqual(textos, ["um", "dois", "três"]);
});

test("respostas estado e resultado intercaladas não se confundem", async () => {
  const { canal, motor } = montar();

  const transcricao = motor.transcrever(audio, "audio/ogg");
  const verificacao = motor.verificar();
  canal.ultima.responder(estado("pronto"));
  canal.ultima.responder(resultado("p-1"));

  assert.equal((await verificacao).estado, "pronto");
  assert.ok((await transcricao).ok);
});

test("depois de verificação sem resposta, o pedido seguinte verifica antes de transcrever", async () => {
  const { canal, relogio, motor } = montar();
  const verificacao = motor.verificar();
  relogio.avancar(10_000);
  await verificacao;
  responderTranscricoesCom(canal, (id) => resultado(id));

  const r = await motor.transcrever(audio, "audio/ogg");

  assert.ok(r.ok);
  assert.deepEqual(canal.ultima.enviadas.map(tipoDe), ["verificar", "transcrever"]);
});

test("verificação prévia que falha encerra o pedido sem enviá-lo", async () => {
  const { canal, relogio, motor } = montar();
  const verificacao = motor.verificar();
  relogio.avancar(10_000);
  await verificacao;
  canal.aoEnviar = (porta, mensagem) => {
    if (tipoDe(mensagem) === "verificar") queueMicrotask(() => porta.responder(estado("erro", { motivo: "ffmpeg ausente" })));
  };

  const r = await motor.transcrever(audio, "audio/ogg");

  assert.deepEqual(r, { ok: false, codigo: "MOTOR_INDISPONIVEL", motivo: "ffmpeg ausente" });
  assert.deepEqual(canal.ultima.enviadas.map(tipoDe), ["verificar"]);
});

test("erro sem idPedido é registrado e ignorado", async () => {
  const { canal, motor, registros } = montar();

  const pendente = motor.transcrever(audio, "audio/ogg");
  canal.ultima.responder(erro(null, "MENSAGEM_INVALIDA", "mensagem inválida"));
  await tique();
  canal.ultima.responder(resultado("p-1"));

  assert.ok((await pendente).ok);
  assert.equal(registros.length, 1);
});
