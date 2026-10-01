---
schema_version: 1
id: BUG-20261001-GAOZ
display_number: 4
title: "Ícone de transcrição não aparece: a integração desiste se a página carrega sem conversa aberta"
status: open
phase: triaging
severity: critical
priority: P0
created: 2026-10-01
updated: 2026-10-01

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

## Suspected Area
`extension/src/content/index.ts`, `inicializar()`: chama `adaptador.verificarSaude()` antes de tudo; `avaliarSaudeDasEstruturas` (`monitor-degradacao.ts`) exige `#main` (`containerConversa`), que só existe com uma conversa aberta. O WhatsApp sempre carrega sem conversa, então o estado é "degradada" e a função faz `return` sem nova tentativa; o `setTimeout(inicializar, 1000)` só é alcançado depois da verificação de saúde. Além disso, `observarMensagensDeAudio` observa o `#main` daquele momento, e o WhatsApp recria `#main` a cada troca de conversa: mesmo iniciando, o observador ficaria preso à conversa antiga. Ausência de conversa aberta não é estrutura ausente; RF-11 pede verificar a cada troca.

## Acceptance Criteria
- Carregar o WhatsApp Web sem conversa aberta e depois abrir uma conversa com mensagem de voz mostra o ícone em até 500 ms (RF-03).
- Trocar de conversa e voltar mantém exatamente um ícone por mensagem de voz (RF-02).
- O estado "degradada" só aparece quando uma estrutura de fato falta, e é reavaliado a cada troca de conversa (RF-11).

## Traceability
- **Specs**: `integracao-whatsapp-web.md#61-requisitos-principais` (RF-01, RF-02, RF-03, RF-11), `integracao-whatsapp-web.md#62-fluxo-principal-happy-path`.
- **Affected Code**: `extension/src/content/index.ts` (`inicializar`), `extension/src/content/monitor-degradacao.ts` (`avaliarSaudeDasEstruturas`), `extension/src/content/detector-mensagens.ts` (`observarMensagensDeAudio`).
- **Root Cause**: a investigar no fix.
- **Reproduction Tests**: nenhum.
- **Regression Tests**: nenhum.

## Resolution
(Pendente)

## Agent Notes
- Achado na conferência do BUG-20261001-MAC1, depois da instalação concluída; sem relação causal com ele.
- Severidade critical e prioridade P0 confirmadas pelo usuário em 2026-10-01: a função central fica indisponível em toda conversa.
- Ordem combinada com o usuário: corrigir depois do BUG-20261001-RMLU (popup) e antes do BUG-20261001-2MOY (extração), que só se manifesta com o ícone presente.
- A inspeção estrutural foi feita numa aba da automação do Chrome, com autorização do usuário, lendo só tags, atributos e rótulos; nenhum texto de mensagem foi registrado. A captura de tela do usuário não foi salva.
- Os seletores de `configuracao-estruturas.ts` declaram `verificadoEm: 2026-10-01` sem evidência de conferência contra o WhatsApp real; o DOM atual identifica mensagens por `data-testid="conv-msg-<id>"` e `msg-container`, sem `[data-testid="audio-player"]`. Conferir os seletores no fix.
- Taxonomia: `taxonomy.yaml` está vazio; proposta `area: extensao`, `module: integracao-whatsapp`, `feature: deteccao-de-audio`.
- Closure policy: adotei `local-software` (o `README.md` do registro guarda um critério livre do MAC1).
