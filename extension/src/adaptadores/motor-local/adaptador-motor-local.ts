// Adaptador da porta MotorDeTranscricao sobre o aplicativo auxiliar, por Native Messaging.
// Traduz estados e erros do protocolo 1 para o vocabulário da porta (RN-06) e correlaciona as
// respostas: `estado` com a verificação pendente mais antiga; `resultado` e `erro` por idPedido.

import type {
  CodigoDeErroDoMotor,
  EstadoDoMotor,
  MotorDeTranscricao,
  ResultadoDaTranscricao,
} from "../../dominio/motor-de-transcricao.ts";
import type { CanalNativo, PortaNativa } from "./canal-nativo.ts";
import {
  LIMITE_ENTRADA_BYTES,
  PROTOCOLO,
  interpretarResposta,
  pedidoTranscrever,
  pedidoVerificar,
  tamanhoDoPedido,
  type EstadoDeOutroProtocolo,
  type RespostaErro,
  type RespostaEstado,
} from "./protocolo.ts";

export const INSTRUCAO_INSTALACAO = "Instale o aplicativo auxiliar com: auxiliar/motor.sh instalar";
export const INSTRUCAO_REINSTALACAO =
  "Reinstale o aplicativo auxiliar, para que ele autorize esta extensão, com: auxiliar/motor.sh instalar";
export const INSTRUCAO_ATUALIZACAO =
  "Atualize o aplicativo auxiliar para a versão compatível com a extensão, com: auxiliar/motor.sh instalar";

export interface Relogio {
  definir(acao: () => void, ms: number): unknown;
  cancelar(id: unknown): void;
}

export interface OpcoesDoAdaptador {
  relogio?: Relogio;
  /** Destino dos defeitos de protocolo; nunca recebe trecho de áudio nem de texto (RN-02). */
  registrar?: (mensagem: string) => void;
  prazoVerificacaoMs?: number;
}

type Indisponivel = Extract<EstadoDoMotor, { estado: "indisponivel" }>;
type VerificacaoPendente = { resolver: (estado: EstadoDoMotor) => void; prazo: unknown };

const PRAZO_VERIFICACAO_MS = 10_000;
const ENCERROU = "aplicativo auxiliar encerrou";

// Textos de lastError do Chrome, comparados por trecho porque o Chrome acrescenta o ponto final.
const ERROS_DE_CONEXAO: ReadonlyArray<readonly [trecho: string, motivo: string, instrucao: string]> = [
  ["Specified native messaging host not found", "aplicativo auxiliar não instalado", INSTRUCAO_INSTALACAO],
  ["Access to the specified native messaging host is forbidden", "extensão não autorizada no aplicativo auxiliar", INSTRUCAO_REINSTALACAO],
  ["Failed to start native messaging host", "aplicativo auxiliar não iniciou", INSTRUCAO_INSTALACAO],
  ["Native host has exited", ENCERROU, INSTRUCAO_INSTALACAO],
];

const SEM_RESPOSTA = indisponivel("MOTOR_INDISPONIVEL", "sem resposta", INSTRUCAO_INSTALACAO);

const relogioDoSistema: Relogio = {
  definir: (acao, ms) => setTimeout(acao, ms),
  cancelar: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
};

export class AdaptadorMotorLocal implements MotorDeTranscricao {
  private readonly canal: CanalNativo;
  private readonly relogio: Relogio;
  private readonly registrar: (mensagem: string) => void;
  private readonly prazoVerificacaoMs: number;

  private porta: PortaNativa | null = null;
  private verificacoes: VerificacaoPendente[] = [];
  private readonly transcricoes = new Map<string, (resultado: ResultadoDaTranscricao) => void>();
  private contador = 0;
  // Depois de uma falha, o pedido seguinte verifica antes de enviar o áudio: a verificação
  // tem prazo e a transcrição não (RF-19), e o host em erro nem chega a receber o áudio.
  private verificarAntes = false;
  private filaDeEnvio: Promise<void> = Promise.resolve();
  private naFila = 0;

  constructor(canal: CanalNativo, opcoes: OpcoesDoAdaptador = {}) {
    this.canal = canal;
    this.relogio = opcoes.relogio ?? relogioDoSistema;
    this.registrar = opcoes.registrar ?? ((mensagem) => console.warn(`[motor local] ${mensagem}`));
    this.prazoVerificacaoMs = opcoes.prazoVerificacaoMs ?? PRAZO_VERIFICACAO_MS;
  }

  verificar(): Promise<EstadoDoMotor> {
    const porta = this.abrirPorta();
    return new Promise((resolver) => {
      const pendente: VerificacaoPendente = { resolver, prazo: undefined };
      pendente.prazo = this.relogio.definir(() => {
        if (this.verificacoes.includes(pendente)) this.encerrarPorta(SEM_RESPOSTA, falhaDe(SEM_RESPOSTA), true);
      }, this.prazoVerificacaoMs);
      this.verificacoes.push(pendente);
      this.postar(porta, pedidoVerificar());
    });
  }

  transcrever(audio: Uint8Array, tipoDeMidia: string): Promise<ResultadoDaTranscricao> {
    if (!(audio instanceof Uint8Array) || typeof tipoDeMidia !== "string") {
      throw new TypeError("transcrever(audio: Uint8Array, tipoDeMidia: string)");
    }
    const idPedido = `p-${this.contador + 1}`;
    if (tamanhoDoPedido(idPedido, tipoDeMidia, audio.length) > LIMITE_ENTRADA_BYTES) {
      return Promise.resolve(falha("FALHA_NA_TRANSCRICAO", "áudio maior que o limite"));
    }
    this.contador++;
    if (this.naFila === 0 && !this.verificarAntes) return this.enviar(idPedido, tipoDeMidia, audio);

    // Cada envio espera o anterior, com a verificação prévia, para sair na ordem das chamadas.
    // O embrulho em objeto evita que a fila espere também o resultado.
    this.naFila++;
    const vez = this.filaDeEnvio.then(async () => {
      try {
        if (this.verificarAntes) {
          const estado = await this.verificar();
          if (estado.estado === "indisponivel") return { resultado: Promise.resolve(falhaDe(estado)) };
        }
        return { resultado: this.enviar(idPedido, tipoDeMidia, audio) };
      } finally {
        this.naFila--;
      }
    });
    this.filaDeEnvio = vez.then(
      () => undefined,
      () => undefined,
    );
    return vez.then(({ resultado }) => resultado);
  }

  private enviar(idPedido: string, midia: string, audio: Uint8Array): Promise<ResultadoDaTranscricao> {
    const porta = this.abrirPorta();
    return new Promise((resolver) => {
      this.transcricoes.set(idPedido, resolver);
      this.postar(porta, pedidoTranscrever(idPedido, midia, audio));
    });
  }

  private abrirPorta(): PortaNativa {
    if (this.porta) return this.porta;
    const porta = this.canal.conectar();
    this.porta = porta;
    // Eventos de uma porta já substituída não dizem respeito aos pedidos atuais.
    porta.aoReceber((mensagem) => {
      if (this.porta === porta) this.aoReceber(mensagem);
    });
    porta.aoDesconectar((erro) => {
      if (this.porta === porta) this.aoCair(erro);
    });
    return porta;
  }

  private postar(porta: PortaNativa, mensagem: unknown): void {
    try {
      porta.enviar(mensagem);
    } catch {
      if (this.porta === porta) this.aoCair(null);
    }
  }

  private aoReceber(mensagem: unknown): void {
    const resposta = interpretarResposta(mensagem);
    if (resposta === null) {
      this.registrar("resposta fora do protocolo descartada");
      return;
    }
    switch (resposta.tipo) {
      case "estado":
        this.aoReceberEstado(resposta);
        break;
      case "resultado": {
        const { texto, idioma, duracaoAudioSeg, processamentoMs } = resposta;
        this.concluir(resposta.idPedido, { ok: true, texto, idioma, duracaoAudioSeg, processamentoMs });
        break;
      }
      case "erro":
        this.aoReceberErro(resposta);
        break;
    }
  }

  private aoReceberEstado(resposta: RespostaEstado | EstadoDeOutroProtocolo): void {
    const primeira = this.verificacoes[0];
    if (!primeira) return;
    const estado = traduzirEstado(resposta);
    if (estado.estado === "indisponivel") {
      // O host em erro não se recupera sozinho: fechar a porta faz a chamada seguinte
      // iniciar outro, que relê a configuração.
      this.encerrarPorta(estado, falhaDe(estado), true);
      return;
    }
    this.verificacoes.shift();
    this.relogio.cancelar(primeira.prazo);
    this.verificarAntes = false;
    primeira.resolver(estado);
  }

  private aoReceberErro(resposta: RespostaErro): void {
    const detalhe = resposta.detalhe === undefined ? "" : ` (${resposta.detalhe})`;
    if (resposta.idPedido === null) {
      this.registrar(`erro ${resposta.codigo} sem idPedido${detalhe}`);
      return;
    }
    if (resposta.codigo === "MENSAGEM_INVALIDA") {
      // Recusa do pedido pelo host aponta defeito deste adaptador, não do áudio.
      this.registrar(`pedido ${resposta.idPedido} recusado como mensagem inválida${detalhe}`);
      this.concluir(resposta.idPedido, falha("FALHA_NA_TRANSCRICAO", "mensagem inválida"));
      return;
    }
    const resultado = falha(resposta.codigo, resposta.motivo);
    this.concluir(resposta.idPedido, resultado);
    if (resposta.codigo !== "FALHA_NA_TRANSCRICAO") {
      this.encerrarPorta(indisponivel(resposta.codigo, resposta.motivo), resultado, true);
    }
  }

  private concluir(idPedido: string, resultado: ResultadoDaTranscricao): void {
    const resolver = this.transcricoes.get(idPedido);
    if (!resolver) {
      this.registrar(`resposta para pedido desconhecido: ${idPedido}`);
      return;
    }
    this.transcricoes.delete(idPedido);
    resolver(resultado);
  }

  private aoCair(erro: string | null): void {
    const previsto = ERROS_DE_CONEXAO.find(([trecho]) => erro?.includes(trecho));
    if (erro !== null && !previsto) this.registrar(`desconexão com erro não previsto: ${erro}`);
    const [, motivo, instrucao] = previsto ?? ["", ENCERROU, INSTRUCAO_INSTALACAO];
    const motivoDoPedido = motivo === ENCERROU ? `${ENCERROU} durante a transcrição` : motivo;
    this.encerrarPorta(
      indisponivel("MOTOR_INDISPONIVEL", motivo, instrucao),
      falha("MOTOR_INDISPONIVEL", motivoDoPedido, instrucao),
      false,
    );
  }

  private encerrarPorta(estado: Indisponivel, resultado: ResultadoDaTranscricao, desconectar: boolean): void {
    const porta = this.porta;
    this.porta = null;
    this.verificarAntes = true;
    if (desconectar) porta?.desconectar();
    for (const pendente of this.verificacoes.splice(0)) {
      this.relogio.cancelar(pendente.prazo);
      pendente.resolver({ ...estado });
    }
    const transcricoes = [...this.transcricoes.values()];
    this.transcricoes.clear();
    for (const resolver of transcricoes) resolver({ ...resultado });
  }
}

function traduzirEstado(resposta: RespostaEstado | EstadoDeOutroProtocolo): EstadoDoMotor {
  if (resposta.estado === undefined) {
    return indisponivel(
      "VERSAO_INCOMPATIVEL",
      `versão de protocolo incompatível (extensão ${PROTOCOLO}, aplicativo ${resposta.protocolo})`,
      INSTRUCAO_ATUALIZACAO,
    );
  }
  const { modelo, versaoApp, protocolo } = resposta;
  switch (resposta.estado) {
    case "pronto":
      return { estado: "pronto", modelo, versaoApp, protocolo };
    case "carregando":
      return { estado: "iniciando", modelo, versaoApp, protocolo };
    case "erro":
      return indisponivel("MOTOR_INDISPONIVEL", resposta.motivo ?? "aplicativo auxiliar em erro");
  }
}

// A instrução só entra quando existe: para a porta, chave com valor undefined difere de chave ausente.
function indisponivel(codigo: Indisponivel["codigo"], motivo: string, instrucao?: string): Indisponivel {
  return instrucao === undefined
    ? { estado: "indisponivel", codigo, motivo }
    : { estado: "indisponivel", codigo, motivo, instrucao };
}

function falha(codigo: CodigoDeErroDoMotor, motivo: string, instrucao?: string): ResultadoDaTranscricao {
  return instrucao === undefined ? { ok: false, codigo, motivo } : { ok: false, codigo, motivo, instrucao };
}

function falhaDe({ codigo, motivo, instrucao }: Indisponivel): ResultadoDaTranscricao {
  return falha(codigo, motivo, instrucao);
}
