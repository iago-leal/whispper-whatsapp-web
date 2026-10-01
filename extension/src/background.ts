// Service worker da extensão mínima (RF-22): hospeda o adaptador do motor local e expõe ao
// console o objeto motorDiagnostico, usado na verificação manual (onboarding.md, seção 5).

import { AdaptadorMotorLocal } from "./adaptadores/motor-local/adaptador-motor-local.ts";
import { CanalChrome } from "./adaptadores/motor-local/canal-chrome.ts";
import type { EstadoDoMotor, ResultadoDaTranscricao } from "./dominio/motor-de-transcricao.ts";

// Caminho relativo à raiz da extensão; o build copia para lá a amostra sintética em português.
const AMOSTRA = "dist/diagnostico/fala-pt.ogg";
const MIDIA_DA_AMOSTRA = "audio/ogg; codecs=opus";

export interface MotorDiagnostico {
  verificar(): Promise<EstadoDoMotor>;
  transcreverAmostra(): Promise<ResultadoDaTranscricao>;
}

declare global {
  var motorDiagnostico: MotorDiagnostico;
}

const motor = new AdaptadorMotorLocal(new CanalChrome(), {
  relogio: {
    definir: (acao, ms) => setTimeout(acao, ms),
    cancelar: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  },
  registrar: (mensagem) => console.warn(`[motor local] ${mensagem}`),
});

globalThis.motorDiagnostico = {
  verificar: () => motor.verificar(),
  async transcreverAmostra() {
    const url = chrome.runtime.getURL(AMOSTRA);
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`amostra ausente em ${url}; rode npm run build`);
    return motor.transcrever(new Uint8Array(await resposta.arrayBuffer()), MIDIA_DA_AMOSTRA);
  },
};

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((mensagem, _remetente, responder) => {
    if (!mensagem) return;

    if (mensagem.tipo === "verificar_motor") {
      motor
        .verificar()
        .then((resultado) => responder({ ok: true, resultado }))
        .catch((erro) =>
          responder({
            ok: false,
            erro: erro instanceof Error ? erro.message : String(erro),
            resultado: {
              estado: "indisponivel",
              codigo: "MOTOR_INDISPONIVEL",
              motivo: erro instanceof Error ? erro.message : String(erro)
            }
          })
        );
      return true;
    }

    if (mensagem.tipo === "transcrever_audio") {
      const bytes = Uint8Array.from(atob(mensagem.audioBase64), (c) => c.charCodeAt(0));
      motor
        .transcrever(bytes, mensagem.tipoDeMidia)
        .then((resultado) => responder({ ok: true, resultado }))
        .catch((erro) => responder({ ok: false, erro: erro instanceof Error ? erro.message : String(erro) }));
      return true; // Comunicação assíncrona
    }
  });
}

if (typeof chrome !== "undefined" && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener((detalhes) => {
    if (detalhes.reason === "install") {
      chrome.tabs.create({ url: "dist/onboarding/index.html" });
    }
  });
}


