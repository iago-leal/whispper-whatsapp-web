// Bateria de contrato da porta MotorDeTranscricao, parametrizada pela implementação.
// Roda contra o adaptador simulado sempre e contra o adaptador real com MOTOR_REAL=1.

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import type { MotorDeTranscricao } from "../src/dominio/motor-de-transcricao.ts";

export type Audio = { bytes: Uint8Array; tipoDeMidia: string };

export interface CenarioDeContrato {
  motor: MotorDeTranscricao;
  falaEmPortugues(): { audio: Audio; trecho: string };
  falaEmIngles(): Audio;
  semFala(): Audio;
  ilegivel(): Audio;
  motorIndisponivel?(): MotorDeTranscricao;
  motorComVersaoIncompativel?(): MotorDeTranscricao;
  encerrar(): Promise<void>;
}

export function bateriaDeContrato(
  nome: string,
  criar: () => Promise<CenarioDeContrato>,
  opcoes: { prazoProntoMs?: number } = {},
): void {
  const prazoProntoMs = opcoes.prazoProntoMs ?? 5_000;

  describe(`contrato MotorDeTranscricao: ${nome}`, () => {
    let c: CenarioDeContrato;

    before(async () => {
      c = await criar();
    });

    after(async () => {
      await c.encerrar();
    });

    test("verificar passa por iniciando até pronto", async () => {
      const limite = Date.now() + prazoProntoMs;
      for (;;) {
        const estado = await c.motor.verificar();
        assert.ok(estado.estado === "iniciando" || estado.estado === "pronto", JSON.stringify(estado));
        if (estado.estado === "pronto") {
          assert.equal(typeof estado.modelo, "string");
          assert.equal(typeof estado.versaoApp, "string");
          assert.equal(estado.protocolo, 1);
          return;
        }
        assert.ok(Date.now() < limite, "o motor não ficou pronto no prazo");
        await new Promise((r) => setTimeout(r, 50));
      }
    });

    test("transcreve fala com texto, idioma, duração e tempo", async () => {
      const { audio, trecho } = c.falaEmPortugues();

      const r = await c.motor.transcrever(audio.bytes, audio.tipoDeMidia);

      assert.ok(r.ok, JSON.stringify(r));
      assert.ok(r.texto.toLowerCase().includes(trecho), r.texto);
      assert.equal(r.idioma, "pt");
      assert.ok(r.duracaoAudioSeg > 0);
      assert.ok(Number.isInteger(r.processamentoMs) && r.processamentoMs >= 0);
    });

    test("áudio sem fala devolve texto vazio, sem erro", async () => {
      const audio = c.semFala();

      const r = await c.motor.transcrever(audio.bytes, audio.tipoDeMidia);

      assert.ok(r.ok, JSON.stringify(r));
      assert.equal(r.texto, "");
    });

    test("áudio ilegível devolve FALHA_NA_TRANSCRICAO", async () => {
      const audio = c.ilegivel();

      const r = await c.motor.transcrever(audio.bytes, audio.tipoDeMidia);

      assert.deepEqual(r, { ok: false, codigo: "FALHA_NA_TRANSCRICAO", motivo: "áudio ilegível" });
    });

    test("três chamadas simultâneas terminam na ordem das chamadas", async () => {
      const pt = c.falaEmPortugues().audio;
      const en = c.falaEmIngles();
      const vazio = c.semFala();
      const ordem: number[] = [];

      const resultados = await Promise.all(
        [pt, en, vazio].map((a, i) =>
          c.motor.transcrever(a.bytes, a.tipoDeMidia).then((r) => {
            ordem.push(i);
            return r;
          }),
        ),
      );

      assert.deepEqual(ordem, [0, 1, 2]);
      assert.ok(resultados.every((r) => r.ok));
      const [rPt, rEn, rVazio] = resultados;
      assert.ok(rPt?.ok && rPt.idioma === "pt");
      assert.ok(rEn?.ok && rEn.idioma === "en");
      assert.ok(rVazio?.ok && rVazio.texto === "");
    });

    test("motor indisponível responde MOTOR_INDISPONIVEL com instrução", async (t) => {
      if (!c.motorIndisponivel) return t.skip("implementação sem esse cenário");
      const motor = c.motorIndisponivel();
      const audio = c.falaEmPortugues().audio;

      const estado = await motor.verificar();
      const r = await motor.transcrever(audio.bytes, audio.tipoDeMidia);

      assert.equal(estado.estado, "indisponivel");
      assert.ok(estado.estado === "indisponivel" && estado.codigo === "MOTOR_INDISPONIVEL");
      assert.ok(estado.motivo.length > 0 && typeof estado.instrucao === "string");
      assert.ok(!r.ok && r.codigo === "MOTOR_INDISPONIVEL");
    });

    test("versão incompatível responde VERSAO_INCOMPATIVEL", async (t) => {
      if (!c.motorComVersaoIncompativel) return t.skip("implementação sem esse cenário");
      const motor = c.motorComVersaoIncompativel();
      const audio = c.falaEmPortugues().audio;

      const estado = await motor.verificar();
      const r = await motor.transcrever(audio.bytes, audio.tipoDeMidia);

      assert.ok(estado.estado === "indisponivel" && estado.codigo === "VERSAO_INCOMPATIVEL");
      assert.ok(!r.ok && r.codigo === "VERSAO_INCOMPATIVEL");
    });
  });
}
