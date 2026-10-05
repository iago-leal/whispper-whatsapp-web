# Interface: Porta `ExibicaoDeTranscricao` (delta)

> Identificador da feature: `007-motor-whisper-navegador`
> Tipo: interface TypeScript interna da extensão
> Contrato anterior: `_reversa_forward/006-cronometro-transcricao/interfaces/porta-exibicao-de-transcricao.md`
> Local: `extension/src/dominio/exibicao-de-transcricao.ts`; implementação em `extension/src/content/gerenciador-janelas.ts` e `janela-elemento.ts`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Mudança

```diff
 export type EstadoExibicao =
   | { tipo: 'fila'; posicaoNaFila: number; inicioEsperaEm: number }
-  | { tipo: 'transcrevendo'; inicioEsperaEm: number }
+  | { tipo: 'transcrevendo'; inicioEsperaEm: number; preparando?: boolean }
   | { tipo: 'concluido'; texto: string; idioma?: string; tempos?: TemposDoPedido }
   | { tipo: 'erro'; mensagem: string; motivo: string; falhouAposMs?: number };
```

## 2. Comportamento

- 🟡 Com `preparando: true`, a janela mostra "Preparando o motor…" e o cronômetro da feature 006, que continua contando do `inicioEsperaEm` do clique. Sem o campo, ou com `false`, mostra "Transcrevendo…", como hoje.
- 🟡 A passagem de `preparando: true` para `preparando: false` é uma transição: o núcleo notifica uma vez (RF-03 do núcleo), e a janela troca só o texto do estado, sem recriar o corpo nem reiniciar o cronômetro.
- 🟡 A região viva anuncia "Preparando o motor" no início da espera, em lugar de "Transcrevendo"; a passagem para "Transcrevendo" não gera anúncio, para manter os dois anúncios por pedido da feature 006 (RNF de acessibilidade).
- 🟢 O ícone do áudio não muda: continua em espera, com o mesmo contador.
- 🟢 O tempo de preparação entra no tempo total do resumo final ("Transcrito em N s"), porque o usuário esperou por ele, e não na parte da fila.

## 3. Quem envia

O núcleo, quando `verificar()` devolve "iniciando" antes de pedir o áudio (D-11 do roadmap). Ele consulta o motor a cada 1 s, por até 120 s, e envia `preparando: false` quando o motor fica "pronto" e o pedido é enviado.
