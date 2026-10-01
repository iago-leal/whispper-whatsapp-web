---
schema_version: 1
id: BUG-20261001-RMLU
display_number: 3
title: "Popup da extensão fica em \"Verificando…\": o manifesto aponta para popup/index.html, sem popup.js"
status: resolved
phase: null
express: true   # rota expressa pedida pelo usuário em 2026-10-01
severity: high
priority: P1
created: 2026-10-01
updated: 2026-10-01T14:16-03:00

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
  rate: "3/3"
  suspected_triggers: []
  capsule: evidence/reproduction.md

blocking: []
relationships: []

traceability:
  specs:
    - "_reversa_sdd/sdd/nucleo-transcricao.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/nucleo-transcricao.md#8-design-e-interface"
  affected_code:
    - extension/manifest.json
    - extension/popup/index.html
  root_cause:
    state: confirmed
    location: extension/manifest.json (action.default_popup)
    summary: >-
      O manifesto declara a página-fonte popup/index.html; o ./popup.js que ela carrega só existe
      ao lado da cópia que o build gera em dist/popup/, onde o tsc compila src/popup/popup.ts.
    evidence:
      - evidence/reproduction.md (execução 1: popup/index.html fica em "Verificando…")
      - evidence/reproduction.md (execução 2: dist/popup/index.html consulta o motor e o botão abre as boas-vindas)
      - "git log -- extension/manifest.json: o caminho vem de bab1e53, primeiro commit da extensão"
  reproduction_tests:
    - "extension/test/manifesto.test.ts::o popup declarado no manifesto carrega um script que a extensão contém (BUG-20261001-RMLU)"
  regression_tests:
    - "extension/test/manifesto.test.ts::todo arquivo do manifesto e toda página aberta pela extensão existem no pacote"

change_risk:
  classification: baixa
  motivos:
    - "Uma linha no manifesto; nenhum código de domínio tocado"
    - "Sem dados persistidos e sem contrato externo"
    - "Reversível trocando a linha de volta"

spec_verdict: spec-correta   # decisão do usuário em 2026-10-01: RF-15, RF-18 e a seção 8 já definiam o certo
change_set:
  - id: CHG-001
    kind: configuration
    artifact: extension/manifest.json
    purpose: "action.default_popup aponta para dist/popup/index.html, a cópia do build ao lado do popup.js compilado"
    diff: fix/CHG-001.diff
  - id: CHG-002
    kind: test
    artifact: extension/test/manifesto.test.ts
    purpose: "Confere, sem depender do build, que tudo o que o manifesto e as páginas carregam existe no pacote"
    diff: fix/testes.diff

closure:
  policy: local-software
  satisfied: true
  evidence:
    - fix/gate2-verde.txt
resolution_kind: fixed
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
- **Root Cause** (`confirmed`): `extension/manifest.json`, `action.default_popup`.
- **Reproduction Tests**: `extension/test/manifesto.test.ts`, primeiro teste.
- **Regression Tests**: `extension/test/manifesto.test.ts`, segundo teste.

## Resolution

> Estado: resolvido em 2026-10-01 pela rota expressa. Correção aplicada, provada por testes e conferida no Chrome for Testing.

**Root cause** (`confirmed`): o manifesto declarava como popup a página-fonte `popup/index.html`, cujo `<script src="./popup.js">` só existe ao lado da cópia que o build gera em `dist/popup/`, onde o tsc compila `src/popup/popup.ts`. O caminho vem de `bab1e53`, primeiro commit da extensão. Evidências em `evidence/reproduction.md`: a página do manifesto fica em "Verificando…"; a de `dist/` consulta o motor e a aba ativa, e o botão "Verificar compatibilidade" abre `dist/onboarding/index.html`. A suspeita sobre `popup.ts` não se confirmou, porque `chrome.tabs.create` resolve o caminho a partir da raiz da extensão.

**Veredito de spec:** `spec-correta`, decidido pelo usuário em 2026-10-01. RF-15, RF-18 e a seção 8 de `nucleo-transcricao.md` já definiam o painel e o estado de carregamento; o caminho de empacotamento não é matéria de spec. Nenhum adendo.

**resolution_kind:** `fixed`. **change_risk:** baixa.

| CHG | Tipo | Artefato | Diff |
|---|---|---|---|
| CHG-001 | configuration | `extension/manifest.json` | [fix/CHG-001.diff](fix/CHG-001.diff) |
| CHG-002 | test | `extension/test/manifesto.test.ts` (novo) | [fix/testes.diff](fix/testes.diff) |

**Diff de código e de spec:**

```diff
--- a/extension/manifest.json
+++ b/extension/manifest.json
   "action": {
-    "default_popup": "popup/index.html",
+    "default_popup": "dist/popup/index.html",
     "default_title": "Whispper"
   },
```

Spec inalterada (veredito `spec-correta`).

**Testes, vermelho → verde:**

- Vermelho ([fix/gate1-vermelho.txt](fix/gate1-vermelho.txt)): os dois testes de `manifesto.test.ts` falham com `actual: [ 'popup/popup.js' ]`.
- Verde ([fix/gate2-verde.txt](fix/gate2-verde.txt)): os dois passam; a extensão soma 86 aprovados, 0 falhas e 2 pulados (E2E e motor real, que exigem ambiente); typecheck limpo; no Chrome for Testing, o popup do manifesto sai de "Verificando…" e o botão abre a página de boas-vindas.

**Closure** (`local-software`): regressão passando e veredito aprovado, satisfeita em 2026-10-01 14:16.

**Achados com o popup funcionando, fora do escopo deste bug:** o estado da integração vem só da URL da aba ativa ("Ativa" / "Aguardando WhatsApp Web"), e não do monitor de degradação ("ativa" / "degradada" com a estrutura ausente, seção 8); e o motor indisponível aparece sem a instrução de instalação que a seção 8 pede. Candidatos a bug próprio.

## Agent Notes
- Achado na conferência do BUG-20261001-MAC1; não tem relação causal com ele (o caminho do popup é o mesmo desde o primeiro commit da extensão).
- Severidade high e prioridade P1 confirmadas pelo usuário em 2026-10-01: painel inteiro inoperante, com contorno pela URL da página de boas-vindas.
- Candidato à rota expressa do `/reversa-debugger-fix`: a correção provável é uma linha no manifesto, com teste que confira que todo HTML referenciado pelo manifesto tem os scripts que carrega.
- Taxonomia: `taxonomy.yaml` está vazio; proposta `area: extensao`, `module: painel`, `feature: estado-do-motor`.
- Closure policy: o `README.md` do registro guarda em `closure_policy` o critério livre do MAC1 ("Resolvido quando o fluxo inteiro de instalação terminar"); adotei `local-software` para este bug. Convém o usuário fixar o valor do README.
- A captura de tela do usuário não foi salva: mostra conversas e contatos do WhatsApp.
