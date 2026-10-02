# Actions: Indicador de espera com cronômetro na transcrição

> Identificador: `006-cronometro-transcricao`
> Data: `2026-10-01`
> Roadmap: `_reversa_forward/006-cronometro-transcricao/roadmap.md`

Caminhos relativos a `extension/`.

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 26 |
| Paralelizáveis (`[//]`) | 14 |
| Maior cadeia de dependência | 10 (T001 → T004 → T009 → T012 → T014 → T015 → T016 → T020 → T025 → T026) |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Alterar a porta de exibição: tipo `TemposDoPedido`; `inicioEsperaEm` em "fila" e "transcrevendo", sem `segundosDecorridos`; `tempos?` em "concluido"; `falhouAposMs?` em "erro" (D-01, D-07) | - | `[//]` | `src/dominio/exibicao-de-transcricao.ts` | 🟢 | [X] |
| T002 | Acrescentar à porta `FonteDeAudio` o tipo `EstadoPedidoIcone` e a operação `refletirEstadoPedido` (D-04) | - | `[//]` | `src/dominio/fonte-de-audio.ts` | 🟢 | [X] |
| T003 | Acrescentar `esperaAcumuladaMs` e `audioAcumuladoMs` a `ContadoresPersistidos` e `esperaMediaSegPorMinuto` a `MetricasContadores` (D-10) | - | `[//]` | `src/dominio/armazenamento-navegador.ts` | 🟢 | [X] |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Testes por tabela das funções de tempo: "7 s", "1 min 05 s", "9,7 s"; resumo com e sem fila e sem duração; "Falhou após 61 s"; "1,3× mais rápido que ouvir" e "mais lento que ouvir"; espera média 14,0 e nula | T001 | `[//]` | `test/tempo-de-espera.test.ts` | 🟢 | [X] |
| T005 | Testes do cronômetro com relógio e agendador falsos e nós falsos: um único temporizador para vários nós, texto atualizado só quando muda, parada sem nós, descarte de nó desconectado, tique imediato na volta da aba | - | `[//]` | `test/cronometro-espera.test.ts` | 🟢 | [X] |
| T006 | Testes do núcleo: mesmo `inicioEsperaEm` em fila e transcrevendo; ícone em espera, concluído com janela fechada, ocioso ao fechar janela na fila, erro; tempos com fila separada; cache reabre com tempos; "Tentar de novo" com contagem nova e direção preservada; novo clique reabre janela de pedido em andamento; acumulado só de recebidos, sem fila | T001, T002 | `[//]` | `test/nucleo-transcricao.test.ts` | 🟢 | [X] |
| T007 | Testes dos contadores: acumulado e média, áudio enviado ignorado, zeramento dos campos novos, registro antigo lido como 0, zeramento externo não desfeito pelo registro seguinte | T003 | `[//]` | `test/contadores-espera.test.ts` | 🟢 | [X] |
| T008 | Atualizar o teste do gerenciador de janelas ao contrato novo (`inicioEsperaEm`, `tempos`) | T001 | `[//]` | `test/gerenciador-janelas.test.ts` | 🟢 | [X] |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Implementar as funções puras de tempo e formatação em pt-BR, incluindo a espera média ponderada (D-14, RN-08) | T004 | - | `src/dominio/tempo-de-espera.ts` | 🟢 | [X] |
| T010 | Fila: relógio injetável `agora`; carimbar `inicioEsperaEm`, `inicioTranscricaoEm` e `fimEm`; `repetir` recebe a direção (D-02, D-07, D-13) | T006 | `[//]` | `src/dominio/fila-transcricao.ts` | 🟢 | [X] |
| T011 | Cache da sessão: campo `tempos` no item (D-09) | T001 | `[//]` | `src/dominio/cache-sessao.ts` | 🟢 | [X] |
| T012 | Contadores: `registrarTempoDeEspera(direcao, esperaMs, duracaoMs)`, média nas métricas, ler, modificar e gravar a cada registro (D-10, D-11) | T003, T007, T009 | - | `src/dominio/contadores.ts` | 🟡 | [X] |
| T013 | Armazenamento: normalizar registro antigo ou inválido para 0 e zerar os campos novos, nos adaptadores de memória e do Chrome | T003 | `[//]` | `src/adaptadores/armazenamento-chrome.ts` | 🟢 | [X] |
| T014 | Núcleo, janela: enviar `inicioEsperaEm` nos estados de espera, `tempos` na conclusão e na reabertura pelo cache, `falhouAposMs` no erro; guardar `tempos` no cache; duração do motor com recurso à da página (D-01, D-08, D-09) | T009, T010, T011, T012 | - | `src/dominio/nucleo.ts` | 🟢 | [X] |
| T015 | Núcleo, ícone: `refletirEstadoPedido` em cada transição, inclusive com janela fechada; ocioso ao fechar a janela de pedido na fila; novo clique reabre a janela de pedido em andamento (D-04, D-12, D-15) | T014 | - | `src/dominio/nucleo.ts` | 🟡 | [X] |
| T016 | Núcleo, direção e acumulado: guardar a direção por áudio e repassá-la ao `repetir`; registrar espera sem fila e duração no acumulado só na conclusão (D-13, RN-07) | T015 | - | `src/dominio/nucleo.ts` | 🟢 | [X] |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T017 | Implementar o `CronometroDeEspera`: registro de nós com instante de início, tique de 500 ms, atualização só quando o texto muda, parada sem nós, descarte de desconectados, tique em `visibilitychange` (D-03) | T005, T009 | - | `src/content/cronometro-espera.ts` | 🟢 | [X] |
| T018 | Botão: span `whispper-contador` com `aria-hidden`; aplicar `EstadoPedidoIcone` (pulsar e contador em espera, concluído, erro, ocioso) registrando o contador no cronômetro (D-05) | T017 | - | `src/content/botao-transcricao.ts` | 🟢 | [X] |
| T019 | Adaptador do WhatsApp: implementar `refletirEstadoPedido`, guardar o estado por áudio e reaplicá-lo ao botão registrado depois (RF-08) | T002, T018 | - | `src/adaptadores/adaptador-whatsapp-web.ts` | 🟢 | [X] |
| T020 | Script de conteúdo: criar um único cronômetro, entregá-lo ao adaptador e ao gerenciador de janelas e registrar no adaptador cada botão injetado | T016, T019, T022 | - | `src/content/index.ts` | 🟢 | [X] |
| T021 | Estilos do ícone: contador em posição absoluta à direita, cores dos temas, `prefers-reduced-motion` sem pulsar (D-05) | - | `[//]` | `src/content/estilos.css` | 🟡 | [X] |
| T022 | Janela: contador vivo com `role="timer"` nos estados de espera, resumo final com fila e comparação, "Falhou após", região `aria-live` oculta com anúncio só no início e no fim; gerenciador recebe o cronômetro e o repassa (D-06) | T009, T017 | - | `src/content/janela-elemento.ts`, `src/content/gerenciador-janelas.ts` | 🟢 | [X] |
| T023 | Estilos da janela: contador, resumo e classe de texto só para leitor de tela | - | `[//]` | `src/content/janela-flutuante.css` | 🟢 | [X] |
| T024 | Painel: linha "Espera média" com o texto vazio "sem transcrições ainda" (RF-14) | T012 | `[//]` | `popup/index.html`, `src/popup/popup.ts` | 🟢 | [X] |
| T025 | Teste no navegador: o clique faz o ícone pulsar com contador e, com o motor indisponível no ambiente de teste, passa ao indicador de erro sem contador | T020 | - | `test/integracao-conversa.test.ts` | 🟡 | [X] |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T026 | Rodar `npm run typecheck`, `npm test` e `npm run build` e corrigir o que falhar | T008, T013, T021, T023, T024, T025 | - | `extension/` | 🟢 | [X] |

## Notas de execução

- **2026-10-01 18:10, pausa a pedido do usuário** (fim do expediente), para commit e push. Concluídas T001 a T024; abertas T025 (teste no navegador) e T026 (montagem completa com `npm run build`). Estado no momento da pausa: `npm run typecheck` limpo e `npm test` com 142 aprovados, 0 falhas e os mesmos 2 pulados da linha de base (instalação E2E e motor real).
- **2026-10-02, retomada:** T025 no Chrome for Testing, com dois casos: o clique faz o ícone pulsar com contador e, sem motor, passa ao erro sem contador; em 20 cliques, o ícone pulsa na mesma tarefa do clique e em até 100 ms, o que cobre o achado A002 da auditoria. Uma mutação no registro do contador deixou o teste vermelho. T026: `npm run typecheck` limpo, `npm test` com 144 aprovados, 0 falhas e 2 pulados, e `npm run build` completo com o instalador `.pkg`.
- **RF-07 versus RF-04:** o exemplo "Falhou após 61 s" do RF-07 contradiz o RF-04 (a partir de 60 s, "1 min 05 s"). Prevaleceu a regra geral: "Falhou após 1 min 01 s". O teste `test/tempo-de-espera.test.ts` registra a escolha.
- **Ressalvas do `/reversa-quality`:** Q-003 resolvida pelo RF-04 (tempo final a partir de 60 s em minutos); Q-014 pela D-08 (sem duração, o resumo omite o áudio e o pedido fica fora do acumulado). Q-016 é de redação e não afeta o código.
- **Achados do `/reversa-audit`:** A003 coberto pelo caso "RF-10" em `test/nucleo-transcricao.test.ts`. A001 e A002 (tarefas longas com 20 pedidos; 100 ms até o pulsar) ficam para T025 e para a aceitação manual (`onboarding.md`).
- **Fora do plano, necessários:** a gravação no cache passou ao tratamento da conclusão, onde o instante final existe (respostas tardias descartadas deixam de entrar no cache); a fila ganhou `duracaoAudioSeg` no item e `notificarJanelaReaberta`; o cronômetro só ouve `visibilitychange` quando o alvo oferece `addEventListener`, porque `test/extrator-audio.test.ts` monta um documento mínimo.

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-10-01 | Versão inicial gerada por `/reversa-to-do` | reversa |
