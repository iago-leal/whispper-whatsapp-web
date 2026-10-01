/**
 * Porta hexagonal ExibicaoDeTranscricao.
 *
 * Contrato que o núcleo de transcrição utiliza para abrir e atualizar
 * as janelas flutuantes que exibem os textos transcritos.
 */

/**
 * Tempos de um pedido concluído, medidos do clique ao texto.
 */
export interface TemposDoPedido {
  esperaTotalMs: number;
  esperaFilaMs: number;
  duracaoAudioSeg?: number; // ausente quando nem o motor nem a página informaram
}

/**
 * Os estados de espera levam o instante do clique, no relógio compartilhado com a exibição:
 * o núcleo notifica uma vez por transição, e a exibição faz o tempo andar.
 */
export type EstadoExibicao =
  | { tipo: 'fila'; posicaoNaFila: number; inicioEsperaEm: number }
  | { tipo: 'transcrevendo'; inicioEsperaEm: number }
  | { tipo: 'concluido'; texto: string; idioma?: string; tempos?: TemposDoPedido }
  | { tipo: 'erro'; mensagem: string; motivo: string; falhouAposMs?: number };

export interface ExibicaoDeTranscricao {
  /**
   * Abre uma janela flutuante ancorada ao áudio indicado.
   */
  abrir(idAudio: string): void;

  /**
   * Atualiza o estado da janela flutuante correspondente.
   */
  definirEstado(idAudio: string, estado: EstadoExibicao): void;

  /**
   * Traz a janela para frente e aplica destaque temporário.
   */
  destacar(idAudio: string): void;

  /**
   * Fecha e descarta a janela do áudio.
   */
  fechar(idAudio: string): void;

  /**
   * Registra callback para quando o usuário fechar a janela manualmente.
   */
  aoFechar(callback: (idAudio: string) => void): () => void;

  /**
   * Registra callback para quando o usuário clicar em "Tentar de novo" no estado de erro.
   */
  aoReexecutar(callback: (idAudio: string) => void): () => void;
}
