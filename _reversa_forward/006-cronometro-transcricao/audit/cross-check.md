# Cross-check: Indicador de espera com cronômetro na transcrição

> Identificador: `006-cronometro-transcricao`
> Data: `2026-10-01`
> Artefatos analisados: [requirements.md](../requirements.md), [roadmap.md](../roadmap.md), [actions.md](../actions.md), com `data-delta.md` e `interfaces/`

## Resumo

| Severidade | Findings |
|------------|----------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 4 |

## Findings

| ID | Severidade | Eixo | Descrição | Onde está |
|----|------------|------|-----------|-----------|
| A001 | MEDIUM | Cobertura | O RNF de desempenho (0 tarefas acima de 50 ms com 20 pedidos em espera) tem decisão (D-03), mas nenhuma ação o verifica; T026 roda só testes funcionais | `requirements.md` §6; `roadmap.md` D-03; `actions.md` T017, T026 |
| A002 | MEDIUM | Cobertura | O critério do RF-01 (95% dos ícones pulsando em ≤ 100 ms) não tem medição; T025 verifica o pulsar, não o tempo | `requirements.md` §5 RF-01; `actions.md` T025 |
| A003 | LOW | Cobertura | O RF-10 (novo clique não reinicia a contagem) decorre do desenho (D-01: o instante de início não muda), mas T006 não lista um caso que o afirme | `requirements.md` §5 RF-10; `actions.md` T006 |
| A004 | LOW | Consistência | D-12 (reabrir a janela de pedido em andamento) não tem RF de origem; o roadmap a liga ao espírito do RF-10 e do RF-12 | `roadmap.md` D-12 |
| A005 | LOW | Consistência | O risco 1 do roadmap remete a "onboarding, passo 4", mas o passo está na seção 3 do `onboarding.md` | `roadmap.md` §9 |
| A006 | LOW | Cobertura | Contraste ≥ 4,5:1 e sobrecarga do núcleo ≤ 100 ms não têm ação de verificação; T021 cita só "cores dos temas" | `requirements.md` §6; `actions.md` T021 |

## Impacto e direção

Não há finding CRITICAL nem HIGH. Os dois MEDIUM tratam de verificação, não de comportamento: o código planejado atende aos requisitos, mas a conferência dos dois números fica para a aceitação manual (`onboarding.md`) se nenhuma ação for acrescentada. Direção: acrescentar a T025, no teste de navegador, a marcação do tempo entre o clique e a classe de espera, e registrar a medição de tarefas longas na aceitação manual; ou aceitar a conferência manual e anotá-la em `actions.md`, nas notas de execução.

## Itens verificados que passaram

**Cobertura**
- RF-01 a RF-15 têm ao menos uma decisão no roadmap (D-01 a D-15) e ao menos uma ação (T001 a T025).
- D-01 a D-15 têm ao menos uma ação correspondente.
- Os 15 cenários Gherkin do requirements têm ação ou decisão que os sustenta, inclusive "Aba em segundo plano" (D-02, D-03, T005).
- RN-01 a RN-09 aparecem no roadmap ou no data-delta.

**Consistência**
- Termos "pedido", "espera", "acumulado", "indicador de concluído" e "espera média" com a mesma grafia nos três documentos.
- IDs citados no roadmap existem: RF-16 e RF-13 da integração, RF-03, RF-10, RF-14 a RF-17 do núcleo, RN-03 a RN-09 desta feature.
- Os três contratos de `interfaces/` aparecem na seção 7 do roadmap.
- A quebra de compatibilidade (`segundosDecorridos`) é tratada por T008, e o único consumidor externo é esse teste.

**Coerência com o legado**
- Não há `domain.md` nem `architecture.md` (projeto greenfield); as decisões foram conferidas contra as specs em `_reversa_sdd/sdd/`.
- D-01 preserva o RF-03 do núcleo (1 notificação por transição).
- D-11 não contradiz o RF-16 do núcleo; ele garante que o zeramento feito no painel não seja desfeito.
- D-10 mantém o RF-14 do núcleo no seu propósito (nada que identifique áudio, pessoa ou conversa) e a mudança de quantidade foi aprovada no esclarecimento.

**Sanidade do actions**
- Todas as dependências apontam para IDs existentes.
- As 14 ações `[//]` não compartilham arquivo alvo entre si.
- Não há ciclo; a maior cadeia tem 10 ações, como declarado.
- As três implementações das portas alteradas (`armazenamento-chrome.ts`, `adaptador-whatsapp-web.ts`, `gerenciador-janelas.ts`) e a implementação falsa em `test/nucleo-transcricao.test.ts` estão cobertas por T013, T019, T022 e T006.
