# Contrato da Porta ExibicaoDeTranscricao (delta)

**Componente:** `janela-flutuante`, usada por `nucleo-transcricao`
**Arquivo no código:** `extension/src/dominio/exibicao-de-transcricao.ts`
**Base:** `_reversa_sdd/sdd/nucleo-transcricao.md#8`, adendo `_reversa_sdd/addenda/003-janela-flutuante.md`

## Assinatura TypeScript, depois da feature

```typescript
export interface TemposDoPedido {
  esperaTotalMs: number;      // do clique ao fim
  esperaFilaMs: number;       // do clique à saída da fila
  duracaoAudioSeg?: number;   // ausente quando nenhuma fonte informou
}

export type EstadoExibicao =
  | { tipo: 'fila'; posicaoNaFila: number; inicioEsperaEm: number }
  | { tipo: 'transcrevendo'; inicioEsperaEm: number }
  | { tipo: 'concluido'; texto: string; idioma?: string; tempos?: TemposDoPedido }
  | { tipo: 'erro'; mensagem: string; motivo: string; falhouAposMs?: number };
```

Os métodos `abrir`, `definirEstado`, `destacar`, `fechar`, `aoFechar` e `aoReexecutar` não mudam de assinatura.

## Invariantes

1. `inicioEsperaEm` é um instante do relógio injetado no núcleo e na exibição (D-02); a exibição só o compara com o mesmo relógio.
2. O núcleo chama `definirEstado` uma vez por transição; o avanço do tempo é responsabilidade da exibição (RN-03).
3. Um pedido em espera mantém o mesmo `inicioEsperaEm` em "fila" e "transcrevendo"; só o "Tentar de novo" cria outro (RN-05).
4. Sem `tempos`, a janela exibe o texto sem o resumo; sem `falhouAposMs`, exibe o erro sem "Falhou após".

## Quebra de compatibilidade

`segundosDecorridos` deixa de existir. Único consumidor fora do núcleo: `test/gerenciador-janelas.test.ts`.
