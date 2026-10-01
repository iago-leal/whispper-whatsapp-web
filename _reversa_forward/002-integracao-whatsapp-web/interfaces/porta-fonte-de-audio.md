# Contrato: Porta FonteDeAudio

> Identificador: `porta-fonte-de-audio`
> Origem: `_reversa_sdd/sdd/nucleo-transcricao.md#8. Design e Interface`

## 1. Visão Geral

A interface `FonteDeAudio` é a porta hexagonal implementada pelo adaptador do WhatsApp Web e consumida pelo núcleo de transcrição da extensão. Ela isola o núcleo de qualquer detalhe do DOM ou das páginas do WhatsApp.

## 2. Definição TypeScript

```typescript
export interface DadosDoAudio {
  idAudio: string;
  bytes: Uint8Array;
  tipoDeMidia: string; // Ex: 'audio/ogg; codecs=opus'
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

export interface FonteDeAudio {
  /**
   * Obtém os bytes decifrados do áudio sem reprodução sonora.
   * Lança exceção com motivo padronizado ('AUDIO_INDISPONIVEL', etc.) em caso de falha.
   */
  obterAudio(idAudio: string): Promise<DadosDoAudio>;

  /**
   * Registra ouvinte para cliques no botão de transcrição.
   */
  aoSolicitarTranscricao(callback: (evento: EventoPedidoTranscricao) => void): () => void;

  /**
   * Registra ouvinte para reprodução nativa iniciada no player.
   */
  aoIniciarReproducao(callback: (evento: EventoReproducao) => void): () => void;

  /**
   * Registra ouvinte para exclusão de mensagens.
   */
  aoRemoverMensagem(callback: (idAudio: string) => void): () => void;

  /**
   * Consulta o estado operacional do adaptador na página.
   */
  verificarSaude(): { status: 'ativa' | 'degradada'; detalhes?: string[] };
}
```
