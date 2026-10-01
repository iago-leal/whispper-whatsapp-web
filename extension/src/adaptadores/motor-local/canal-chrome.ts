// Canal de Native Messaging sobre a API do Chrome: o único trecho do adaptador que toca o navegador.

import type { CanalNativo, PortaNativa } from "./canal-nativo.ts";
import { NOME_DO_HOST } from "./protocolo.ts";

export class CanalChrome implements CanalNativo {
  conectar(): PortaNativa {
    const porta = chrome.runtime.connectNative(NOME_DO_HOST);
    return {
      enviar: (mensagem) => porta.postMessage(mensagem),
      aoReceber: (ouvinte) => porta.onMessage.addListener((mensagem: unknown) => ouvinte(mensagem)),
      // O Chrome só preenche lastError durante o próprio callback de onDisconnect.
      aoDesconectar: (ouvinte) =>
        porta.onDisconnect.addListener(() => ouvinte(chrome.runtime.lastError?.message ?? null)),
      desconectar: () => porta.disconnect(),
    };
  }
}
