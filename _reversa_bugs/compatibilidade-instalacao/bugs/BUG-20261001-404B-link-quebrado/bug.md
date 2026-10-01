---
schema_version: 1
id: BUG-20261001-404B-link-quebrado
display_number: 2
title: Link de download do instalador retorna 404 (GitHub Releases ausente)
status: active
phase: diagnosing
severity: critical
priority: P1
created: 2026-10-01
classification:
  area: unclassified
  module: unclassified
  feature: unclassified
  origin:
    type: manual-report
  security_suspected: false
traceability:
  specs:
    - _reversa_sdd/sdd/compatibilidade-instalacao.md#OQ-03
  affected_code:
    - extension/src/onboarding/onboarding.ts
  existing_tests: []
  root_cause:
    status: confirmed
    summary: "O botão de download na extensão aponta para uma URL de release no GitHub (whispper-bot/whispper-whatsapp-web) que ainda não existe publicamente, conforme indicado pela pendência OQ-03 na especificação."
  reproduction_tests:
    - extension/test/onboarding.test.ts
  regression_tests:
    - extension/test/onboarding.test.ts
relations:
  - type: caused-by
    target: BUG-20261001-MAC1-pkg-falha
    state: confirmed
spec_verdict: spec-correta
change_set:
  - id: CHG-001
    kind: code
    artifact: extension/src/onboarding/onboarding.ts
    description: "Alteração da URL de download para javascript:void(0) com evento de fallback"
closure:
  policy: local-software
  satisfied: true
resolution_kind: fixed
---

## Relato (Expected vs Observed)
Ao clicar no botão "Baixar Instalador", o navegador deveria baixar o pacote `.pkg` local gerado. No entanto, o botão foi configurado para apontar para a URL `https://github.com/whispper-bot/whispper-whatsapp-web/releases/latest/download/whispper-macos-apple-silicon.pkg`. Como o repositório ou a release ainda não existem publicamente, o GitHub retorna uma página de erro 404 (Not Found).

## Passos para Reproduzir
1. Instalar a extensão carregada sem empacotamento no Chrome (Modo Desenvolvedor).
2. Prosseguir pelo onboarding de instalação até a Etapa 3 ("Aplicativo").
3. Clicar no botão verde "Baixar Instalador".
4. Observar que uma nova aba é aberta retornando erro 404 do GitHub.

## Frequência
100% das vezes ao tentar baixar.

## Notas do Agente
Registrado via relato em vídeo do usuário. É um defeito originado (caused-by) pela correção aplicada no bug #1, onde o mock local corrompido foi trocado pelo link externo que se assumia disponível via OQ-03, mas a infraestrutura remota ainda não foi criada.
