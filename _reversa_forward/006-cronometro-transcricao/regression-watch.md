# Regression watch: Indicador de espera com cronômetro na transcrição

> Identificador: `006-cronometro-transcricao`
> Criado em: `2026-10-02`

Feature greenfield, sem regras 🟢 extraídas de código existente: o watch principal fica vazio. Os requisitos implementados estão em "Observações", sem peso de regressão, até que uma futura extração com `/reversa` os confirme como 🟢.

## Watch principal

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|------------------------------|---------------------|-------------------|

## Observações

| ID | Origem (arquivo, seção) | Regra esperada | Verificação atual | Sinal de violação |
|----|-------------------------|----------------|-------------------|-------------------|
| W001 | `requirements.md#5` RF-01 | O clique que cria um pedido faz o ícone pulsar, com o rótulo "Transcrevendo áudio", em até 100 ms e antes de qualquer resposta do motor | `test/integracao-conversa.test.ts` (20 cliques no Chrome for Testing); `test/nucleo-transcricao.test.ts` | Ícone sem `whispper-animando` na tarefa do clique, ou mais de 1 em 20 acima de 100 ms |
| W002 | `requirements.md#5` RF-02 | O contador ao lado do ícone mostra segundos inteiros ("7 s"), nunca no formato "m:ss" | `test/tempo-de-espera.test.ts`; `test/integracao-conversa.test.ts` | Contador vazio ou oculto em espera, ou texto fora de `^\d+ s$` abaixo de 60 s |
| W003 | `requirements.md#5` RF-03 | A janela conta o mesmo tempo do ícone, na fila e transcrevendo | `test/cronometro-espera.test.ts`; aceitação manual em `onboarding.md` §3 | Janela parada em 0 s, ou diferença acima de 1 s em relação ao ícone |
| W004 | `requirements.md#5` RF-04 | A partir de 60 s, os tempos aparecem como "1 min 05 s" | `test/tempo-de-espera.test.ts` | "65 s" ou "1:05" |
| W005 | `requirements.md#5` RF-05 | Na conclusão, o cronômetro para e a janela mostra "Transcrito em 9,7 s · áudio de 13 s" | `test/tempo-de-espera.test.ts`; `test/nucleo-transcricao.test.ts` | Contador ainda ativo após a conclusão, ou resumo sem o tempo total |
| W006 | `requirements.md#5` RF-06 | Espera na fila aparece separada no resumo: "(4,4 s na fila)" | `test/tempo-de-espera.test.ts`; `test/nucleo-transcricao.test.ts` | Tempo de fila somado sem a separação |
| W007 | `requirements.md#5` RF-07 | No erro, o ícone passa ao indicador de erro sem contador e a janela mostra "Falhou após …" | `test/integracao-conversa.test.ts`; `test/nucleo-transcricao.test.ts` | Contador visível ou ícone pulsando no estado de erro |
| W008 | `requirements.md#5` RF-08 | O ícone recriado pela página herda o estado e o tempo do pedido | Sem teste automático: `AdaptadorWhatsAppWeb.registrarBotao` não é exercitado; aceitação manual em `onboarding.md` §6.1 | Ícone reinserido ocioso durante a espera |
| W009 | `requirements.md#5` RF-09 | A reabertura pelo cache mostra o resumo original, sem cronômetro | `test/nucleo-transcricao.test.ts` | Contagem nova ao reabrir um áudio já transcrito |
| W010 | `requirements.md#5` RF-10 | Novo clique num pedido em espera não reinicia a contagem | `test/nucleo-transcricao.test.ts` | Contador volta a 0 s no segundo clique |
| W011 | `requirements.md#5` RF-11 | "Tentar de novo" inicia contagem nova, a partir de 0 s, com a direção original | `test/nucleo-transcricao.test.ts` | Contagem herdada do pedido em erro, ou áudio enviado tratado como recebido |
| W012 | `requirements.md#5` RF-12 | Com a janela fechada durante a transcrição, o ícone segue em espera e passa a concluído no fim | `test/nucleo-transcricao.test.ts` | Ícone ocioso enquanto o pedido transcreve |
| W013 | `requirements.md#5` RF-13 | O resumo compara a espera com a duração: "1,3× mais rápido que ouvir" ou "mais lento que ouvir" | `test/tempo-de-espera.test.ts` | Comparação ausente com duração conhecida |
| W014 | `requirements.md#5` RF-14 | O painel mostra a espera média por minuto de áudio, só de áudios recebidos e concluídos | `test/contadores-espera.test.ts`; `test/nucleo-transcricao.test.ts` | Média que inclui a fila ou áudios enviados |
| W015 | `requirements.md#5` RF-15 | Zerar os contadores zera o acumulado, e o registro seguinte não o desfaz | `test/contadores-espera.test.ts` | Média anterior reaparece após o zeramento |

Sem verificação em parte alguma, nem automática nem no roteiro de `onboarding.md`: o RNF de desempenho com 20 pedidos em espera (0 tarefas acima de 50 ms, achado A001 da auditoria) e o contraste ≥ 4,5:1 do contador (A006). O RF-08 (W008) só tem a aceitação manual.

## Histórico de re-extrações

## Arquivadas
