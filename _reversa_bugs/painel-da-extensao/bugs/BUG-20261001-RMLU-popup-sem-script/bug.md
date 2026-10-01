---
schema_version: 1
id: BUG-20261001-RMLU
display_number: 3
title: "Popup da extensão fica em \"Verificando…\": o manifesto aponta para popup/index.html, sem popup.js"
status: open
phase: triaging
severity: high
priority: P1
created: 2026-10-01
updated: 2026-10-01

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [painel-da-extensao, manifest]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "2/2"
  suspected_triggers: []

blocking: []
relationships: []

traceability:
  specs:
    - "_reversa_sdd/sdd/nucleo-transcricao.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/nucleo-transcricao.md#8-design-e-interface"
  affected_code:
    - extension/manifest.json
    - extension/popup/index.html
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

# Popup da extensão fica em "Verificando…": o manifesto aponta para popup/index.html, sem popup.js

## Summary
Ao clicar no ícone da extensão, o popup abre com o layout, mas "Motor local" e "WhatsApp Web" ficam em "Verificando…" para sempre, as métricas em "-" e os botões sem efeito. O script do popup não carrega.

## Expected Behavior
Pela spec `_reversa_sdd/sdd/nucleo-transcricao.md`, seção 6.1 (RF-15, RF-18) e seção 8, o painel da extensão exibe o estado do motor ("pronto", "iniciando" ou "indisponível" com o motivo), o estado da integração com o WhatsApp Web ("ativa" ou "degradada", com a estrutura ausente), os contadores com adoção e qualidade e o botão "Zerar contadores". O estado de carregamento "Verificando o motor…" dura só enquanto a consulta não responde.

## Actual Behavior
O popup permanece no estado inicial do HTML estático. O Chrome não encontra o script: `Failed to load resource: net::ERR_FILE_NOT_FOUND chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/popup/popup.js`.

## Steps to Reproduce
1. `cd extension && npm run build` e carregar `extension/` como extensão desempacotada no Chrome.
2. Clicar no ícone da extensão na barra do Chrome.
3. Observar "Verificando o motor…" e "Verificando…" sem mudança; no DevTools do popup, o erro de `popup/popup.js`.

## Evidence
- `evidence/popup-err-file-not-found.txt`: diagnóstico no Chrome for Testing isolado, com o erro de rede e os caminhos envolvidos.
- Relato bruto: `../../intake/relato-20261001-1347.md`.

## Suspected Area
`extension/manifest.json` declara `"default_popup": "popup/index.html"` desde `bab1e53`. Essa página carrega `./popup.js`, que só existe compilado em `extension/dist/popup/` (o build copia `popup/index.html` e `popup/popup.css` para lá). A página de boas-vindas já usa o caminho de `dist/` (`dist/onboarding/index.html`). Conferir também o `window.open('../onboarding/index.html')` de `src/popup/popup.ts`, que supõe a página dentro de `dist/`.

## Acceptance Criteria
- Ao abrir o popup, "Motor local" sai de "Verificando…" para o estado real do motor, e "WhatsApp Web" para o estado da integração.
- "Verificar compatibilidade" abre a página de boas-vindas.
- Nenhum erro de carregamento de recurso no DevTools do popup.

## Traceability
- **Specs**: `nucleo-transcricao.md#61-requisitos-principais` (RF-15, RF-18), `nucleo-transcricao.md#8-design-e-interface`.
- **Affected Code**: `extension/manifest.json` (`action.default_popup`), `extension/popup/index.html`.
- **Root Cause**: a investigar no fix.
- **Reproduction Tests**: nenhum.
- **Regression Tests**: nenhum.

## Resolution
(Pendente)

## Agent Notes
- Achado na conferência do BUG-20261001-MAC1; não tem relação causal com ele (o caminho do popup é o mesmo desde o primeiro commit da extensão).
- Severidade high e prioridade P1 confirmadas pelo usuário em 2026-10-01: painel inteiro inoperante, com contorno pela URL da página de boas-vindas.
- Candidato à rota expressa do `/reversa-debugger-fix`: a correção provável é uma linha no manifesto, com teste que confira que todo HTML referenciado pelo manifesto tem os scripts que carrega.
- Taxonomia: `taxonomy.yaml` está vazio; proposta `area: extensao`, `module: painel`, `feature: estado-do-motor`.
- Closure policy: o `README.md` do registro guarda em `closure_policy` o critério livre do MAC1 ("Resolvido quando o fluxo inteiro de instalação terminar"); adotei `local-software` para este bug. Convém o usuário fixar o valor do README.
- A captura de tela do usuário não foi salva: mostra conversas e contatos do WhatsApp.
