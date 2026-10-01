// Protocolo 1 entre a extensão e o aplicativo auxiliar, do lado da extensão.
// Detalhe em interfaces/protocolo-native-messaging.md; exemplos em contratos/protocolo-1.json (DT-17).

export const PROTOCOLO = 1;
export const NOME_DO_HOST = "whispper_whatsapp_web.motor";
export const LIMITE_ENTRADA_BYTES = 64 * 1024 * 1024;

export interface PedidoVerificar {
  tipo: "verificar";
  protocolo: typeof PROTOCOLO;
}

export interface PedidoTranscrever {
  tipo: "transcrever";
  protocolo: typeof PROTOCOLO;
  idPedido: string;
  midia: string;
  audioBase64: string;
}

export type EstadoDoHost = "carregando" | "pronto" | "erro";

export interface RespostaEstado {
  tipo: "estado";
  protocolo: typeof PROTOCOLO;
  versaoApp: string;
  modelo: string;
  estado: EstadoDoHost;
  motivo: string | null;
}

// Só tipo e protocolo são estáveis entre versões (§4.1); o resto da mensagem não é interpretado.
export interface EstadoDeOutroProtocolo {
  tipo: "estado";
  protocolo: number;
  estado?: undefined;
}

export interface RespostaResultado {
  tipo: "resultado";
  idPedido: string;
  texto: string;
  idioma: string;
  duracaoAudioSeg: number;
  processamentoMs: number;
}

export type CodigoDeErroDoHost =
  | "FALHA_NA_TRANSCRICAO"
  | "VERSAO_INCOMPATIVEL"
  | "MOTOR_INDISPONIVEL"
  | "MENSAGEM_INVALIDA";

export interface RespostaErro {
  tipo: "erro";
  idPedido: string | null;
  codigo: CodigoDeErroDoHost;
  motivo: string;
  detalhe?: string;
  protocoloApp?: number;
  protocoloPedido?: number;
}

export type RespostaDoHost = RespostaEstado | EstadoDeOutroProtocolo | RespostaResultado | RespostaErro;

const ESTADOS_DO_HOST: readonly unknown[] = ["carregando", "pronto", "erro"] satisfies EstadoDoHost[];
const CODIGOS_DO_HOST: readonly unknown[] = [
  "FALHA_NA_TRANSCRICAO",
  "VERSAO_INCOMPATIVEL",
  "MOTOR_INDISPONIVEL",
  "MENSAGEM_INVALIDA",
] satisfies CodigoDeErroDoHost[];

// Múltiplo de 3: cada bloco vira base64 sem preenchimento, e os pedaços podem ser concatenados.
const BLOCO_BASE64 = 3 * 10_922;

export function pedidoVerificar(): PedidoVerificar {
  return { tipo: "verificar", protocolo: PROTOCOLO };
}

export function pedidoTranscrever(idPedido: string, midia: string, audio: Uint8Array): PedidoTranscrever {
  return { tipo: "transcrever", protocolo: PROTOCOLO, idPedido, midia, audioBase64: paraBase64(audio) };
}

export function paraBase64(bytes: Uint8Array): string {
  const pedacos: string[] = [];
  for (let i = 0; i < bytes.length; i += BLOCO_BASE64) {
    pedacos.push(btoa(String.fromCharCode(...bytes.subarray(i, i + BLOCO_BASE64))));
  }
  return pedacos.join("");
}

/** Tamanho em bytes do pedido serializado, calculado sem codificar o áudio (RF-18). */
export function tamanhoDoPedido(idPedido: string, midia: string, bytesDeAudio: number): number {
  const semAudio = JSON.stringify(pedidoTranscrever(idPedido, midia, new Uint8Array(0)));
  return new TextEncoder().encode(semAudio).length + 4 * Math.ceil(bytesDeAudio / 3);
}

/** Valida uma mensagem do host; devolve null para o que não segue o protocolo. */
export function interpretarResposta(valor: unknown): RespostaDoHost | null {
  if (!ehObjeto(valor)) return null;
  switch (valor.tipo) {
    case "estado":
      return interpretarEstado(valor);
    case "resultado":
      return interpretarResultado(valor);
    case "erro":
      return interpretarErro(valor);
    default:
      return null;
  }
}

function interpretarEstado(v: Record<string, unknown>): RespostaEstado | EstadoDeOutroProtocolo | null {
  if (!Number.isInteger(v.protocolo)) return null;
  if (v.protocolo !== PROTOCOLO) return { tipo: "estado", protocolo: v.protocolo as number };
  const valido =
    ESTADOS_DO_HOST.includes(v.estado) &&
    typeof v.versaoApp === "string" &&
    typeof v.modelo === "string" &&
    (v.motivo === null || typeof v.motivo === "string");
  return valido ? (v as unknown as RespostaEstado) : null;
}

function interpretarResultado(v: Record<string, unknown>): RespostaResultado | null {
  const valido =
    typeof v.idPedido === "string" &&
    typeof v.texto === "string" &&
    typeof v.idioma === "string" &&
    Number.isFinite(v.duracaoAudioSeg) &&
    Number.isFinite(v.processamentoMs);
  return valido ? (v as unknown as RespostaResultado) : null;
}

function interpretarErro(v: Record<string, unknown>): RespostaErro | null {
  const valido =
    (v.idPedido === null || typeof v.idPedido === "string") &&
    CODIGOS_DO_HOST.includes(v.codigo) &&
    typeof v.motivo === "string" &&
    (v.detalhe === undefined || typeof v.detalhe === "string") &&
    (v.protocoloApp === undefined || Number.isInteger(v.protocoloApp)) &&
    (v.protocoloPedido === undefined || Number.isInteger(v.protocoloPedido));
  return valido ? (v as unknown as RespostaErro) : null;
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}
