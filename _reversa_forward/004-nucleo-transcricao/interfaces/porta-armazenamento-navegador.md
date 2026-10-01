# Contrato da Porta ArmazenamentoNavegador

**Componente:** `nucleo-transcricao`
**Arquivo correspondente no código:** `extension/src/dominio/armazenamento-navegador.ts`

---

## Assinatura TypeScript

```typescript
export interface ContadoresPersistidos {
  lidos: number;
  ouvidos: number;
  lidosETocados: number;
  inicioContagem: string;
}

export interface ArmazenamentoNavegador {
  carregarContadores(): Promise<ContadoresPersistidos>;
  salvarContadores(contadores: ContadoresPersistidos): Promise<void>;
  zerarContadores(): Promise<ContadoresPersistidos>;
}
```

## Invariantes
1. Não lança exceção em caso de falha de I/O: reporta de forma segura ou mantém fallback em memória.
2. Não persiste dados de áudio, textos, remetentes ou conversas.
3. Se o armazenamento estiver vazio, inicializa com valores zerados e `inicioContagem` no instante atual.
