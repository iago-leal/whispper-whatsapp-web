// Porta MotorDeTranscricao: o contrato pelo qual o núcleo pede transcrições sem conhecer
// o aplicativo auxiliar (DT-10). Nenhuma dependência do Chrome.

export type CodigoDeErroDoMotor =
  | "MOTOR_INDISPONIVEL"
  | "VERSAO_INCOMPATIVEL"
  | "FALHA_NA_TRANSCRICAO";

export type EstadoDoMotor =
  | { estado: "pronto"; modelo: string; versaoApp: string; protocolo: number }
  | { estado: "iniciando"; modelo?: string; versaoApp?: string; protocolo?: number }
  | {
      estado: "indisponivel";
      codigo: "MOTOR_INDISPONIVEL" | "VERSAO_INCOMPATIVEL";
      motivo: string;
      instrucao?: string;
    };

export type ResultadoDaTranscricao =
  | { ok: true; texto: string; idioma: string; duracaoAudioSeg: number; processamentoMs: number }
  | { ok: false; codigo: CodigoDeErroDoMotor; motivo: string; instrucao?: string };

// As promessas nunca são rejeitadas por falha prevista (DT-11): o erro é valor do contrato.
// Só erro de programação, como argumento de tipo errado, lança exceção.
export interface MotorDeTranscricao {
  verificar(): Promise<EstadoDoMotor>;
  transcrever(audio: Uint8Array, tipoDeMidia: string): Promise<ResultadoDaTranscricao>;
}
