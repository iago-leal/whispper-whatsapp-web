import type {
  FonteDeAudio,
  DadosDoAudio,
  EventoPedidoTranscricao,
  EventoReproducao,
  CoordenadasAncora,
  StatusSaudeFonte
} from '../dominio/fonte-de-audio.ts';
import { extrairAudio } from '../content/extrator-audio.ts';
import { RastreadorDeAncoras } from '../content/rastreador-ancora.ts';
import { avaliarSaudeDasEstruturas } from '../content/monitor-degradacao.ts';
import type { MensagemDetectada } from '../content/detector-mensagens.ts';

export class AdaptadorWhatsAppWeb implements FonteDeAudio {
  private mensagens = new Map<string, MensagemDetectada>();
  private rastreadorAncoras = new RastreadorDeAncoras();
  private ouvintesTranscricao: Array<(ev: EventoPedidoTranscricao) => void> = [];
  private ouvintesReproducao: Array<(ev: EventoReproducao) => void> = [];
  private ouvintesRemocao: Array<(id: string) => void> = [];

  registrarMensagem(mensagem: MensagemDetectada): void {
    this.mensagens.set(mensagem.idAudio, mensagem);
    this.rastreadorAncoras.registrar(mensagem.idAudio, mensagem.elementoBalao);
  }

  removerMensagem(idAudio: string): void {
    this.mensagens.delete(idAudio);
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

  verificarSaude(): StatusSaudeFonte {
    return avaliarSaudeDasEstruturas();
  }

  destruir(): void {
    this.rastreadorAncoras.destruir();
    this.mensagens.clear();
    this.ouvintesTranscricao = [];
    this.ouvintesReproducao = [];
    this.ouvintesRemocao = [];
  }
}
