import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AdaptadorMotorLocal,
  INSTRUCAO_ATUALIZACAO,
  INSTRUCAO_INSTALACAO,
  INSTRUCAO_REINSTALACAO,
} from "../src/adaptadores/motor-local/adaptador-motor-local.ts";
import { CanalSimulado, ERROS_DO_CHROME, estado, tipoDe, tique } from "./suporte/canal-simulado.ts";
import { RelogioFalso } from "./suporte/relogio-falso.ts";

function montar() {
  const canal = new CanalSimulado();
  const relogio = new RelogioFalso();
  const motor = new AdaptadorMotorLocal(canal, { relogio, registrar: () => {} });
  return { canal, relogio, motor };
}

function responderVerificacoesCom(canal: CanalSimulado, resposta: unknown) {
  canal.aoEnviar = (porta, mensagem) => {
    if (tipoDe(mensagem) === "verificar") queueMicrotask(() => porta.responder(resposta));
  };
}

test("estado pronto", async () => {
  const { canal, motor } = montar();
  responderVerificacoesCom(canal, estado("pronto"));

  assert.deepEqual(await motor.verificar(), { estado: "pronto", modelo: "m", versaoApp: "1.0.0", protocolo: 1 });
  assert.deepEqual(canal.ultima.enviadas, [{ tipo: "verificar", protocolo: 1 }]);
});

test("carregando vira iniciando", async () => {
  const { canal, motor } = montar();
  responderVerificacoesCom(canal, estado("carregando"));

  assert.deepEqual(await motor.verificar(), { estado: "iniciando", modelo: "m", versaoApp: "1.0.0", protocolo: 1 });
});

test("erro vira indisponível e fecha a porta para o próximo host reler a configuração", async () => {
  const { canal, motor } = montar();
  responderVerificacoesCom(canal, estado("erro", { motivo: "modelo não encontrado" }));

  const resultado = await motor.verificar();
  await motor.verificar();

  assert.deepEqual(resultado, { estado: "indisponivel", codigo: "MOTOR_INDISPONIVEL", motivo: "modelo não encontrado" });
  assert.equal(canal.portas[0]?.desconectadaPeloAdaptador, true);
  assert.equal(canal.portas.length, 2);
});

test("protocolo diferente vira VERSAO_INCOMPATIVEL com instrução de atualizar", async () => {
  const { canal, motor } = montar();
  responderVerificacoesCom(canal, estado("pronto", { protocolo: 2 }));

  assert.deepEqual(await motor.verificar(), {
    estado: "indisponivel",
    codigo: "VERSAO_INCOMPATIVEL",
    motivo: "versão de protocolo incompatível (extensão 1, aplicativo 2)",
    instrucao: INSTRUCAO_ATUALIZACAO,
  });
});

const errosDeConexao: Array<[string | null, string, string | undefined]> = [
  [ERROS_DO_CHROME.naoEncontrado, "aplicativo auxiliar não instalado", INSTRUCAO_INSTALACAO],
  [ERROS_DO_CHROME.proibido, "extensão não autorizada no aplicativo auxiliar", INSTRUCAO_REINSTALACAO],
  [ERROS_DO_CHROME.encerrou, "aplicativo auxiliar encerrou", INSTRUCAO_INSTALACAO],
  [ERROS_DO_CHROME.naoIniciou, "aplicativo auxiliar não iniciou", INSTRUCAO_INSTALACAO],
  [null, "aplicativo auxiliar encerrou", INSTRUCAO_INSTALACAO],
];

for (const [erroDoChrome, motivo, instrucao] of errosDeConexao) {
  test(`desconexão com "${erroDoChrome}" vira indisponível: ${motivo}`, async () => {
    const { canal, motor } = montar();
    canal.falharAoConectar(erroDoChrome as string);
    if (erroDoChrome === null) canal.aoConectar = (porta) => queueMicrotask(() => porta.cair(null));

    assert.deepEqual(await motor.verificar(), { estado: "indisponivel", codigo: "MOTOR_INDISPONIVEL", motivo, instrucao });
  });
}

test("sem resposta em 10 s vira indisponível e fecha a porta", async () => {
  const { canal, relogio, motor } = montar();
  let resolvido = false;

  const promessa = motor.verificar().then((r) => {
    resolvido = true;
    return r;
  });
  relogio.avancar(9_999);
  await tique();
  assert.equal(resolvido, false);
  relogio.avancar(1);

  assert.deepEqual(await promessa, {
    estado: "indisponivel",
    codigo: "MOTOR_INDISPONIVEL",
    motivo: "sem resposta",
    instrucao: INSTRUCAO_INSTALACAO,
  });
  assert.equal(canal.ultima.desconectadaPeloAdaptador, true);
});

test("resposta cancela o prazo", async () => {
  const { canal, relogio, motor } = montar();
  responderVerificacoesCom(canal, estado("pronto"));

  await motor.verificar();

  assert.equal(relogio.pendentes, 0);
});

test("verificações simultâneas são correlacionadas na ordem", async () => {
  const { canal, motor } = montar();

  const primeira = motor.verificar();
  const segunda = motor.verificar();
  canal.ultima.responder(estado("carregando"));
  canal.ultima.responder(estado("pronto"));

  assert.equal((await primeira).estado, "iniciando");
  assert.equal((await segunda).estado, "pronto");
});

test("reaproveita a conexão aberta", async () => {
  const { canal, motor } = montar();
  responderVerificacoesCom(canal, estado("pronto"));

  await motor.verificar();
  await motor.verificar();

  assert.equal(canal.portas.length, 1);
});
