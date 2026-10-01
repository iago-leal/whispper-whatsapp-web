# Contrato: Porta ExibicaoDeTranscricao

> Identificador: `porta-exibicao-de-transcricao`
> Origem: `_reversa_sdd/sdd/nucleo-transcricao.md#8. Design e Interface`

## 1. Visão Geral

A interface `ExibicaoDeTranscricao` é a porta hexagonal que o núcleo da extensão utiliza para comandar a interface de exibição visual (janela flutuante), sem conhecer detalhes de renderização no DOM do WhatsApp.

## 2. Definição TypeScript

```typescript
export interface ExibicaoDeTranscricao {
  /**
   * Abre uma janela flutuante ancorada ao áudio indicado.
   */
  abrir(idAudio: string): void;

  /**
   * Atualiza o estado da janela flutuante indicada.
   */
  definirEstado(
    idAudio: string,
    estado: 
      | { tipo: 'fila'; posicaoNaFila: number }
      | { tipo: 'transcrevendo'; segundosDecorridos: number }
      | { tipo: 'concluido'; texto: string; idioma?: string }
      | { tipo: 'erro'; mensagem: string; motivo: string }
  ): void;

  /**
   * Traz a janela para frente e aplica realce temporário.
   */
  destacar(idAudio: string): void;

  /**
   * Fecha a janela indicada.
   */
  fechar(idAudio: string): void;

  /**
   * Registra ouvinte para quando o usuário fecha a janela manualmente.
   */
  aoFechar(callback: (idAudio: string) => void): () => void;

  /**
   * Registra ouvinte para quando o usuário clica em "Tentar de novo" no estado de erro.
   */
  aoReexecutar(callback: (idAudio: string) => void): () => void;
}
```
