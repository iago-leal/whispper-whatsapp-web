// Adaptador simulado da porta MotorDeTranscricao, para a bateria de contrato e os testes do núcleo.
// Responde conforme um roteiro, registra as chamadas e, como o host real, atende uma
// transcrição por vez, na ordem das chamadas (RF-07).

import type {
  EstadoDoMotor,
  MotorDeTranscricao,
  ResultadoDaTranscricao,
} from "../dominio/motor-de-transcricao.ts";

/** Resposta de uma chamada, com atraso opcional em milissegundos. */
export type Passo<T> = T | { resposta: T; atrasoMs: number };

/** Lista na ordem das chamadas, em que a última resposta se repete, ou função dos argumentos. */
export type Roteiro<T, A extends unknown[] = []> = readonly Passo<T>[] | ((...args: A) => Passo<T>);

export interface RoteiroDoMotorSimulado {
  verificar?: Roteiro<EstadoDoMotor>;
  transcrever?: Roteiro<ResultadoDaTranscricao, [audio: Uint8Array, tipoDeMidia: string]>;
}

export type ChamadaAoMotor =
  | { operacao: "verificar" }
  | { operacao: "transcrever"; audio: Uint8Array; tipoDeMidia: string };

export const ESTADO_SIMULADO: EstadoDoMotor = {
  estado: "pronto",
  modelo: "simulado",
  versaoApp: "simulado",
  protocolo: 1,
};

export const TRANSCRICAO_SIMULADA: ResultadoDaTranscricao = {
  ok: true,
  texto: "transcrição simulada",
  idioma: "pt",
  duracaoAudioSeg: 1,
  processamentoMs: 0,
};

export class MotorSimulado implements MotorDeTranscricao {
  readonly chamadas: ChamadaAoMotor[] = [];
  private readonly roteiro: RoteiroDoMotorSimulado;
  private verificacoes = 0;
  private transcricoes = 0;
  private fila: Promise<unknown> = Promise.resolve();

  constructor(roteiro: RoteiroDoMotorSimulado = {}) {
    this.roteiro = roteiro;
  }

  verificar(): Promise<EstadoDoMotor> {
    this.chamadas.push({ operacao: "verificar" });
    return cumprir(escolher(this.roteiro.verificar, this.verificacoes++, [], ESTADO_SIMULADO));
  }

  transcrever(audio: Uint8Array, tipoDeMidia: string): Promise<ResultadoDaTranscricao> {
    if (!(audio instanceof Uint8Array) || typeof tipoDeMidia !== "string") {
      throw new TypeError("transcrever(audio: Uint8Array, tipoDeMidia: string)");
    }
    this.chamadas.push({ operacao: "transcrever", audio, tipoDeMidia });
    const passo = escolher(this.roteiro.transcrever, this.transcricoes++, [audio, tipoDeMidia], TRANSCRICAO_SIMULADA);
    const vez = this.fila.then(() => cumprir(passo));
    this.fila = vez;
    return vez;
  }
}

function escolher<T extends object, A extends unknown[]>(
  roteiro: Roteiro<T, A> | undefined,
  indice: number,
  args: A,
  padrao: T,
): { resposta: T; atrasoMs: number } {
  let passo: Passo<T> = padrao;
  if (typeof roteiro === "function") passo = roteiro(...args);
  else if (roteiro && roteiro.length > 0) passo = roteiro[Math.min(indice, roteiro.length - 1)] ?? padrao;
  return temAtraso(passo) ? passo : { resposta: passo, atrasoMs: 0 };
}

function temAtraso<T extends object>(passo: Passo<T>): passo is { resposta: T; atrasoMs: number } {
  return "resposta" in passo && "atrasoMs" in passo;
}

// A cópia impede que quem recebe a resposta altere o roteiro das chamadas seguintes.
function cumprir<T extends object>({ resposta, atrasoMs }: { resposta: T; atrasoMs: number }): Promise<T> {
  return new Promise((resolver) => {
    if (atrasoMs > 0) setTimeout(() => resolver({ ...resposta }), atrasoMs);
    else resolver({ ...resposta });
  });
}
