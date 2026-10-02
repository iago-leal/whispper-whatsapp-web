import type {
  FonteDeAudio,
  DadosDoAudio,
  EventoPedidoTranscricao,
  EventoReproducao,
  CoordenadasAncora,
  StatusSaudeFonte,
  EstadoPedidoIcone
} from '../dominio/fonte-de-audio.ts';
import { extrairAudio } from '../content/extrator-audio.ts';
import { RastreadorDeAncoras } from '../content/rastreador-ancora.ts';
import { avaliarSaudeDasEstruturas } from '../content/monitor-degradacao.ts';
import type { MensagemDetectada } from '../content/detector-mensagens.ts';
import { aplicarEstadoIcone } from '../content/botao-transcricao.ts';
import { CronometroDeEspera } from '../content/cronometro-espera.ts';

export class AdaptadorWhatsAppWeb implements FonteDeAudio {
  private mensagens = new Map<string, MensagemDetectada>();
  private rastreadorAncoras = new RastreadorDeAncoras();
  private ouvintesTranscricao: Array<(ev: EventoPedidoTranscricao) => void> = [];
  private ouvintesReproducao: Array<(ev: EventoReproducao) => void> = [];
  private ouvintesRemocao: Array<(id: string) => void> = [];
  // Último estado de cada pedido e o botão em tela: a página recria o balão na rolagem e na troca
  // de conversa, e o botão novo herda o estado (RF-08 da feature 006).
  private estadosIcone = new Map<string, EstadoPedidoIcone>();
  private botoes = new Map<string, HTMLElement>();

  private readonly cronometro: CronometroDeEspera;

  constructor(cronometro: CronometroDeEspera = new CronometroDeEspera()) {
    this.cronometro = cronometro;
  }

  registrarMensagem(mensagem: MensagemDetectada): void {
    this.mensagens.set(mensagem.idAudio, mensagem);
    this.rastreadorAncoras.registrar(mensagem.idAudio, mensagem.elementoBalao);
  }

  /**
   * Associa o botão injetado ao áudio e aplica nele o estado já conhecido do pedido.
   */
  registrarBotao(idAudio: string, botao: HTMLElement): void {
    this.botoes.set(idAudio, botao);
    const estado = this.estadosIcone.get(idAudio);
    if (estado) this.aplicarNoBotao(botao, estado);
  }

  refletirEstadoPedido(idAudio: string, estado: EstadoPedidoIcone): void {
    if (estado.tipo === 'ocioso') this.estadosIcone.delete(idAudio);
    else this.estadosIcone.set(idAudio, estado);
    const botao = this.botoes.get(idAudio);
    if (botao) this.aplicarNoBotao(botao, estado);
  }

  private aplicarNoBotao(botao: HTMLElement, estado: EstadoPedidoIcone): void {
    try {
      aplicarEstadoIcone(botao, estado, this.cronometro);
    } catch (err) {
      // RNF-04 da integração: falha ao desenhar o ícone não chega ao console da página como exceção
      console.warn('[Whispper] Falha ao refletir o estado no ícone:', err);
    }
  }

  removerMensagem(idAudio: string): void {
    this.mensagens.delete(idAudio);
    this.estadosIcone.delete(idAudio);
    this.botoes.delete(idAudio);
    this.rastreadorAncoras.remover(idAudio);
    for (const ouvinte of this.ouvintesRemocao) {
      ouvinte(idAudio);
    }
  }

  async obterAudio(idAudio: string): Promise<DadosDoAudio> {
    if (!this.mensagens.has(idAudio)) {
      throw new Error(`AUDIO_INDISPONIVEL: mensagem ${idAudio} não encontrada no contexto ativo`);
    }
    return extrairAudio(idAudio);
  }

  solicitarTranscricaoManual(idAudio: string): void {
    const mensagem = this.mensagens.get(idAudio);
    const direcao = mensagem ? mensagem.direcao : 'recebido';
    for (const ouvinte of this.ouvintesTranscricao) {
      ouvinte({ idAudio, direcao });
    }
  }

  notificarReproducao(idAudio: string): void {
    const mensagem = this.mensagens.get(idAudio);
    const direcao = mensagem ? mensagem.direcao : 'recebido';
    for (const ouvinte of this.ouvintesReproducao) {
      ouvinte({ idAudio, direcao });
    }
  }

  aoSolicitarTranscricao(callback: (evento: EventoPedidoTranscricao) => void): () => void {
    this.ouvintesTranscricao.push(callback);
    return () => {
      this.ouvintesTranscricao = this.ouvintesTranscricao.filter((c) => c !== callback);
    };
  }

  aoIniciarReproducao(callback: (evento: EventoReproducao) => void): () => void {
    this.ouvintesReproducao.push(callback);
    return () => {
      this.ouvintesReproducao = this.ouvintesReproducao.filter((c) => c !== callback);
    };
  }

  aoRemoverMensagem(callback: (idAudio: string) => void): () => void {
    this.ouvintesRemocao.push(callback);
    return () => {
      this.ouvintesRemocao = this.ouvintesRemocao.filter((c) => c !== callback);
    };
  }

  aoMudarAncora(callback: (ancora: CoordenadasAncora) => void): () => void {
    return this.rastreadorAncoras.aoMudarAncora(callback);
  }

  /**
   * Retângulo e visibilidade atuais do balão da mensagem, ou null se ela não foi detectada.
   */
  obterAncora(idAudio: string): CoordenadasAncora | null {
    return this.rastreadorAncoras.obterAncora(idAudio);
  }

  verificarSaude(): StatusSaudeFonte {
    return avaliarSaudeDasEstruturas();
  }

  destruir(): void {
    this.rastreadorAncoras.destruir();
    this.mensagens.clear();
    this.estadosIcone.clear();
    this.botoes.clear();
    this.ouvintesTranscricao = [];
    this.ouvintesReproducao = [];
    this.ouvintesRemocao = [];
  }
}
