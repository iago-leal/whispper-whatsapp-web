---
schema_version: 1
id: BUG-20261001-404B
display_number: 2
title: Link de download do instalador falha em silêncio (404 do GitHub; instalador ausente)
status: resolved
phase: null
severity: critical
priority: P1
created: 2026-10-01
updated: 2026-10-01T17:38-03:00

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [compatibilidade-instalacao]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "3/3"
  suspected_triggers: []
  capsule: evidence/reproduction.md

mitigation: null   # não aplicável: extensão em desenvolvimento, sem usuários em produção

blocking: []

relationships:
  - bug: BUG-20261001-MAC1
    type: caused-by
    state: rejected
    evidence:
      - ref: ../BUG-20261001-MAC1-pkg-falha/debate/resposta-final.md
        observation: >-
          O link do GitHub nasceu da primeira tentativa de corrigir o MAC1 (item 3 da recomendação do
          juiz), não do defeito do MAC1 (href de fragmento que salvava a própria página).
  - bug: BUG-20261001-MAC1
    type: related-to
    state: confirmed
    evidence:
      - ref: ../BUG-20261001-MAC1-pkg-falha/fix/CHG-003.diff
        observation: "O CHG-003 do MAC1 removeu o desvio javascript:void(0) do 404B e passou a servir o .pkg embutido"
      - ref: ../BUG-20261001-MAC1-pkg-falha/bug.md
        observation: "Agent Notes do MAC1: o aviso de falha com nova tentativa (seção 10) fica para o 404B"

traceability:
  specs:
    - "_reversa_sdd/sdd/compatibilidade-instalacao.md#8-design-e-interface"
    - "_reversa_sdd/sdd/compatibilidade-instalacao.md#10-integrações-e-dependências"
    - "_reversa_sdd/sdd/compatibilidade-instalacao.md#14-open-questions"
  affected_code:
    - extension/src/onboarding/onboarding.ts
    - extension/onboarding/index.html
  root_cause:
    state: confirmed
    hypothesis: >-
      ControladorOnboarding.configurarDownload monta o link a partir de instaladorSugerido.arquivo sem
      verificar se o instalador está disponível, e a etapa 3 não tem o estado de erro exigido pela spec
      (seção 8: falha de download com "Tentar de novo"; seção 10, linha OQ-03: informar a falha e oferecer
      nova tentativa). Com a hospedagem em aberto (OQ-03), qualquer instalador indisponível vira um
      download que falha em silêncio: primeiro o 404 do GitHub Releases, hoje o .exe do Windows ausente.
    causal_path:
      - "OQ-03 aberta: não há hospedagem dos instaladores; só o .pkg do macOS é embutido no build"
      - "compatibilidade.ts sugere whispper-windows-x64.exe para Windows 64 bits (RF-06), arquivo que não existe"
      - "onboarding.ts configurarDownload grava href e download sem conferir o recurso"
      - "o Chrome inicia o download e o cancela; a página não observa a falha e não oferece nova tentativa"
    evidence:
      - ref: evidence/repro-head-9f0c6a9.txt
        observation: "Cenário Windows 3/3: href para o .exe ausente, fetch rejeitado, download canceled, etapa 3 sem aviso"
      - ref: evidence/reproduction.md
        observation: "No HEAD 9f0c6a9 o sintoma original (404 do GitHub) não se reproduz: o macOS baixa o .pkg embutido"
      - ref: evidence/sonda-head-e-rf16.txt
        observation: "HEAD em recurso da extensão responde 200 quando o arquivo existe e rejeita com TypeError quando falta"
    code_refs:
      - file: extension/src/onboarding/onboarding.ts
        symbol: ControladorOnboarding.configurarDownload
        commit: 6321c4e
      - file: extension/onboarding/index.html
        symbol: "#etapa-instalador"
        commit: bab1e53
  reproduction_tests:
    - "extension/test/onboarding-instalador.test.ts::sem o instalador, a etapa 3 informa a falha e esconde o botão"
    - "extension/test/onboarding-instalador.test.ts::\"Tentar de novo\" refaz a conferência e devolve o botão quando o instalador aparece"
  regression_tests:
    - "extension/test/onboarding-instalador.test.ts::com o instalador disponível, o botão segue visível e a página não acusa falha"
    - "extension/test/onboarding-instalador.test.ts::o botão oferece o .pkg embutido na extensão (BUG-20261001-MAC1)"
    - "extension/test/onboarding.test.ts (o link não aponta para a release ausente do GitHub)"

change_risk:
  classification: baixa
  motivos:
    - "Uma página (etapa 3 da instalação guiada); sem dados persistidos nem contrato externo"
    - "O caminho feliz do macOS não muda: download nativo, clique não interceptado"
    - "Reversível por revert; a verificação só lê um recurso da própria extensão"

spec_verdict: spec-correta   # decisão do usuário em 2026-10-01: seções 8 e 10 já definiam o aviso de falha com nova tentativa
change_set:   # Gate 2 aprovado e aplicado em 2026-10-01 17:32
  - id: CHG-001
    kind: code
    artifact: extension/src/onboarding/onboarding.ts
    purpose: "conferirInstalador (HEAD no próprio href) alterna botão e alerta; btn-tentar-download refaz a conferência"
    diff: fix/CHG-001.diff
  - id: CHG-002
    kind: code
    artifact: extension/onboarding/index.html
    purpose: "Alerta #erro-download-instalador na etapa 3, oculto por padrão, com \"Tentar de novo\""
    diff: fix/CHG-002.diff

closure:
  policy: other
  criterion: "Resolvido quando o fluxo inteiro de instalação terminar (README do registro)"
  satisfied: true
  evidence:
    - fix/gate2-verde.txt
    - evidence/aceitacao-pos-correcao.txt
    - fix/e2e-closure.txt
resolution_kind: fixed
---

# Link de download do instalador falha em silêncio (404 do GitHub; instalador ausente)

## Summary

Na etapa 3 ("Aplicativo") da instalação guiada, o botão "Baixar Instalador" leva a um instalador que pode não existir, e a página não percebe a falha. No relato original, o botão abria uma aba com o 404 do GitHub Releases. Esse sintoma já não ocorre desde o commit `6321c4e` (BUG-20261001-MAC1), que passou a servir o `.pkg` embutido; no Windows, porém, o botão aponta para `whispper-windows-x64.exe`, que não existe, e o download é cancelado sem aviso nem nova tentativa.

## Expected Behavior

Spec efetiva `_reversa_sdd/sdd/compatibilidade-instalacao.md` (adendo 005 não altera estes pontos):

- Seção 8, estados de erro: "falha de download com o botão 'Tentar de novo'".
- Seção 10, linha "Hospedagem dos instaladores (local em aberto, OQ-03)": "A página informa a falha de download e oferece nova tentativa."
- Seção 14, OQ-03: hospedagem e assinatura dos instaladores seguem em aberto.

## Actual Behavior

- Relato original (2026-10-01, vídeo): o botão abria `https://github.com/whispper-bot/whispper-whatsapp-web/releases/latest/download/whispper-macos-apple-silicon.pkg`, que responde 404.
- HEAD `9f0c6a9`: no macOS o download do `.pkg` embutido termina; no Windows o `href` aponta para `dist/instaladores/whispper-windows-x64.exe`, o Chrome cancela o download e a etapa 3 continua mostrando só "Aguardando a instalação do aplicativo auxiliar…".

## Steps to Reproduce

1. Instalar a extensão desempacotada no Chrome (modo desenvolvedor), num computador com Windows 64 bits, ou emular o UA do Windows (script em `evidence/repro-404b.ts`).
2. Avançar pela instalação guiada até a etapa 3 ("Aplicativo").
3. Clicar em "Baixar Instalador".
4. Observar que nenhum arquivo é baixado e que a página não informa a falha nem oferece "Tentar de novo".

Relato original: os mesmos passos num Mac, antes do commit `6321c4e`, abriam uma aba com o 404 do GitHub.

## Evidence

- `evidence/video-404.mov`: vídeo do relato original (fora do git).
- `evidence/reproduction.md`: cápsula de reprodução, original e no HEAD.
- `evidence/repro-head-9f0c6a9.txt`: três execuções no Chrome for Testing, cenários macOS e Windows.
- `evidence/sonda-head-e-rf16.txt`: `HEAD` em recurso da extensão e retomada na etapa 3.

## Suspected Area

`extension/src/onboarding/onboarding.ts` (`configurarDownload`) e a marcação da etapa 3 em `extension/onboarding/index.html`.

## Acceptance Criteria

- Instalador indisponível: a etapa 3 esconde o botão de download, informa a falha e oferece "Tentar de novo", que refaz a verificação.
- Instalador disponível: o botão segue baixando o `.pkg` embutido por download nativo, sem interceptar o clique e sem aviso de falha.
- O link nunca aponta para a release ausente do GitHub.

## Traceability

- **Specs:** `compatibilidade-instalacao.md` seções 8, 10 (linha OQ-03) e 14 (OQ-03).
- **Affected Code:** `extension/src/onboarding/onboarding.ts` (`configurarDownload`), `extension/onboarding/index.html` (`#etapa-instalador`).
- **Root Cause** (`confirmed`): o link é montado sem verificar o instalador e a etapa 3 não tem estado de erro; ver o front matter.
- **Reproduction Tests:** `extension/test/onboarding-instalador.test.ts`: "sem o instalador, a etapa 3 informa a falha e esconde o botão" e "\"Tentar de novo\" refaz a conferência e devolve o botão quando o instalador aparece".
- **Regression Tests:** `extension/test/onboarding-instalador.test.ts` ("com o instalador disponível, o botão segue visível e a página não acusa falha"; o teste do MAC1) e `extension/test/onboarding.test.ts` (sem release do GitHub).

## Resolution

> Estado: resolvido em 2026-10-01. Correção aplicada em dois gates aprovados, provada por testes, aceita no Chrome for Testing e com o fluxo inteiro de instalação conferido pelo E2E.

**Root cause** (`confirmed`): `ControladorOnboarding.configurarDownload` montava o link sem verificar se o instalador existia, e a etapa 3 não tinha o estado de erro da spec. Com a hospedagem em aberto (OQ-03), todo instalador indisponível virava um download que falhava em silêncio: primeiro o 404 do GitHub Releases, que o commit `6321c4e` do MAC1 já havia eliminado, e depois o `.exe` do Windows ausente. Evidências em `evidence/reproduction.md`.

**Veredito de spec:** `spec-correta`, decidido pelo usuário em 2026-10-01. A seção 8 ("falha de download com o botão 'Tentar de novo'") e a seção 10, linha OQ-03 ("a página informa a falha de download e oferece nova tentativa"), já definiam o comportamento. O texto do alerta não repete o da EC-02 ("verifique a conexão") porque a falha é de arquivo indisponível, não de rede. Nenhum adendo.

**resolution_kind:** `fixed`.

| CHG | Tipo | Artefato | Diff |
|---|---|---|---|
| CHG-001 | code | `extension/src/onboarding/onboarding.ts` | [fix/CHG-001.diff](fix/CHG-001.diff) |
| CHG-002 | code | `extension/onboarding/index.html` | [fix/CHG-002.diff](fix/CHG-002.diff) |

**Diff de código e de spec:** os diffs acima e os testes em [fix/testes.diff](fix/testes.diff); spec inalterada (veredito `spec-correta`).

**Testes, vermelho → verde:**

- Vermelho ([fix/gate1-vermelho.txt](fix/gate1-vermelho.txt)): com os testes aplicados sobre `9f0c6a9`, os dois de reprodução falharam com `actual: undefined, expected: 'block'` (nenhum aviso de falha); os três de regressão passaram.
- Verde ([fix/gate2-verde.txt](fix/gate2-verde.txt)): 5/5 no onboarding; extensão com 103 testes, 101 aprovados, 0 falhas, 2 E2E pulados; typecheck limpo; build com o `.pkg` embutido.
- Aceitação no navegador ([evidence/aceitacao-pos-correcao.txt](evidence/aceitacao-pos-correcao.txt), 3/3): no macOS, botão visível, download `completed`, sem alerta; no Windows emulado, botão oculto, alerta com "Tentar de novo", nenhum download cancelado em silêncio. Imagem em [evidence/etapa3-windows-pos-correcao.png](evidence/etapa3-windows-pos-correcao.png).

**Closure** (critério do registro: "o fluxo inteiro de instalação termina"), satisfeita em 2026-10-01 17:37: o E2E com `WHISPPER_E2E=1`, aceito pelo usuário, fez o build, baixou o `.pkg` pela etapa 3, instalou com o `installer` real ("The install was successful") e chegou à etapa 6 com a transcrição de teste em 17,8 s. Saída em [fix/e2e-closure.txt](fix/e2e-closure.txt).

## Agent Notes

- Registrado via relato em vídeo do usuário. O registro original declarava `closure.satisfied: true`, `resolution_kind: fixed` e veredito `spec-correta` sem correção nem decisão humana, além de campos fora do schema (`relations`, `root_cause.status`); o front matter foi refeito pelo `/reversa-debugger-fix` em 2026-10-01. O `fix/plan.html` anterior, que propunha `javascript:void(0)` com `alert`, ficou em `fix/plan-v0-obsoleto.html`: aquele desvio chegou à árvore de trabalho e foi removido pelo CHG-003 do MAC1.
- Escopo decidido pelo usuário em 2026-10-01: o 404B cobre o defeito de fundo (instalador indisponível sem aviso nem nova tentativa), como as Agent Notes do MAC1 previam.
- Fora desta correção:
  - Retomada na etapa 3 (RF-16): o botão fica com `href` para a própria página, porque o link só é montado na etapa 2. Causa distinta; registrar como bug próprio (decisão do usuário).
  - O instalador do Windows não existe; produzi-lo é trabalho de feature. Esta correção só faz a página admitir a falha.
  - Hospedagem pública e assinatura (OQ-03, RNF-03) continuam em aberto.
- Taxonomia: como no MAC1, sugere-se `area: distribuicao`, `module: instaladores`.
