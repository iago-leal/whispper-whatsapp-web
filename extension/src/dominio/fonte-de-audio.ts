/**
 * Porta hexagonal FonteDeAudio.
 *
 * Descreve a interface de obtenção de áudio e eventos da página (WhatsApp Web)
 * sem vazar nenhum detalhe de DOM para o núcleo de transcrição da extensão.
 */

export interface DadosDoAudio {
  idAudio: string;
  bytes: Uint8Array;
  tipoDeMidia: string; // Ex: 'audio/ogg; codecs=opus' ou 'audio/mp4'
  duracaoSeg: number;
}

export interface EventoPedidoTranscricao {
  idAudio: string;
  direcao: 'recebido' | 'enviado';
}

export interface EventoReproducao {
  idAudio: string;
  direcao: 'recebido' | 'enviado';
}

export interface CoordenadasAncora {
  idAudio: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  visivel: boolean;
}

export type StatusSaudeFonte = 
  | { status: 'ativa'; versaoEstruturas: string }
  | { status: 'degradada'; estruturasAusentes: string[]; versaoEstruturas: string };

/**
 * Estado do pedido refletido no ícone da mensagem (RF-16 da integração). Em espera, o ícone conta
 * o tempo a partir do instante do clique, no relógio compartilhado com o núcleo.
 */
export type EstadoPedidoIcone =
  | { tipo: 'ocioso' }
  | { tipo: 'espera'; inicioEsperaEm: number }
  | { tipo: 'concluido' }
  | { tipo: 'erro' };

export interface FonteDeAudio {
  /**
   * Obtém os bytes do áudio decifrado da mensagem de voz.
   */
  obterAudio(idAudio: string): Promise<DadosDoAudio>;

  /**
   * Registra callback chamado quando o usuário clica no botão de transcrever.
   * Retorna uma função de cancelamento da inscrição.
   */
  aoSolicitarTranscricao(callback: (evento: EventoPedidoTranscricao) => void): () => void;

  /**
   * Registra callback chamado quando o áudio começa a ser reproduzido pelo player nativo.
   */
  aoIniciarReproducao(callback: (evento: EventoReproducao) => void): () => void;

  /**
   * Registra callback chamado quando a mensagem é apagada para todos.
   */
  aoRemoverMensagem(callback: (idAudio: string) => void): () => void;

  /**
   * Registra callback chamado quando as coordenadas geométricas da âncora mudam.
   */
  aoMudarAncora(callback: (ancora: CoordenadasAncora) => void): () => void;

  /**
   * Retorna o estado de saúde do adaptador na página.
   */
  verificarSaude(): StatusSaudeFonte;

  /**
   * Reflete no ícone da mensagem o estado do pedido, com ou sem janela aberta.
   * O adaptador guarda o último estado por áudio e o reaplica ao ícone recriado pela página.
   */
  refletirEstadoPedido(idAudio: string, estado: EstadoPedidoIcone): void;
}
