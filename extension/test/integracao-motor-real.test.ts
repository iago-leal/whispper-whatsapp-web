// Bateria de contrato contra o adaptador do motor local ligado ao aplicativo auxiliar verdadeiro,
// lançado pelo canal do Node (RF-01). Exige o modelo no cache local; roda só com MOTOR_REAL=1.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { EstadoDoMotor, MotorDeTranscricao } from "../src/dominio/motor-de-transcricao.ts";
import { AdaptadorMotorLocal, INSTRUCAO_INSTALACAO } from "../src/adaptadores/motor-local/adaptador-motor-local.ts";
import { bateriaDeContrato, type Audio } from "./contrato-motor.ts";
import { CanalNode, type OpcoesDoCanalNode } from "./suporte/canal-node.ts";

const AMOSTRAS = new URL("../../amostras/sinteticas/", import.meta.url);
// O host tem até 180 s para carregar o modelo; com o disco frio, o carregamento passa de 30 s.
const PRAZO_PRONTO_MS = 180_000;
const OUTRA_EXTENSAO = "a".repeat(32);

function amostra(nome: string): Audio {
  return { bytes: new Uint8Array(readFileSync(new URL(nome, AMOSTRAS))), tipoDeMidia: "audio/ogg; codecs=opus" };
}

async function aguardarPronto(motor: MotorDeTranscricao): Promise<EstadoDoMotor> {
  const limite = Date.now() + PRAZO_PRONTO_MS;
  for (;;) {
    const estado = await motor.verificar();
    if (estado.estado !== "iniciando" || Date.now() > limite) return estado;
    await new Promise((r) => setTimeout(r, 100));
  }
}

if (process.env.MOTOR_REAL !== "1") {
  test("contrato MotorDeTranscricao: adaptador do motor local com o host real", {
    skip: "exige o modelo real; rode com MOTOR_REAL=1",
  });
} else {
  bateriaDeContrato(
    "adaptador do motor local com o host real",
    async () => {
      const canais: CanalNode[] = [];
      const motor = (opcoes?: OpcoesDoCanalNode) => {
        const canal = new CanalNode(opcoes);
        canais.push(canal);
        return new AdaptadorMotorLocal(canal);
      };
      return {
        motor: motor(),
        falaEmPortugues: () => ({ audio: amostra("fala-pt.ogg"), trecho: "reunião" }),
        falaEmIngles: () => amostra("fala-en.ogg"),
        semFala: () => amostra("silencio.ogg"),
        ilegivel: () => amostra("corrompido.ogg"),
        // Configurado para outra extensão, o host recusa a origem e encerra (DT-13), e o Chrome
        // relata "Native host has exited". O modelo ausente não serve aqui: o host responde o
        // estado "erro", que a porta traduz sem instrução (tabela 2.1).
        motorIndisponivel: () => motor({ extensaoAutorizada: OUTRA_EXTENSAO }),
        motorComVersaoIncompativel: () => motor({ protocoloDoHost: 2 }),
        encerrar: async () => {
          await Promise.all(canais.map((canal) => canal.encerrar()));
        },
      };
    },
    { prazoProntoMs: PRAZO_PRONTO_MS },
  );

  test("modelo ausente: verificação e pedido indisponíveis com o motivo, sem carregar nada (RF-08)", async () => {
    const canal = new CanalNode({ modelo: "mlx-community/modelo-inexistente" });
    try {
      const motor = new AdaptadorMotorLocal(canal);
      const { bytes, tipoDeMidia } = amostra("fala-pt.ogg");

      const estado = await motor.verificar();
      const r = await motor.transcrever(bytes, tipoDeMidia);

      assert.deepEqual(estado, { estado: "indisponivel", codigo: "MOTOR_INDISPONIVEL", motivo: "modelo não encontrado" });
      assert.deepEqual(r, { ok: false, codigo: "MOTOR_INDISPONIVEL", motivo: "modelo não encontrado" });
    } finally {
      await canal.encerrar();
    }
  });

  test("porta fechada durante o carregamento: host e trabalhador saem antes de o Chrome matar o host", async () => {
    const canal = new CanalNode();
    const porta = canal.conectar();
    const primeira = new Promise<unknown>((resolver) => porta.aoReceber(resolver));
    porta.enviar({ tipo: "verificar", protocolo: 1 });
    assert.equal(((await primeira) as { estado?: string }).estado, "carregando");
    await new Promise((r) => setTimeout(r, 500));

    const inicio = Date.now();
    await canal.encerrar();
    const decorrido = Date.now() - inicio;

    // Morto o host no prazo do Chrome, o trabalhador órfão só sairia depois de carregar o modelo.
    assert.ok(decorrido < 2_000, `host e trabalhador saíram em ${decorrido} ms`);
  });

  test("queda do host durante a transcrição: o pedido recebe MOTOR_INDISPONIVEL e o seguinte reconecta (RF-10)", async () => {
    const canal = new CanalNode();
    try {
      const motor = new AdaptadorMotorLocal(canal);
      const { bytes, tipoDeMidia } = amostra("fala-pt.ogg");
      assert.equal((await aguardarPronto(motor)).estado, "pronto");

      const emCurso = motor.transcrever(bytes, tipoDeMidia);
      // A fala leva cerca de 2 s no modelo; a queda chega com o pedido já no host.
      await new Promise((r) => setTimeout(r, 500));
      canal.derrubarHost();
      const interrompido = await emCurso;
      const seguinte = await motor.transcrever(bytes, tipoDeMidia);

      assert.deepEqual(interrompido, {
        ok: false,
        codigo: "MOTOR_INDISPONIVEL",
        motivo: "aplicativo auxiliar encerrou durante a transcrição",
        instrucao: INSTRUCAO_INSTALACAO,
      });
      assert.ok(seguinte.ok && seguinte.idioma === "pt", JSON.stringify(seguinte));
      assert.equal(canal.hostsLancados, 2);
    } finally {
      await canal.encerrar();
    }
  });
}
