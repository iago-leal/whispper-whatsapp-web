---
schema_version: 1
id: BUG-20261001-MAC1
display_number: 1
title: Erro -1 ao tentar abrir instalador .pkg da extensão (macOS)
status: resolved
phase: null
severity: critical
priority: P0
created: 2026-10-01
updated: 2026-10-01T14:00-03:00

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [compatibilidade-instalacao, macOS]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "4/4"
  suspected_triggers: []
  capsule: evidence/reproduction.md

mitigation: null   # não aplicável: extensão em desenvolvimento, sem usuários em produção

blocking: []
relationships: []

traceability:
  specs:
    - "_reversa_sdd/sdd/compatibilidade-instalacao.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/compatibilidade-instalacao.md#10-integrações-e-dependências"
  affected_code:
    - extension/src/onboarding/onboarding.ts
  root_cause:
    state: confirmed
    hypothesis: >-
      O botão "Baixar Instalador" recebe href "#download-<arquivo>" com o atributo download; o Chrome
      salva a própria página de boas-vindas com o nome .pkg, e o Instalador do macOS não lê HTML
      (pagecontroller erro -1). Nenhum artefato do repositório gera um .pkg real que a extensão sirva.
    causal_path:
      - "compatibilidade.ts sugere o arquivo whispper-macos-apple-silicon.pkg sem origem real"
      - "onboarding.ts configurarDownload grava href '#download-<arquivo>' + download"
      - "Chrome salva o documento atual (onboarding/index.html) como .pkg"
      - "Gatekeeper bloqueia (sem assinatura); forçado, o Instalador falha com erro -1"
    evidence:
      - ref: evidence/pkg-baixado-e-html.txt
        observation: "Os 4 .pkg baixados têm o SHA-256 de extension/onboarding/index.html; file(1) diz HTML"
      - ref: evidence/install-log-20261001-1053.txt
        observation: "O pacote alternativo (gerar_pkg.sh não commitado) instala com sucesso aparente, mas o postinstall falha ao ler ~/extension/manifest.json"
    code_refs:
      - file: extension/src/onboarding/onboarding.ts
        symbol: ControladorOnboarding.configurarDownload
        commit: bab1e53
      - file: extension/src/dominio/compatibilidade.ts
        symbol: VerificadorCompatibilidade.avaliar
        commit: bab1e53
  reproduction_tests:
    - "extension/test/onboarding-instalador.test.ts"
    - "auxiliar/tests/test_instalador_pkg.py::test_gerador_produz_pacote_xar"
    - "extension/test/e2e-instalacao-guiada.test.ts (WHISPPER_E2E=1)"
  regression_tests:
    - "auxiliar/tests/test_instalador_pkg.py::test_instala_so_na_pasta_do_usuario"
    - "auxiliar/tests/test_instalador_pkg.py::test_scripts_levam_motor_e_key_sem_lixo"
    - "auxiliar/tests/test_instalador_pkg.py::test_postinstall_registra_o_host_para_a_extensao"
    - "auxiliar/tests/test_instalador_pkg.py::test_postinstall_falha_quando_a_instalacao_falha"
    - "extension/test/e2e-instalacao-guiada.test.ts (WHISPPER_E2E=1)"

change_risk:
  classification: média
  motivos:
    - "Novo artefato de distribuição (.pkg) e comportamento do Instalador do macOS em domínio de usuário"
    - "Altera o link de download da página de boas-vindas, ponto já tocado pelo BUG-20261001-404B"
    - "Reversível: sem dados persistidos, sem contrato externo; a instalação só grava na pasta do usuário"

spec_verdict: spec-correta   # decisão do usuário em 2026-10-01: RF-07 e seção 10 já definiam o certo
change_set:
  - id: CHG-001
    kind: code
    artifact: auxiliar/ferramentas/gerar_pkg.sh
    purpose: "Pacote sem payload, só domínio do usuário, arm64, com o motor e a key no layout do repositório"
    diff: fix/CHG-001.diff
  - id: CHG-002
    kind: code
    artifact: auxiliar/ferramentas/postinstall.sh
    purpose: "PATH do shell de login, log em ~/Library/Logs e código de saída real do motor.sh instalar"
    diff: fix/CHG-002.diff
  - id: CHG-003
    kind: code
    artifact: extension/src/onboarding/onboarding.ts
    purpose: "Botão de download aponta para o .pkg embutido (chrome.runtime.getURL); sai o desvio do 404B"
    diff: fix/CHG-003.diff
  - id: CHG-004
    kind: configuration
    artifact: extension/package.json
    purpose: "build embute o instalador no macOS (build:instalador); fora do macOS, nada faz"
    diff: fix/CHG-004.diff
  - id: CHG-005
    kind: other
    artifact: "whispper-macos-apple-silicon.pkg; auxiliar/tests/test_pkg.sh"
    purpose: "Deleção aprovada dos artefatos não versionados da tentativa anterior"
    diff: null

closure:
  policy: other
  criterion: "Resolvido quando o fluxo inteiro de instalação terminar (validação ponta a ponta do usuário)"
  satisfied: true
  evidence:
    - fix/gate2-verde.txt
    - evidence/instalador-grafico-20261001-1351.txt
resolution_kind: fixed
---

# Erro -1 ao tentar abrir instalador .pkg da extensão (macOS)

## Summary
A instalação do motor local do Whispper falha num Mac M1 (macOS). O usuário baixa o `.pkg` na tela "Instalação Guiada" da extensão, mas o Gatekeeper bloqueia por falta de assinatura/notarização. Mesmo após o usuário forçar a abertura via Ajustes > Privacidade e Segurança, o arquivo `.pkg` resulta em "com.apple.installer.pagecontroller erro -1", interrompindo por completo a instalação.

## Expected Behavior
Conforme a Spec (`_reversa_sdd/sdd/compatibilidade-instalacao.md#61-requisitos-principais`, requisito RF-07), o instalador deveria rodar pelos meios padrões do SO, sem terminal e sem senha de administrador. Conforme `_reversa_sdd/sdd/compatibilidade-instalacao.md#10-integrações-e-dependências`, o instalador macOS deve ser assinado e notarizado para evitar bloqueios do SO que o leigo não saiba contornar. Após aberto, deve permitir a instalação sem corrupção no Page Controller.

## Actual Behavior
1. O instalador apresenta alerta de segurança inicial sugerindo exclusão, exigindo bypass manual em Ajustes do Sistema.
2. Após o bypass, o pacote falha completamente em renderizar a interface de instalação, exibindo o `erro -1` de Page Controller.

## Steps to Reproduce
1. Em um Mac M1, chegar no Passo 3 ("Aplicativo") da Instalação Guiada na extensão do Whispper.
2. Clicar em "Baixar Instalador".
3. Tentar abrir o `.pkg` baixado via duplo clique (ocorrerá o bloqueio padrão do macOS).
4. Ir em Ajustes do Sistema > Privacidade e Segurança, localizar o bloqueio e clicar em "Abrir Mesmo Assim".
5. O erro aparecerá na tela impedindo a continuação.

## Evidence
- `evidence/erro-instalacao-pkg.png`: Print do erro de pagecontroller (-1) ao forçar a abertura.
- `evidence/passo-3-extensao.png`: Print da tela da extensão aguardando a finalização da instalação.

## Suspected Area
A área responsável pela geração e empacotamento do instalador `.pkg` para macOS (possível script de build do motor-transcricao-local ou GitHub Actions que não aplica os certificados corretamente nem as permissões corretas da interface de instalação do PackageMaker / pkgbuild).

## Acceptance Criteria
- O arquivo `.pkg` deve ser aberto e instalado sem exibir o erro -1.
- A instalação deve concluir com sucesso, de forma que o fluxo na página de boas-vindas avance para a etapa de download de modelo.

## Traceability
- **Specs**:
  - `_reversa_sdd/sdd/compatibilidade-instalacao.md#61-requisitos-principais`
  - `_reversa_sdd/sdd/compatibilidade-instalacao.md#10-integrações-e-dependências`
- **Affected Code**: `extension/src/onboarding/onboarding.ts` (`configurarDownload`).
- **Root Cause** (`confirmed`): o link de download aponta para um fragmento da própria página com o atributo `download`, e o Chrome salva `onboarding/index.html` como `.pkg`; nenhum artefato do repositório gera um `.pkg` real servido pela extensão. Evidências em `evidence/reproduction.md`.
- **Reproduction Tests**: Nenhum (triagem).
- **Regression Tests**: Nenhum (triagem).

## Resolution

> Estado: resolvido em 2026-10-01. Correção aplicada, provada por testes e conferida pelo usuário no Instalador gráfico.

**Root cause** (`confirmed`): `configurarDownload` gravava `href="#download-<arquivo>"` com `download`; o Chrome salvava `onboarding/index.html` como `.pkg` e o Instalador não lê HTML (erro -1). Nenhum artefato gerava um `.pkg` real servido pela extensão. Evidências em `evidence/reproduction.md`. O gerador da tentativa anterior tinha três defeitos próprios: procurava a key em `~/extension/manifest.json`, punha à frente um Python sem mlx-whisper e terminava com `exit 0` mesmo falhando.

**Veredito de spec:** `spec-correta`, decidido pelo usuário em 2026-10-01. RF-07 e a seção 10 de `compatibilidade-instalacao.md` já definiam o comportamento; a hospedagem embutida na extensão é provisória e a OQ-03 segue aberta. Nenhum adendo de spec.

**resolution_kind:** `fixed`.

| CHG | Tipo | Artefato | Diff |
|---|---|---|---|
| CHG-001 | code | `auxiliar/ferramentas/gerar_pkg.sh` | [fix/CHG-001.diff](fix/CHG-001.diff) |
| CHG-002 | code | `auxiliar/ferramentas/postinstall.sh` | [fix/CHG-002.diff](fix/CHG-002.diff) |
| CHG-003 | code | `extension/src/onboarding/onboarding.ts` | [fix/CHG-003.diff](fix/CHG-003.diff) |
| CHG-004 | configuration | `extension/package.json` | [fix/CHG-004.diff](fix/CHG-004.diff) |
| CHG-005 | other | deleção de `whispper-macos-apple-silicon.pkg` (raiz) e `auxiliar/tests/test_pkg.sh` | — |

**Diff de código e de spec:** os diffs acima; spec inalterada (veredito `spec-correta`).

**Testes, vermelho → verde:**

- Vermelho ([fix/gate1-vermelho.txt](fix/gate1-vermelho.txt)): o teste de unidade recebeu `javascript:void(0)`; o pytest falhou no gerador antigo; o E2E barrou o `alert` do desvio do 404B e, contra o commit base, recebeu `'<!DO'` no lugar de `xar!`.
- Verde ([fix/gate2-verde.txt](fix/gate2-verde.txt)): extensão 84 aprovados, 0 falhas; typecheck limpo; auxiliar 126 aprovados; os 5 testes do instalador passam; E2E com o `installer` real passou da etapa 1 à 6 em 17 s.

**Closure** (critério do usuário: "o fluxo inteiro de instalação termina"), satisfeita em 2026-10-01 13:51: depois de `motor.sh desinstalar`, o usuário baixou o `.pkg` pela etapa 3 (pacote xar de 30 KB, SHA-256 igual ao embutido), abriu-o pelo Finder com "Abrir Mesmo Assim", o Instalador concluiu sem erro -1 e sem senha, e a página de boas-vindas chegou à etapa 6 ("Tudo pronto para usar!"). Evidência em [evidence/instalador-grafico-20261001-1351.txt](evidence/instalador-grafico-20261001-1351.txt).

**Achados na conferência, fora do escopo deste bug:** o popup da extensão fica em "Verificando…" (`manifest.json` aponta `default_popup` para `popup/index.html`, cujo `popup.js` não existe; o funcional está em `dist/popup/`), e o ícone de transcrição não aparece no balão de voz do WhatsApp Web. Ambos vêm das features 002 a 004 e serão registrados como bugs próprios.

## Agent Notes
- **Taxonomy**: Como o arquivo `taxonomy.yaml` é novo e não possuía domínios mapeados, adotei `unclassified` para area, module e feature. Sugestão para o futuro é preencher com `area: distribuicao`, `module: instaladores`, `feature: macOS-pkg`.
- **Closure Policy**: A política adotada é `other`, que traduz a demanda do usuário "Resolvido quando o fluxo inteiro de instalação terminar". Para as regras do repositório e views do gráfico, essa política opera como `local-software`, onde a regressão deverá testar o fluxo end-to-end da extensão (se isso for mockável) ou a resolução exigirá entrega de instalador corrigido.
- **Fora desta correção (fix, 2026-10-01)**:
  - Assinatura e notarização (RNF-03) dependem do Programa de desenvolvedor da Apple (OQ-03); o Gatekeeper continua exigindo "Abrir Mesmo Assim".
  - O pacote depende de Python 3.11+, mlx-whisper, ffmpeg e do modelo já presentes; para o usuário leigo, o RF-07 ainda não se cumpre. Empacotar um runtime próprio é trabalho de feature, a registrar à parte.
  - O instalador do Windows (`whispper-windows-x64.exe`) não existe; o link passa a falhar como download. O aviso de falha com nova tentativa (seção 10) fica para o BUG-20261001-404B.
