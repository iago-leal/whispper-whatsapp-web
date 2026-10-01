/**
 * Porta hexagonal ExibicaoDeTranscricao.
 *
 * Contrato que o núcleo de transcrição utiliza para abrir e atualizar
 * as janelas flutuantes que exibem os textos transcritos.
 */

export type EstadoExibicao =
  | { tipo: 'fila'; posicaoNaFila: number }
  | { tipo: 'transcrevendo'; segundosDecorridos: number }
  | { tipo: 'concluido'; texto: string; idioma?: string }
  | { tipo: 'erro'; mensagem: string; motivo: string };

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
