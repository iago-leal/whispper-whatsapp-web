/**
 * Cache de transcrições em memória da aba (RF-06).
 *
 * Guarda os textos transcritos com sucesso durante a sessão da aba.
 * Os dados vivem apenas no ciclo de vida da página do WhatsApp Web e
 * são descartados imediatamente ao fechar ou recarregar a aba (RNF-05).
 */

import type { TemposDoPedido } from './exibicao-de-transcricao.ts';

export interface ItemTranscricaoEmMemoria {
  idAudio: string;
  texto: string;
  idioma?: string;
  duracaoAudioSeg?: number;
  concluidoEm: number;
  tempos?: TemposDoPedido; // da transcrição original, reexibidos na reabertura (RN-04)
}

export class CacheSessao {
  private itens = new Map<string, ItemTranscricaoEmMemoria>();

  guardar(item: ItemTranscricaoEmMemoria): void {
    this.itens.set(item.idAudio, item);
  }

  obter(idAudio: string): ItemTranscricaoEmMemoria | undefined {
    return this.itens.get(idAudio);
  }

  tem(idAudio: string): boolean {
    return this.itens.has(idAudio);
  }

  remover(idAudio: string): boolean {
    return this.itens.delete(idAudio);
  }

  limpar(): void {
    this.itens.clear();
  }

  tamanho(): number {
    return this.itens.size;
  }
}
