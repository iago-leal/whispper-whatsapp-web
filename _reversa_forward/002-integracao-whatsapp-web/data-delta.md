# Delta de Dados: Integração com WhatsApp Web

> Feature: `002-integracao-whatsapp-web`
> Data: 2026-10-01

## 1. Entidades de Memória em Runtime (Content Script)

Esta feature não possui banco de dados relacional nem armazenamento persistente em disco. Todos os dados operam na memória volátil da aba aberta do navegador (`web.whatsapp.com`):

### 1.1 `MensagemDeVoz`
```typescript
export interface MensagemDeVoz {
  idAudio: string;                // Hash estável derivado do data-id do balão
  direcao: 'recebido' | 'enviado';
  duracaoSeg: number;
  elementoBalao: HTMLElement;     // Referência viva para cálculo de âncora
  blobUrl?: string;               // URL blob interceptada do áudio decifrado
}
```

### 1.2 `CoordenadasAncora`
```typescript
export interface CoordenadasAncora {
  idAudio: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  visivel: boolean;
}
```

### 1.3 `EstadoIntegracao`
```typescript
export type EstadoIntegracao = 
  | { status: 'ativa'; versaoEstruturas: string }
  | { status: 'degradada'; estruturasAusentes: string[]; versaoEstruturas: string };
```
