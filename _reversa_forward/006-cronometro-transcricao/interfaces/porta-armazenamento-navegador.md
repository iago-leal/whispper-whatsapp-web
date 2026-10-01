# Contrato da Porta ArmazenamentoNavegador (delta)

**Componente:** `nucleo-transcricao`
**Arquivo no código:** `extension/src/dominio/armazenamento-navegador.ts`
**Base:** `_reversa_forward/004-nucleo-transcricao/interfaces/porta-armazenamento-navegador.md`

## Assinatura TypeScript, depois da feature

```typescript
export interface ContadoresPersistidos {
  lidos: number;
  ouvidos: number;
  lidosETocados: number;
  inicioContagem: string;
  esperaAcumuladaMs: number;   // novo
  audioAcumuladoMs: number;    // novo
}

export interface MetricasContadores {
  // ... campos existentes ...
  esperaMediaSegPorMinuto: number | null;   // novo; null sem áudio acumulado
}
```

Os métodos `carregarContadores`, `salvarContadores` e `zerarContadores` não mudam de assinatura.

## Invariantes

1. `carregarContadores` devolve os campos novos sempre preenchidos: registro antigo, ausente ou inválido vira 0.
2. `zerarContadores` grava 0 nos dois campos novos junto com os demais.
3. Continua sem persistir áudio, texto, remetente ou conversa; os campos novos são totais anônimos.
4. O gerenciador de contadores relê o registro antes de cada incremento (D-11).
