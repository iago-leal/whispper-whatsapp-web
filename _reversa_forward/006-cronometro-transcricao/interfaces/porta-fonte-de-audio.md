# Contrato da Porta FonteDeAudio (delta)

**Componente:** `integracao-whatsapp-web`, usada por `nucleo-transcricao`
**Arquivo no código:** `extension/src/dominio/fonte-de-audio.ts`
**Base:** `_reversa_sdd/sdd/nucleo-transcricao.md#10`, `_reversa_sdd/sdd/integracao-whatsapp-web.md#6.1` (RF-16)

## Acréscimo

```typescript
export type EstadoPedidoIcone =
  | { tipo: 'ocioso' }
  | { tipo: 'espera'; inicioEsperaEm: number }
  | { tipo: 'concluido' }
  | { tipo: 'erro' };

export interface FonteDeAudio {
  // ... operações existentes, inalteradas ...

  /**
   * Reflete no ícone da mensagem o estado do pedido (RF-16 da integração).
   * Chamado pelo núcleo a cada transição, com ou sem janela aberta.
   */
  refletirEstadoPedido(idAudio: string, estado: EstadoPedidoIcone): void;
}
```

## Invariantes

1. Síncrona e sem exceção: falha de DOM é absorvida no adaptador (RNF-04 da integração).
2. O adaptador guarda o último estado por `idAudio` e o aplica a todo botão injetado depois para o mesmo áudio (RF-08 desta feature).
3. Áudio sem botão visível no momento só tem o estado guardado.
4. Em `espera`, o ícone pulsa e mostra o contador a partir de `inicioEsperaEm`; nos demais estados, o contador some.

## Mapeamento das transições do núcleo

| Evento no núcleo | Estado refletido |
|------------------|------------------|
| Pedido enfileirado ou "Tentar de novo" | `espera` com o instante do clique |
| Saída da fila | `espera`, mesmo instante (idempotente) |
| Conclusão, inclusive com janela fechada | `concluido` |
| Reabertura pelo cache | `concluido` |
| Erro, inclusive motor indisponível e tempo esgotado | `erro` |
| Janela de pedido na fila fechada (pedido removido) | `ocioso` |
