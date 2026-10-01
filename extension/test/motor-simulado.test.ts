import assert from "node:assert/strict";
import { test } from "node:test";

import type { EstadoDoMotor, ResultadoDaTranscricao } from "../src/dominio/motor-de-transcricao.ts";
import { MotorSimulado } from "../src/adaptadores/motor-simulado.ts";
import { bateriaDeContrato, type Audio } from "./contrato-motor.ts";

const PRONTO: EstadoDoMotor = { estado: "pronto", modelo: "simulado", versaoApp: "1.0.0", protocolo: 1 };
const INICIANDO: EstadoDoMotor = { estado: "iniciando" };

function audio(conteudo: string): Audio {
  return { bytes: new TextEncoder().encode(conteudo), tipoDeMidia: "audio/ogg; codecs=opus" };
}

bateriaDeContrato("adaptador simulado", async () => {
  const fala = audio("fala em português");
  const ingles = audio("fala em inglês");
  const silencio = audio("silêncio");
  const corrompido = audio("corrompido");

  // O áudio em português demora mais que os outros, para que a ordem dependa da fila, não do atraso.
  const roteiro = new Map<Uint8Array, { resposta: ResultadoDaTranscricao; atrasoMs: number }>([
    [fala.bytes, { resposta: { ok: true, texto: "Olá, isto é uma mensagem de teste.", idioma: "pt", duracaoAudioSeg: 3.4, processamentoMs: 820 }, atrasoMs: 30 }],
    [ingles.bytes, { resposta: { ok: true, texto: "Hello, this is a test.", idioma: "en", duracaoAudioSeg: 2.1, processamentoMs: 610 }, atrasoMs: 5 }],
    [silencio.bytes, { resposta: { ok: true, texto: "", idioma: "pt", duracaoAudioSeg: 10, processamentoMs: 4 }, atrasoMs: 0 }],
  ]);
  const ilegivel: ResultadoDaTranscricao = { ok: false, codigo: "FALHA_NA_TRANSCRICAO", motivo: "áudio ilegível" };

  return {
    motor: new MotorSimulado({
      verificar: [INICIANDO, PRONTO],
      transcrever: (bytes) => roteiro.get(bytes) ?? ilegivel,
    }),
    falaEmPortugues: () => ({ audio: fala, trecho: "mensagem de teste" }),
    falaEmIngles: () => ingles,
    semFala: () => silencio,
    ilegivel: () => corrompido,
    motorIndisponivel: () =>
      new MotorSimulado({
        verificar: [{ estado: "indisponivel", codigo: "MOTOR_INDISPONIVEL", motivo: "aplicativo auxiliar não instalado", instrucao: "Instale." }],
        transcrever: [{ ok: false, codigo: "MOTOR_INDISPONIVEL", motivo: "aplicativo auxiliar não instalado", instrucao: "Instale." }],
      }),
    motorComVersaoIncompativel: () =>
      new MotorSimulado({
        verificar: [{ estado: "indisponivel", codigo: "VERSAO_INCOMPATIVEL", motivo: "versão de protocolo incompatível" }],
        transcrever: [{ ok: false, codigo: "VERSAO_INCOMPATIVEL", motivo: "versão de protocolo incompatível" }],
      }),
    encerrar: async () => {},
  };
});

test("sem roteiro, responde pronto e uma transcrição padrão", async () => {
  const motor = new MotorSimulado();

  assert.equal((await motor.verificar()).estado, "pronto");
  assert.ok((await motor.transcrever(new Uint8Array(1), "audio/ogg")).ok);
});

test("roteiro em lista segue a ordem das chamadas e repete a última resposta", async () => {
  const motor = new MotorSimulado({ verificar: [INICIANDO, PRONTO] });

  const estados = [await motor.verificar(), await motor.verificar(), await motor.verificar()];

  assert.deepEqual(estados.map((e) => e.estado), ["iniciando", "pronto", "pronto"]);
});

test("registra as chamadas recebidas, com o áudio e o tipo de mídia", async () => {
  const motor = new MotorSimulado();
  const bytes = Uint8Array.of(1, 2, 3);

  await motor.verificar();
  await motor.transcrever(bytes, "audio/mpeg");

  assert.deepEqual(motor.chamadas, [{ operacao: "verificar" }, { operacao: "transcrever", audio: bytes, tipoDeMidia: "audio/mpeg" }]);
});

test("a resposta entregue é cópia: alterá-la não muda o roteiro", async () => {
  const motor = new MotorSimulado({ verificar: [PRONTO] });

  const primeira = await motor.verificar();
  Object.assign(primeira, { estado: "iniciando" });

  assert.deepEqual(await motor.verificar(), PRONTO);
});

test("argumento de tipo errado lança exceção", () => {
  const motor = new MotorSimulado();

  assert.throws(() => motor.transcrever("áudio" as unknown as Uint8Array, "audio/ogg"), TypeError);
});
