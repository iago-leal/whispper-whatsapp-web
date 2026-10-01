---
schema_version: 1
id: BUG-20261001-GAOZ
display_number: 4
title: "Ícone de transcrição não aparece: a integração desiste se a página carrega sem conversa aberta"
status: resolved
phase: null
severity: critical
priority: P0
created: 2026-10-01
updated: 2026-10-01T15:26-03:00

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [integracao-whatsapp-web, content-script]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "2/2"
  suspected_triggers: []
  capsule: evidence/reproduction.md

blocking: []
relationships: []

traceability:
  specs:
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#62-fluxo-principal-happy-path"
  affected_code:
    - extension/src/content/index.ts
    - extension/src/content/monitor-degradacao.ts
    - extension/src/content/detector-mensagens.ts
  root_cause:
    state: confirmed
    location: extension/src/content/monitor-degradacao.ts (avaliarSaudeDasEstruturas) + extension/src/content/index.ts (inicializar)
    summary: >-
      A verificação de saúde trata a falta de #main, que é só a ausência de conversa aberta, como
      estrutura ausente; o WhatsApp Web sempre carrega assim, e inicializar() retorna no estado
      "degradada" antes do único reagendamento, desistindo para sempre. Causa contribuinte 1: a
      observação se liga ao #main do momento e nunca acompanha a troca de conversa, que RF-11 pede.
      Causa contribuinte 2, achada na conferência real: o WhatsApp monta o player de voz depois do
      balão, dentro dele, e o detector só procura balões no nó adicionado, nunca nos ancestrais; e
      balaoMensagem casa a linha e o conv-msg aninhado da mesma mensagem, o que duplicaria o ícone.
    causal_path:
      - "content script roda em document_idle, sem conversa aberta"
      - "avaliarSaudeDasEstruturas(document) não acha #main e devolve degradada [containerConversa]"
      - "inicializar() faz console.warn e return; o setTimeout(inicializar, 1000) fica depois do return"
      - "nenhum observador é criado: a conversa aberta depois não recebe ícone"
      - "contribuinte 1: com #main presente, observarMensagensDeAudio observa aquela instância; um #main novo fica sem observador"
      - "contribuinte 2: #main novo chega com as linhas e sem player; o player entra ~130 ms depois dentro de uma linha existente; processarNos não sobe ao balão ancestral"
    evidence:
      - "evidence/reproduction.md S1: mesmo aviso do relato e 0 ícones 0,5 s e 2,5 s depois de abrir a conversa"
      - "evidence/reproduction.md S2: controle com #main no carregamento recebe 1 ícone; após substituir #main, 0 ícones na conversa nova e no retorno"
      - "_reversa_sdd/sdd/integracao-whatsapp-web.md EC-10: sem conversa carregada, nenhum aviso de degradação"
      - "evidence/conferencia-whatsapp-real.md: com CHG-001/002 no ar, sem aviso de degradação, mas 0 ícones; #main substituído na troca; player montado depois do balão; row e conv-msg[data-id] aninhados"
    code_refs:
      - { file: extension/src/content/monitor-degradacao.ts, symbol: avaliarSaudeDasEstruturas, commit: bab1e53 }
      - { file: extension/src/content/index.ts, symbol: inicializar, commit: bab1e53 }
      - { file: extension/src/content/detector-mensagens.ts, symbol: observarMensagensDeAudio, commit: bab1e53 }
      - { file: extension/src/content/configuracao-estruturas.ts, symbol: "seletores.balaoMensagem", commit: bab1e53 }
    open_points: []   # a recriação de #main na troca foi confirmada em evidence/conferencia-whatsapp-real.md
  reproduction_tests:
    - "extension/test/integracao-conversa.test.ts::reprodução: a página carrega sem conversa e o ícone aparece em até 500 ms quando a conversa abre (RF-01, RF-03)"
    - "extension/test/integracao-conversa.test.ts::reprodução no WhatsApp real: o player montado depois do balão recebe o ícone em até 500 ms (RF-01, RF-03)"
  regression_tests:
    - "extension/test/integracao-conversa.test.ts::trocar de conversa e voltar mantém exatamente um ícone por mensagem de voz (RF-02, RF-11)"
    - "extension/test/integracao-conversa.test.ts::sem conversa aberta não há aviso de degradação (EC-10)"
    - "extension/test/integracao-conversa.test.ts::conversa sem a lista de mensagens fica degradada e sem ícone, e a seguinte volta a receber (RF-11, RF-12)"
    - "extension/test/monitor-degradacao.test.ts::avaliarSaudeDasEstruturas não acusa degradação sem conversa aberta (EC-10, BUG-20261001-GAOZ)"
    - "extension/test/monitor-degradacao.test.ts::avaliarSaudeDasEstruturas acusa degradação quando a conversa aberta não tem a lista de mensagens (RF-11)"

regression_analysis:
  last_known_good: null
  first_known_bad: bab1e53
  bisect: "não aplicável: o defeito nasceu com o código, no primeiro commit da extensão"
  culprit_commit: bab1e53

change_risk:
  classification: média
  motivos:
    - "Muda o ciclo de vida do script de conteúdo, que toda a integração usa"
    - "Muda a semântica de 'degradada' consumida pelo núcleo (obterStatusGeral), sem mudar o tipo StatusSaudeFonte"
    - "Os seletores só foram conferidos no DOM real uma vez; a aceitação final depende de conferência no WhatsApp Web"
    - "Sem dados persistidos e sem contrato externo; reversível por git revert"

mitigation:
  kind: none
  reason: "Sistema em teste local pelo próprio usuário; a indisponibilidade não corrompe dados e não há contorno: o WhatsApp Web sempre carrega sem conversa"

spec_verdict: spec-correta   # decisão do usuário em 2026-10-01: EC-10, RF-11 e RF-01/02/03/04 já definiam o certo
change_set:
  - id: CHG-001
    kind: code
    artifact: extension/src/content/monitor-degradacao.ts
    purpose: "Sem conversa aberta a integração está ativa (EC-10); com conversa aberta, falta de containerMensagens nela é degradação (RF-11)"
    diff: fix/CHG-001.diff
  - id: CHG-002
    kind: code
    artifact: extension/src/content/index.ts
    purpose: "Acompanha cada #main novo, desliga o observador anterior, reavalia a saúde a cada troca e remove o laço de setTimeout"
    diff: fix/CHG-002.diff
  - id: CHG-003
    kind: test
    artifact: extension/test/monitor-degradacao.test.ts
    purpose: "O teste que exigia degradada sem #main codificava o defeito; passa a exigir EC-10 e ganha a degradação real"
    diff: fix/testes.diff
  - id: CHG-004
    kind: test
    artifact: extension/test/integracao-conversa.test.ts
    purpose: "Chrome for Testing com a extensão montada do código-fonte e página falsa em web.whatsapp.com; pulado sem o navegador"
    diff: fix/testes.diff
  - id: CHG-005
    kind: test
    artifact: extension/test/suporte/navegador-cdp.ts
    purpose: "Pagina.navegarSimulado: serve HTML no lugar da rede e anota console e mundos isolados"
    diff: fix/testes.diff
  - id: CHG-006
    kind: code
    artifact: extension/src/content/detector-mensagens.ts
    purpose: "Detecção parte de cada elemento de voz e sobe ao balão mais próximo: cobre o player montado depois do balão e evita o ícone duplicado nos balões aninhados (RF-02, RF-04)"
    diff: fix/CHG-006.diff
  - id: CHG-007
    kind: test
    artifact: extension/test/integracao-conversa.test.ts
    purpose: "Página falsa com a estrutura real (linha > conv-msg[data-id] > data-virtualized), subteste do player tardio e data-id no ícone"
    diff: fix/testes-v2.diff

closure:
  policy: local-software
  satisfied: true
  evidence:
    - fix/gate2-v2-verde.txt
    - evidence/conferencia-whatsapp-real.md
resolution_kind: fixed
---

# Ícone de transcrição não aparece: a integração desiste se a página carrega sem conversa aberta

## Summary
Com o aplicativo auxiliar instalado e a extensão recarregada, nenhuma mensagem de voz do WhatsApp Web recebe o ícone do Whispper. O script de conteúdo declara a integração "degradada" no carregamento da página e nunca mais tenta.

## Expected Behavior
Pela spec `_reversa_sdd/sdd/integracao-whatsapp-web.md`, seção 6.1: RF-01 (ícone em cada mensagem de voz visível da conversa aberta), RF-02 (exatamente um ícone, inclusive após troca de conversa ou retorno a ela), RF-03 (ícone em até 500 ms após a mensagem aparecer) e RF-11 (verificar as estruturas ao carregar a página **e a cada troca de conversa**, informando "ativa" ou "degradada"). Seção 6.2, passo 2: o sistema detecta a mensagem de voz e insere o ícone.

## Actual Behavior
Nenhum ícone em nenhuma conversa. No carregamento da página, o console mostra `[Whispper] Adaptador em estado degradado. Estruturas ausentes: Array(1)`. Com a conversa aberta, os seletores do projeto casam o balão de voz (1 botão "Reproduzir mensagem de voz"), mas há 0 botões do Whispper injetados.

## Steps to Reproduce
1. Instalar o aplicativo auxiliar (página de boas-vindas até a etapa 6) e recarregar a extensão.
2. Abrir ou recarregar `https://web.whatsapp.com` (a página abre sem conversa selecionada).
3. Abrir uma conversa com mensagem de voz.
4. Observar o balão sem ícone e, no console, o aviso de estado degradado emitido no carregamento.

## Evidence
- `evidence/console-e-inspecao.md`: aviso do console e contagem dos seletores do projeto dentro de `#main`, com a conversa aberta (só estrutura; identificador de mensagem mascarado).
- Relato bruto: `../../intake/relato-20261001-1354.md`.
- `evidence/reproduction.md` e `evidence/reproduzir.ts`: cápsula da reprodução isolada (2/2).
- `evidence/conferencia-whatsapp-real.md`: conferência no WhatsApp real, antes e depois do CHG-006 (só estrutura).

## Suspected Area
`extension/src/content/index.ts`, `inicializar()`: chama `adaptador.verificarSaude()` antes de tudo; `avaliarSaudeDasEstruturas` (`monitor-degradacao.ts`) exige `#main` (`containerConversa`), que só existe com uma conversa aberta. O WhatsApp sempre carrega sem conversa, então o estado é "degradada" e a função faz `return` sem nova tentativa; o `setTimeout(inicializar, 1000)` só é alcançado depois da verificação de saúde. Além disso, `observarMensagensDeAudio` observa o `#main` daquele momento, e o WhatsApp recria `#main` a cada troca de conversa: mesmo iniciando, o observador ficaria preso à conversa antiga. Ausência de conversa aberta não é estrutura ausente; RF-11 pede verificar a cada troca.

## Acceptance Criteria
- Carregar o WhatsApp Web sem conversa aberta e depois abrir uma conversa com mensagem de voz mostra o ícone em até 500 ms (RF-03).
- Trocar de conversa e voltar mantém exatamente um ícone por mensagem de voz (RF-02).
- O estado "degradada" só aparece quando uma estrutura de fato falta, e é reavaliado a cada troca de conversa (RF-11).

## Traceability
- **Specs**: `integracao-whatsapp-web.md#61-requisitos-principais` (RF-01, RF-02, RF-03, RF-11), `integracao-whatsapp-web.md#62-fluxo-principal-happy-path`.
- **Affected Code**: `extension/src/content/index.ts` (`inicializar`), `extension/src/content/monitor-degradacao.ts` (`avaliarSaudeDasEstruturas`), `extension/src/content/detector-mensagens.ts` (`observarMensagensDeAudio`).
- **Root Cause** (`confirmed`): `avaliarSaudeDasEstruturas` tratava a ausência de conversa como estrutura ausente e `inicializar` desistia; contribuintes: observador preso ao `#main` do carregamento e detector cego ao player montado depois do balão, com balões aninhados. Ver a Resolution.
- **Reproduction Tests**: `extension/test/integracao-conversa.test.ts`, dois subtestes de reprodução.
- **Regression Tests**: `extension/test/integracao-conversa.test.ts` (troca de conversa, EC-10, degradação real) e `extension/test/monitor-degradacao.test.ts` (EC-10 e RF-11 na unidade).

## Resolution

> Estado: resolvido em 2026-10-01 15:26, pelo ciclo completo do `/reversa-debugger-fix` em duas revisões do plano. Correção aplicada, provada por testes e conferida no WhatsApp Web real.

**Root cause** (`confirmed`, nascida em `bab1e53`, sem commit bom para bisect):

1. **Principal:** `avaliarSaudeDasEstruturas` tratava a falta de `#main`, que só indica conversa fechada, como estrutura ausente. O WhatsApp sempre carrega assim, e `inicializar()` retornava em "degradada" antes do único reagendamento, desistindo para sempre.
2. **Contribuinte 1:** a observação ficava presa ao `#main` do carregamento; o WhatsApp substitui `#main` a cada troca, e RF-11 pede reavaliar a cada troca.
3. **Contribuinte 2**, achada na conferência real depois da revisão 1: o player de voz é montado cerca de 130 ms depois do balão, dentro dele (conteúdo virtualizado), e o detector só procurava balões no nó adicionado. Além disso, `balaoMensagem` casa a linha e o `conv-msg[data-id]` da mesma mensagem, o que duplicaria o ícone.

Evidências: `evidence/reproduction.md` (S1 e S2, 2/2) e `evidence/conferencia-whatsapp-real.md` (ordem de montagem, estrutura da linha e aceitação).

**Estratégia:** correção direta, escolhida pelo usuário; plano em `fix/plan.html` (revisão 2) e `fix/plan-v1.html`. Mitigação não aplicada: sistema em teste local, sem dano a dados e sem contorno.

**Veredito de spec:** `spec-correta`, decidido pelo usuário em 2026-10-01. O EC-10 já proibia o aviso de degradação sem conversa carregada; o RF-11 já pedia a verificação a cada troca; RF-01, RF-02, RF-03 e RF-04 já definiam o ícone em cada mensagem de voz, único, em até 500 ms e com identificador estável. Nenhum adendo.

**resolution_kind:** `fixed`. **change_risk:** média.

| CHG | Tipo | Artefato | Diff | Gate |
|---|---|---|---|---|
| CHG-001 | code | `extension/src/content/monitor-degradacao.ts` | [fix/CHG-001.diff](fix/CHG-001.diff) | 2 (14:43) |
| CHG-002 | code | `extension/src/content/index.ts` | [fix/CHG-002.diff](fix/CHG-002.diff) | 2 (14:43) |
| CHG-003 | test | `extension/test/monitor-degradacao.test.ts` | [fix/testes.diff](fix/testes.diff) | 1 (14:41) |
| CHG-004 | test | `extension/test/integracao-conversa.test.ts` (novo) | [fix/testes.diff](fix/testes.diff) | 1 (14:41) |
| CHG-005 | test | `extension/test/suporte/navegador-cdp.ts` | [fix/testes.diff](fix/testes.diff) | 1 (14:41) |
| CHG-006 | code | `extension/src/content/detector-mensagens.ts` | [fix/CHG-006.diff](fix/CHG-006.diff) | 2, revisão 2 (15:09) |
| CHG-007 | test | `extension/test/integracao-conversa.test.ts` | [fix/testes-v2.diff](fix/testes-v2.diff) | 1, revisão 2 (15:09) |

**Diff de código e de spec:** CHG-001 abaixo; os demais, maiores, nos arquivos de `fix/`. Spec inalterada (veredito `spec-correta`).

```diff
--- a/extension/src/content/monitor-degradacao.ts
+++ b/extension/src/content/monitor-degradacao.ts
-  // Seletor crítico: painel de conversa principal
-  const container = raiz.querySelector(CONFIGURACAO_ESTRUTURAS.seletores.containerConversa);
-  if (!container) {
-    ausentes.push('containerConversa');
+  const conversa = raiz.querySelector(CONFIGURACAO_ESTRUTURAS.seletores.containerConversa);
+  if (conversa && !conversa.querySelector(CONFIGURACAO_ESTRUTURAS.seletores.containerMensagens)) {
+    ausentes.push('containerMensagens');
   }
```

- CHG-002: `acompanharConversaAberta`, chamado no início e por um `MutationObserver` em `document.body`, liga a observação a cada `#main` novo, desliga a anterior, reavalia a saúde, avisa só ao entrar em degradação (com os nomes das estruturas) e substitui o laço de `setTimeout`, que também reinicializava o núcleo a cada tentativa.
- CHG-006: `baloesComVoz` parte de cada elemento de voz, no nó adicionado ou na varredura inicial, e sobe ao balão mais próximo, sem repetição.

**Testes, vermelho → verde:**

- Revisão 1. Vermelho ([fix/gate1-vermelho.txt](fix/gate1-vermelho.txt)): 7 falhas, com o mesmo aviso do relato no console. Verde ([fix/gate2-verde.txt](fix/gate2-verde.txt)): 9/9.
- Revisão 2. Vermelho ([fix/gate1-v2-vermelho.txt](fix/gate1-v2-vermelho.txt)): 4 falhas, com `[2]` ícones por mensagem e o player tardio sem ícone. Verde ([fix/gate2-v2-verde.txt](fix/gate2-v2-verde.txt)): os 12 testes do bug passam; a extensão soma 93 aprovados, 0 falhas e 2 pulados (E2E e motor real, que exigem ambiente); typecheck limpo.
- WhatsApp Web real ([evidence/conferencia-whatsapp-real.md](evidence/conferencia-whatsapp-real.md), seção 5): 1 ícone por mensagem de voz em duas conversas, na ida e na volta, com o `data-id` da mensagem; latência player → ícone de 0 ms; console limpo.

**Closure** (`local-software`): regressão passando, veredito aprovado e aceitação conferida no ambiente real; satisfeita em 2026-10-01 15:26.

## Agent Notes
- Achado na conferência do BUG-20261001-MAC1, depois da instalação concluída; sem relação causal com ele.
- Severidade critical e prioridade P0 confirmadas pelo usuário em 2026-10-01: a função central fica indisponível em toda conversa.
- Ordem combinada com o usuário: corrigir depois do BUG-20261001-RMLU (popup) e antes do BUG-20261001-2MOY (extração), que só se manifesta com o ícone presente.
- A inspeção estrutural foi feita numa aba da automação do Chrome, com autorização do usuário, lendo só tags, atributos e rótulos; nenhum texto de mensagem foi registrado. A captura de tela do usuário não foi salva.
- Os seletores de `configuracao-estruturas.ts` declaram `verificadoEm: 2026-10-01` sem evidência de conferência contra o WhatsApp real; o DOM atual identifica mensagens por `data-testid="conv-msg-<id>"` e `msg-container`, sem `[data-testid="audio-player"]`. Conferir os seletores no fix.
- Taxonomia: `taxonomy.yaml` está vazio; proposta `area: extensao`, `module: integracao-whatsapp`, `feature: deteccao-de-audio`.
- Closure policy: adotei `local-software` (o `README.md` do registro guarda um critério livre do MAC1).
- Fix (2026-10-01): a revisão 1 do plano passou nos testes, mas falhou na conferência real; a página falsa não tinha o player tardio nem o `data-id` aninhado. Lição: a página falsa dos testes deve copiar a estrutura conferida, e a conferência real faz parte da aceitação.
- Fix: o teste no navegador (`integracao-conversa.test.ts`) roda no `npm test` padrão e é pulado sem o Chrome for Testing; acrescenta cerca de 10 s.
- Fix, nota cosmética fora do change set: no subteste de troca, a mensagem da primeira asserção diz "ficou sem ícone" mesmo quando o valor real é `[2]`.
- Fora do escopo, candidatos a bug próprio: (a) com o seletor `containerConversa` quebrado, a integração fica indistinguível de "sem conversa aberta" (risco residual da escolha EC-10); (b) `elementoMensagemVoz` casa qualquer `button[aria-label*="Reproduzir"]`, e um vídeo com esse rótulo receberia ícone; (c) `configuracao-estruturas.ts` segue com `verificadoEm: 2026-10-01` e seletores como `[data-testid="audio-player"]` que não existem no DOM atual, cabendo uma revisão dos seletores; (d) o popup deriva o estado da integração da URL da aba, não do monitor (achado do RMLU).
- Na conferência, o usuário pediu que eu abrisse duas conversas por clique na lista lateral; só a estrutura foi lida, e os nomes das conversas não foram registrados.
