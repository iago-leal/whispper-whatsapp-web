---
schema_version: 1
id: BUG-20261001-2MOY
display_number: 5
title: "Extração do áudio depende de <audio src>, que o WhatsApp não cria antes da reprodução"
status: open
phase: triaging
severity: critical
priority: P0
created: 2026-10-01
updated: 2026-10-01

origin:
  type: inspection
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [integracao-whatsapp-web, extracao-de-audio]

visibility: normal
security_suspected: false

reproduction:
  classification: unknown
  rate: "0/0"
  suspected_triggers: []

blocking: []
relationships:
  - bug: BUG-20261001-GAOZ
    type: blocked-by
    state: proposed
    evidence: []

traceability:
  specs:
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#62-fluxo-principal-happy-path"
  affected_code:
    - extension/src/content/extrator-audio.ts
    - extension/src/content/configuracao-estruturas.ts
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

# Extração do áudio depende de <audio src>, que o WhatsApp não cria antes da reprodução

## Summary
O extrator obtém os bytes da mensagem de voz lendo o `src` de um elemento `<audio>` dentro do balão. No DOM atual do WhatsApp Web, uma mensagem de voz ainda não reproduzida não tem `<audio>`. Mesmo com o ícone presente, a transcrição falharia com AUDIO_INDISPONIVEL ("Não foi possível obter este áudio").

## Expected Behavior
Pela spec `_reversa_sdd/sdd/integracao-whatsapp-web.md`, seção 6.1: RF-06 (entregar os bytes do áudio já decifrado, o tipo de mídia e a duração, obtendo-o da cópia já carregada pela página ou pelo mecanismo de download da própria página, sem reprodução sonora) e RF-07 (sem alterar o estado de reprodução visto pelo remetente). Seção 6.2, passo 5: o áudio é obtido decifrado, sem som.

## Actual Behavior
Inspeção estrutural da conversa aberta: 1 botão "Reproduzir mensagem de voz" e 0 elementos `<audio>`. `extrator-audio.ts` lança AUDIO_INDISPONIVEL quando não há `<audio>` com `src`. Ainda não observado de ponta a ponta, porque o ícone não aparece (BUG-20261001-GAOZ).

## Steps to Reproduce
1. Corrigir ou contornar o BUG-20261001-GAOZ, para que o ícone apareça.
2. Abrir uma conversa com mensagem de voz recebida e nunca tocada.
3. Clicar no ícone do Whispper.
4. Esperado pelo código atual: janela com "Não foi possível obter este áudio." e o motivo AUDIO_INDISPONIVEL.

## Evidence
- `evidence/inspecao-estrutural.md`: contagem de seletores com a conversa aberta (`tagAudio: 0`).
- Relato bruto: `../../intake/relato-20261001-1354.md`, problema 2.

## Suspected Area
`extension/src/content/extrator-audio.ts`: lê `elementoBalao.querySelector('audio')` e faz `fetch(elementoAudio.src)` do blob. O WhatsApp só cria o elemento e o blob ao reproduzir, o que violaria RF-07. A spec admite "o mecanismo de download da própria página"; descobrir esse mecanismo sem tocar o áudio é o ponto central do problema e pede investigação antes de qualquer código.

## Acceptance Criteria
- Clicar no ícone de um áudio recebido e nunca tocado entrega ao motor os bytes decifrados, o tipo de mídia e a duração (tolerância de 1 s), sem som (RF-06).
- O aparelho remetente continua a mostrar o áudio como não reproduzido (RF-07).

## Traceability
- **Specs**: `integracao-whatsapp-web.md#61-requisitos-principais` (RF-06, RF-07), `integracao-whatsapp-web.md#62-fluxo-principal-happy-path`.
- **Affected Code**: `extension/src/content/extrator-audio.ts`, `extension/src/content/configuracao-estruturas.ts` (`tagAudio`).
- **Root Cause**: a investigar no fix.
- **Reproduction Tests**: nenhum.
- **Regression Tests**: nenhum.

## Resolution
(Pendente)

## Agent Notes
- Origem `inspection`: achado do agente na inspeção feita para o BUG-20261001-GAOZ, não relatado diretamente pelo usuário; a classificação de reprodução fica `unknown` até o ícone existir.
- Relação proposta: `blocked-by` BUG-20261001-GAOZ (hipótese: sem o ícone, o defeito não se exercita). Não promovida sem evidência.
- Severidade critical e prioridade P0 confirmadas pelo usuário em 2026-10-01.
- Recomendação para o fix: modo `diagnosis` do `/reversa-debugger-debate`, porque há abordagens concorrentes para obter o áudio decifrado sem reprodução, com risco de violar RF-07 ou os termos de uso da plataforma. Nenhuma abordagem foi testada.
- Taxonomia: `taxonomy.yaml` está vazio; proposta `area: extensao`, `module: integracao-whatsapp`, `feature: extracao-de-audio`.
- Closure policy: adotei `local-software` (o `README.md` do registro guarda um critério livre do MAC1).
