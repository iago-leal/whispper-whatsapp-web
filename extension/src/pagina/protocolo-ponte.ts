/**
 * Protocolo entre o script de conteúdo e a ponte de áudio do mundo da página (BUG-20261001-2MOY).
 *
 * O aperto de mão passa por window.postMessage e só entrega a porta; pedidos e áudios trafegam
 * depois pela porta privada, fora do alcance dos ouvintes de mensagens da janela.
 */

/** Marca do aperto de mão na janela. */
export const CANAL_DA_PONTE = 'whispper:ponte-de-audio';

export interface AvisoDeConexao {
  canal: typeof CANAL_DA_PONTE;
  tipo: 'conectar';
}

export interface PedidoDeAudio {
  pedido: number;
  // Identificador da mensagem na página: o data-id do balão
  idMensagem: string;
}

/** Por que a página não entregou o áudio. */
export type FalhaDaPonte = 'estrutura-ausente' | 'mensagem-ausente' | 'download';

export type RespostaDaPonte =
  | { tipo: 'pronta' }
  | { tipo: 'audio'; pedido: number; bytes: ArrayBuffer; tipoDeMidia: string; duracaoSeg: number }
  | { tipo: 'falha'; pedido: number; falha: FalhaDaPonte; detalhe: string };
