// Canal de Native Messaging simulado, com o comportamento assíncrono do Chrome:
// a falha de conexão chega como desconexão com lastError, depois de connectNative.

import type { CanalNativo, PortaNativa } from "../../src/adaptadores/motor-local/canal-nativo.ts";

export const ERROS_DO_CHROME = {
  naoEncontrado: "Specified native messaging host not found.",
  proibido: "Access to the specified native messaging host is forbidden.",
  encerrou: "Native host has exited.",
  naoIniciou: "Failed to start native messaging host.",
} as const;

export class PortaSimulada implements PortaNativa {
  readonly enviadas: unknown[] = [];
  fechada = false;
  desconectadaPeloAdaptador = false;
  private ouvinteDeMensagem?: (mensagem: unknown) => void;
  private ouvinteDeDesconexao?: (erro: string | null) => void;
  private readonly canal: CanalSimulado;

  constructor(canal: CanalSimulado) {
    this.canal = canal;
  }

  enviar(mensagem: unknown): void {
    if (this.fechada) throw new Error("Attempting to use a disconnected port object");
    this.enviadas.push(mensagem);
    this.canal.aoEnviar?.(this, mensagem);
  }

  aoReceber(ouvinte: (mensagem: unknown) => void): void {
    this.ouvinteDeMensagem = ouvinte;
  }

  aoDesconectar(ouvinte: (erro: string | null) => void): void {
    this.ouvinteDeDesconexao = ouvinte;
  }

  desconectar(): void {
    this.fechada = true;
    this.desconectadaPeloAdaptador = true;
  }

  responder(mensagem: unknown): void {
    if (!this.fechada) this.ouvinteDeMensagem?.(mensagem);
  }

  cair(erro: string | null = ERROS_DO_CHROME.encerrou): void {
    if (this.fechada) return;
    this.fechada = true;
    this.ouvinteDeDesconexao?.(erro);
  }
}

export class CanalSimulado implements CanalNativo {
  readonly portas: PortaSimulada[] = [];
  aoConectar?: (porta: PortaSimulada) => void;
  aoEnviar?: (porta: PortaSimulada, mensagem: unknown) => void;

  conectar(): PortaNativa {
    const porta = new PortaSimulada(this);
    this.portas.push(porta);
    this.aoConectar?.(porta);
    return porta;
  }

  get ultima(): PortaSimulada {
    const porta = this.portas.at(-1);
    if (!porta) throw new Error("nenhuma porta aberta");
    return porta;
  }

  falharAoConectar(erro: string): void {
    this.aoConectar = (porta) => queueMicrotask(() => porta.cair(erro));
  }
}

export function estado(valor: "pronto" | "carregando" | "erro", extra: Record<string, unknown> = {}) {
  return { tipo: "estado", protocolo: 1, versaoApp: "1.0.0", modelo: "m", estado: valor, motivo: null, ...extra };
}

export function resultado(idPedido: string, extra: Record<string, unknown> = {}) {
  return { tipo: "resultado", idPedido, texto: "olá", idioma: "pt", duracaoAudioSeg: 2.5, processamentoMs: 300, ...extra };
}

export function erro(idPedido: string | null, codigo: string, motivo: string) {
  return { tipo: "erro", idPedido, codigo, motivo };
}

export function tipoDe(mensagem: unknown): string | undefined {
  return (mensagem as { tipo?: string }).tipo;
}

export function idDe(mensagem: unknown): string | undefined {
  return (mensagem as { idPedido?: string }).idPedido;
}

export async function tique(): Promise<void> {
  await new Promise((r) => setImmediate(r));
}
