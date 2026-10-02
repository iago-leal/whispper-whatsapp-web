---
schema_version: 1
id: BUG-20261002-K3DY
display_number: 8
title: "Janelas flutuantes se sobrepõem: o posicionador supõe altura fixa de 160 px"
status: open
phase: triaging
severity: medium
priority: P2
created: 2026-10-02
updated: 2026-10-02

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [janela-flutuante, posicionamento]

visibility: normal
security_suspected: false

reproduction:
  classification: not-reproduced
  rate: "1 ocorrência no WhatsApp Web real (print do usuário); não reproduzido pelo agente"
  suspected_triggers:
    - "janela concluída mais alta que 160 px"

blocking: []
relationships:
  - bug: BUG-20261002-IXWO
    type: related-to
    state: supported
    evidence:
      - ref: ../BUG-20261002-IXWO-janela-invisivel/evidence/reproduction.md
        observation: "a sobreposição só é vista depois do contorno do IXWO (rolagem); a altura fixa de 160 px e a âncora ausente nascem na mesma montagem de requisições de GerenciadorDeJanelas.recalcularPosicoes"

traceability:
  specs:
    - "_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais"
  affected_code:
    - extension/src/content/gerenciador-janelas.ts
    - extension/src/content/posicionador-colisoes.ts
  root_cause: null
  reproduction_tests: []
  regression_tests: []

spec_verdict: null

change_set: []

closure:
  policy: local-software
  satisfied: false
resolution_kind: null
---

# Janelas flutuantes se sobrepõem: o posicionador supõe altura fixa de 160 px

## Summary

Com duas janelas abertas, a segunda cobre a parte de baixo da primeira: o cabeçalho de uma fica sob o rodapé da outra. O resumo e o fim do texto da janela de cima ficam escondidos.

## Expected Behavior

- `janela-flutuante.md` RF-05: várias janelas abertas ao mesmo tempo, deslocando para baixo a que colidir com outra; cinco áudios consecutivos resultam em cinco janelas, nenhuma sobreposta.
- `janela-flutuante.md` RF-07: a janela tem 320 px de largura e altura ajustada ao texto até 240 px, com rolagem interna acima disso.

## Actual Behavior

No print do usuário, as duas janelas se sobrepõem verticalmente. Elas têm cerca de 190 e 230 px de altura, porque o estado concluído (texto e resumo) é mais alto que o estado de espera.

## Steps to Reproduce

1. No WhatsApp Web real, transcrever dois áudios próximos na mesma conversa, com textos de mais de duas linhas.
2. Rolar a conversa para as janelas aparecerem (contorno do BUG-20261002-IXWO).
3. Observar a borda inferior da janela de cima e a superior da de baixo.

## Evidence

- `evidence/janelas-longe-do-balao-e-sobrepostas-desfocado.png`: versão desfocada do print do usuário, com as duas janelas sobrepostas.
- Relato bruto: `../../intake/relato-20261002-1223.md`, Problema 3.

## Suspected Area

- `extension/src/content/gerenciador-janelas.ts`: `recalcularPosicoes` passa ao posicionador `altura: 160` fixa para todas as janelas, em vez da altura renderizada.
- `extension/src/content/posicionador-colisoes.ts`: a resolução de colisão empilha as janelas por `y + altura + 8`; com a altura subestimada, a janela seguinte começa antes do fim da anterior.
- `definirEstado` recalcula as posições a cada mudança de estado, mas com a mesma altura fixa; o recálculo existe, a medida é que está errada.

## Acceptance Criteria

1. Cinco áudios consecutivos transcritos resultam em cinco janelas sem sobreposição (RF-05), com textos de alturas diferentes, inclusive uma no limite de 240 px.
2. Quando uma janela cresce ao concluir, as de baixo são deslocadas, sem sobreposição em nenhum momento após a mudança de estado.
3. Teste do gerenciador ou de navegador que falha com a altura fixa e passa com a correção.

## Traceability

| Tipo | Referência |
|---|---|
| Spec | `_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais` (RF-05, RF-07) |
| Código | `extension/src/content/gerenciador-janelas.ts` (`recalcularPosicoes`), `extension/src/content/posicionador-colisoes.ts` |
| Testes existentes | `extension/test/posicionador-colisoes.test.ts` ("desloca verticalmente janela para resolver colisão") recebe alturas como dado e passa; o defeito está em quem informa a altura |
| Relação | `related-to` BUG-20261002-IXWO (proposed) |

## Resolution

## Agent Notes

- O posicionador em si parece correto para as alturas que recebe; a correção provável fica no gerenciador, que precisa informar a altura renderizada de cada janela. A altura só é conhecida depois de o conteúdo ser escrito no DOM, o que pede cuidado com a ordem entre `atualizarConteudoJanela` e `recalcularPosicoes`.
- Taxonomia vazia: proposta de termos `area: extensao`, `module: janela-flutuante`.
