# Delta de Dados: Janela Flutuante

> Feature: `003-janela-flutuante`
> Data: 2026-10-01

## 1. Estruturas em Memória (Content Script)

```typescript
export type EstadoJanela = 
  | { tipo: 'fila'; posicaoNaFila: number }
  | { tipo: 'transcrevendo'; segundosDecorridos: number }
  | { tipo: 'concluido'; texto: string; idioma?: string }
  | { tipo: 'erro'; mensagem: string; motivo: string };

export interface JanelaAtiva {
  idAudio: string;
  elementoJanela: HTMLElement;
  estado: EstadoJanela;
  ancora?: {
    x: number;
    y: number;
    largura: number;
    altura: number;
    visivel: boolean;
  };
  posicaoRenderizada: {
    x: number;
    y: number;
    visivel: boolean;
  };
}
```
