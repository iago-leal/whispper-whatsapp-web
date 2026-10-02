---
schema_version: 1
id: BUG-20261002-YUB4
display_number: 10
title: "Botão de reprodução do WhatsApp Web não toca as mensagens de voz"
status: open
phase: triaging
severity: high
priority: P1
created: 2026-10-02
updated: 2026-10-02

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [integracao-whatsapp-web, player-do-whatsapp]

visibility: normal
security_suspected: false

reproduction:
  classification: not-reproduced
  rate: "relato do usuário: falha em todos os áudios; não reproduzido pelo agente na página falsa"
  suspected_triggers:
    - "áudio cuja cópia local a página reaproveita depois da obtenção pela extensão (hipótese ligada ao BUG-20261002-XDL5)"

blocking: []
relationships:
  - bug: BUG-20261002-XDL5
    type: related-to
    state: proposed
    evidence: []

traceability:
  specs:
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais"
  affected_code:
    - extension/src/pagina/ponte-audio.ts
    - extension/src/content/index.ts
    - extension/src/content/janela-flutuante.css
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

# Botão de reprodução do WhatsApp Web não toca as mensagens de voz

## Summary

Com a extensão ativa, o botão ▶ do próprio WhatsApp Web deixou de tocar as mensagens de voz. Segundo o usuário, a falha atinge todos os áudios, não só os transcritos, e ao apertar o botão nada acontece. A causa é desconhecida.

## Expected Behavior

- `integracao-whatsapp-web.md` RF-05: o clique no ícone de transcrição não toca o áudio e "não altera o botão de reprodução do WhatsApp".
- `integracao-whatsapp-web.md` RF-06 e RF-07: obter o áudio não deve mudar o estado da mensagem nem da página.
- `integracao-whatsapp-web.md` RF-12: mesmo em estado degradado, tocar áudio continua funcionando.
- O player do WhatsApp deve funcionar com a extensão ativa exatamente como sem ela.

## Actual Behavior

Relato do usuário, depois de transcrever áudios com o build de 2026-10-02: "inclusive, nem o botao de audio está funcionando agora". Respostas ao menu do agente: falha em todos os áudios; ao apertar, nada acontece.

## Steps to Reproduce

Ainda sem passos confirmados. Ponto de partida a partir do relato:

1. No WhatsApp Web real, com a extensão do build de 2026-10-02, transcrever alguns áudios.
2. Apertar o ▶ de qualquer mensagem de voz, transcrita ou não.
3. Observar: o áudio não toca e nada muda na tela.

Para isolar a causa, falta saber se o ▶ volta a funcionar com a extensão desativada, e se falha também numa aba recém-aberta, antes de qualquer transcrição.

## Evidence

- `evidence/diagnostico-clique-navegador-de-teste.ts`: na página falsa do Chrome for Testing, o ▶ continuou clicável antes e depois do pedido de transcrição. A camada das janelas (`#whispper-janelas-container`) cobre a tela inteira, mas com `pointer-events: none`, e a janela oculta também não captura cliques.
- Relato bruto: `../../intake/relato-20261002-1223.md`, Problema 5.

## Suspected Area

- `extension/src/pagina/ponte-audio.ts`: se a hipótese do BUG-20261002-XDL5 se confirmar (o `ArrayBuffer` da página esvaziado pela transferência), o player pode não ter o que tocar nos áudios obtidos pela extensão. Isso não explica, sozinho, a falha em áudios nunca transcritos.
- `extension/src/content/index.ts` e `extension/src/content/janela-flutuante.css`: alguma camada da extensão capturando cliques no WhatsApp real, embora não na página falsa.
- Causa fora da extensão (mudança do próprio WhatsApp, saída de som do sistema) não está descartada.

## Acceptance Criteria

1. Com a extensão ativa, o ▶ toca qualquer mensagem de voz, transcrita ou não, na mesma aba e depois de recarregar.
2. Transcrever um áudio e depois apertar o ▶ dele toca o áudio inteiro, com a duração exibida pelo WhatsApp.
3. Se a causa estiver fora da extensão, o registro termina com `resolution_kind: invalid` ou `cannot-reproduce`, com a evidência da verificação com a extensão desativada.

## Traceability

| Tipo | Referência |
|---|---|
| Spec | `_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais` (RF-05, RF-06, RF-07, RF-12) |
| Código | `extension/src/pagina/ponte-audio.ts`, `extension/src/content/index.ts`, `extension/src/content/janela-flutuante.css` |
| Testes existentes | `extension/test/extrator-audio.test.ts` ("a obtenção não toca nem altera a mensagem") verifica só os pedidos feitos à página simulada; nenhum teste toca o áudio pelo player depois da obtenção |
| Relação | `related-to` BUG-20261002-XDL5 (proposed) |

## Resolution

## Agent Notes

- Antes de investigar o código, pedir ao usuário a verificação com a extensão desativada: ela separa defeito da extensão de causa externa com um único teste.
- Se a causa for a do BUG-20261002-XDL5, a relação pode ser promovida a `caused-by`, com evidência.
- Taxonomia vazia: proposta de termos `area: extensao`, `module: integracao-whatsapp-web`.
