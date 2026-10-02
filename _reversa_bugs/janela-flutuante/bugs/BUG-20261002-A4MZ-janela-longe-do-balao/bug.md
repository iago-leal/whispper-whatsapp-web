---
schema_version: 1
id: BUG-20261002-A4MZ
display_number: 7
title: "Janela flutuante abre longe do balão, sobre a lista de conversas"
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
labels: [janela-flutuante, posicionamento]

visibility: normal
security_suspected: false

reproduction:
  classification: not-reproduced
  rate: "1 ocorrência no WhatsApp Web real (print do usuário); não reproduzido pelo agente"
  suspected_triggers:
    - "âncora medida num elemento mais largo que o balão"
    - "direção da mensagem não informada à janela"

blocking: []
relationships:
  - bug: BUG-20261002-IXWO
    type: related-to
    state: supported
    evidence:
      - ref: ../BUG-20261002-IXWO-janela-invisivel/evidence/reproduction.md
        observation: "a reprodução do A4MZ depende do contorno do IXWO (rolar para a janela aparecer); os dois passam por GerenciadorDeJanelas.recalcularPosicoes"
      - ref: ../BUG-20261002-IXWO-janela-invisivel/evidence/experimento-causa-aba-visivel.saida.txt
        observation: "assim que a âncora chega, a janela vai para x = 12, à esquerda de um balão sem 320 px livres à direita: evidência parcial do mecanismo levantado no A4MZ, não da causa no WhatsApp real"

traceability:
  specs:
    - "_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais"
  affected_code:
    - extension/src/content/posicionador-colisoes.ts
    - extension/src/content/gerenciador-janelas.ts
    - extension/src/content/configuracao-estruturas.ts
    - extension/src/content/detector-mensagens.ts
    - extension/src/dominio/nucleo.ts
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

# Janela flutuante abre longe do balão, sobre a lista de conversas

## Summary

Quando a janela finalmente aparece (depois da rolagem, ver BUG-20261002-IXWO), ela não fica ao lado do balão de voz: abre à esquerda, sobre a lista de conversas, fora do painel da conversa. O usuário precisa procurar o texto longe do áudio de origem, e a janela cobre a lista de conversas.

## Expected Behavior

- `janela-flutuante.md` RF-01: a janela abre ao lado do balão, no espaço livre da área da conversa: à direita dos áudios recebidos e à esquerda dos enviados, com 8 px entre a janela e o balão e os topos alinhados (tolerância de 4 px).
- `janela-flutuante.md` RF-02: sem espaço lateral suficiente, a janela abre sobreposta à conversa, imediatamente abaixo do balão e sem cobri-lo.
- `integracao-whatsapp-web.md` RF-05 e RF-10: a integração emite o pedido com a direção (recebido ou enviado) e fornece a âncora de cada mensagem.

## Actual Behavior

No print do usuário (WhatsApp Web real, tela de 1316 px de largura), as duas janelas estão à esquerda, sobre a lista de conversas, com x de cerca de 160 a 480 px, enquanto os balões de voz estão no painel da conversa, com x de cerca de 550 a 885 px.

## Steps to Reproduce

1. No WhatsApp Web real, com a extensão do build de 2026-10-02, clicar no ícone de transcrição de uma ou mais mensagens de voz.
2. Rolar a conversa para a janela aparecer (contorno do BUG-20261002-IXWO).
3. Observar a posição da janela em relação ao balão.

## Evidence

- `evidence/janelas-longe-do-balao-e-sobrepostas-desfocado.png`: versão desfocada do print do usuário. As janelas ocupam a faixa da lista de conversas; os balões ficam à direita delas.
- Print original fora do repositório, por mostrar conversas e texto transcrito.
- Relato bruto: `../../intake/relato-20261002-1223.md`, Problema 2.

## Suspected Area

- `extension/src/dominio/nucleo.ts`: `processarSolicitacao` chama `this.exibicao.abrir(idAudio)` sem direção; `GerenciadorDeJanelas.abrir` assume `recebido`.
- `extension/src/content/configuracao-estruturas.ts`: o seletor `balaoMensagem` é `'[data-id], div[role="row"]'`, e `detector-mensagens.ts` (`baloesComVoz`) sobe do elemento de voz ao ancestral mais próximo que casa com ele. Se esse ancestral for a linha inteira da conversa, e não o balão, a âncora tem a largura do painel.
- `extension/src/content/posicionador-colisoes.ts`: com uma âncora da largura do painel, falta espaço à direita, e a regra cai no ramo "espaço à esquerda", que põe a janela a `ancora.x - largura - 8`. Com o painel começando por volta de x = 488 e a janela de 320 px, o resultado seria x ≈ 160, o que bate com o print. Hipótese não verificada no WhatsApp real.

## Acceptance Criteria

1. Num áudio recebido, a janela abre à direita do balão, a 8 px dele, com os topos alinhados (tolerância de 4 px), dentro do painel da conversa.
2. Num áudio enviado, a janela abre à esquerda do balão, nas mesmas condições.
3. Com o painel da conversa reduzido a 600 px, a janela abre abaixo do balão sem cobri-lo (RF-02).
4. Em nenhum caso a janela cobre a lista de conversas.
5. A âncora usada mede o balão da mensagem de voz, conferida por teste com a estrutura real registrada no módulo de configuração.

## Traceability

| Tipo | Referência |
|---|---|
| Spec | `_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais` (RF-01, RF-02) |
| Spec | `_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais` (RF-05, RF-10) |
| Código | `extension/src/content/posicionador-colisoes.ts`, `gerenciador-janelas.ts`, `configuracao-estruturas.ts`, `detector-mensagens.ts`; `extension/src/dominio/nucleo.ts` |
| Testes existentes | `extension/test/posicionador-colisoes.test.ts` cobre o posicionador com âncoras sintéticas do tamanho de um balão; nenhum teste cobre a medida da âncora nem a direção vinda do núcleo |
| Relação | `related-to` BUG-20261002-IXWO (proposed) |

## Resolution

## Agent Notes

- O defeito já constava como pendente antes deste registro: nas Agent Notes do BUG-20261001-2MOY ("texto de erro e âncora da janela flutuante") e na memória do projeto.
- A conta do Suspected Area é hipótese; confirmar medindo a âncora no WhatsApp real sem ler o conteúdo das mensagens, como no precedente do BUG-20261001-GAOZ.
- Taxonomia vazia: proposta de termos `area: extensao`, `module: janela-flutuante`.
