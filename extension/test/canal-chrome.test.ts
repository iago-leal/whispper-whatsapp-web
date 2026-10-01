import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { AdaptadorMotorLocal, INSTRUCAO_REINSTALACAO } from "../src/adaptadores/motor-local/adaptador-motor-local.ts";
import { CanalChrome } from "../src/adaptadores/motor-local/canal-chrome.ts";
import { NOME_DO_HOST } from "../src/adaptadores/motor-local/protocolo.ts";
import { ERROS_DO_CHROME, estado } from "./suporte/canal-simulado.ts";
import { instalarChromeFalso, type RuntimeFalso } from "./suporte/chrome-falso.ts";

let runtime: RuntimeFalso;

beforeEach(() => {
  runtime = instalarChromeFalso();
});

test("conecta ao host do protocolo", () => {
  new CanalChrome().conectar();

  assert.deepEqual(runtime.portas.map((p) => p.nome), [NOME_DO_HOST]);
});

test("envia pela porta e entrega as mensagens recebidas", () => {
  const porta = new CanalChrome().conectar();
  const recebidas: unknown[] = [];
  porta.aoReceber((m) => recebidas.push(m));

  porta.enviar({ tipo: "verificar", protocolo: 1 });
  runtime.ultima.responder(estado("pronto"));

  assert.deepEqual(runtime.ultima.enviadas, [{ tipo: "verificar", protocolo: 1 }]);
  assert.deepEqual(recebidas, [estado("pronto")]);
});

test("entrega a desconexão com o texto de lastError, ou null sem ele", () => {
  const erros: Array<string | null> = [];
  for (const erro of [ERROS_DO_CHROME.proibido, null]) {
    new CanalChrome().conectar().aoDesconectar((e) => erros.push(e));
    runtime.ultima.cair(erro);
  }

  assert.deepEqual(erros, [ERROS_DO_CHROME.proibido, null]);
});

test("desconectar fecha a porta, e enviar depois disso lança", () => {
  const porta = new CanalChrome().conectar();

  porta.desconectar();

  assert.equal(runtime.ultima.desconectadaPelaExtensao, true);
  assert.throws(() => porta.enviar({ tipo: "verificar", protocolo: 1 }));
});

test("com o adaptador, a recusa do Chrome vira extensão não autorizada", async () => {
  runtime.aoConectar = (porta) => queueMicrotask(() => porta.cair(ERROS_DO_CHROME.proibido));
  const motor = new AdaptadorMotorLocal(new CanalChrome(), { registrar: () => {} });

  assert.deepEqual(await motor.verificar(), {
    estado: "indisponivel",
    codigo: "MOTOR_INDISPONIVEL",
    motivo: "extensão não autorizada no aplicativo auxiliar",
    instrucao: INSTRUCAO_REINSTALACAO,
  });
});
