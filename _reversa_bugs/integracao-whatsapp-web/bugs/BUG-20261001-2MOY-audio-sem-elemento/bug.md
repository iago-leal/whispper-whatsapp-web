---
schema_version: 1
id: BUG-20261001-2MOY
display_number: 5
title: "Extração do áudio depende de <audio src>, que o WhatsApp não cria antes da reprodução"
status: resolved
phase: null
severity: critical
priority: P0
created: 2026-10-01
updated: 2026-10-01T16:58-03:00

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
  classification: deterministic
  rate: "4/4"   # 3/3 isolada + 1/1 de ponta a ponta no WhatsApp real (ver a cápsula)
  suspected_triggers: []
  capsule: evidence/reproduction.md

blocking: []
relationships:
  - bug: BUG-20261001-GAOZ
    type: blocked-by
    state: confirmed   # promovida pelo /reversa-debugger-fix do GAOZ em 2026-10-01
    evidence:
      - "extension/src/content/index.ts:51 é a única chamada de solicitarTranscricaoManual; nucleo.ts:183 só pede obterAudio a partir desse evento"
      - "../BUG-20261001-GAOZ-icone-ausente/evidence/reproduction.md S1: nenhum ícone é injetado, logo a extração nunca é acionada pela interface"

traceability:
  specs:
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#62-fluxo-principal-happy-path"
  affected_code:
    - extension/src/content/extrator-audio.ts
    - extension/src/content/configuracao-estruturas.ts
  root_cause:
    state: confirmed
    location: _reversa_forward/002-integracao-whatsapp-web/investigation.md (Desafio 2) + roadmap.md (D-02), materializada em extension/src/content/extrator-audio.ts (extrairAudioDeElemento)
    summary: >-
      O plano adotou como fato, sem a prova de conceito que a seção 13 da spec exigia antes de qualquer
      outra frente, que o player do WhatsApp mantém um <audio> com src blob: já decifrado assim que a
      mensagem de voz aparece. O extrator foi escrito sobre essa premissa e não tem outro caminho: sem
      <audio> no balão, lança AUDIO_INDISPONIVEL. No WhatsApp Web real não há <audio> na linha antes da
      reprodução; o caminho que a spec admite para esse caso (EC-01, "mecanismo de download da própria
      página") nunca foi implementado.
    causal_path:
      - "investigation.md, Desafio 2: afirma que o blob decifrado já está no <audio> do player quando a mensagem carrega"
      - "roadmap.md D-02: fixa a captura via <audio>/blob URL; o risco 'WhatsApp não manter URL em cache' fica sem mitigação implementada"
      - "extrator-audio.ts:12-18: única consulta ao balão é tagAudio; sem <audio> com src, lança AUDIO_INDISPONIVEL antes de qualquer fetch"
      - "nucleo.ts executarTranscricao: converte a exceção em AUDIO_INDISPONIVEL exibido na janela"
    evidence:
      - "evidence/reproduction.md: 3/3, uma consulta ('audio'), nenhum fetch, AUDIO_INDISPONIVEL"
      - "evidence/inspecao-estrutural.md: conversa aberta com 1 botão de voz e tagAudio: 0"
      - "../BUG-20261001-GAOZ-icone-ausente/evidence/conferencia-whatsapp-real.md seção 4: em duas conversas, nenhuma linha de voz tem <audio> antes da reprodução"
      - "evidence/prova-de-conceito.md seção 1: clique no ícone de áudio recebido e nunca tocado abre a janela com AUDIO_INDISPONIVEL; 0 <audio> no documento"
      - "evidence/prova-de-conceito.md seções 3-4: mediaBlob ausente; downloadAndMaybeDecrypt da página entrega Ogg decifrado (14.771 bytes, 6,21 s) sem som e sem mudar estado da página"
    code_refs:
      - { file: extension/src/content/extrator-audio.ts, symbol: extrairAudioDeElemento, commit: bab1e53 }
      - { file: extension/src/content/configuracao-estruturas.ts, symbol: "seletores.tagAudio", commit: bab1e53 }
    open_points: []   # RF-07 provado pelo ack local com controle positivo (evidence/aceitacao-whatsapp-real.md); o remetente é instrumento cego com as confirmações de leitura desligadas
  reproduction_tests:
    - "extension/test/extrator-audio.test.ts::reprodução: balão sem <audio>, como no WhatsApp real, entrega bytes, tipo e duração pelo download da própria página (RF-06, EC-01)"
  regression_tests:
    - "extension/test/extrator-audio.test.ts::a obtenção não toca nem altera a mensagem: só o download decifrado é pedido à página (RF-05, RF-07)"
    - "extension/test/extrator-audio.test.ts::o pedido à página leva o mimetype e os campos de mídia do próprio modelo (sem mimetype, a página recusa)"
    - "extension/test/extrator-audio.test.ts::mensagem que a página já descartou termina em AUDIO_INDISPONIVEL com \"Abra a conversa e tente de novo\" (EC-06)"
    - "extension/test/extrator-audio.test.ts::download sem conclusão em 30 s termina em AUDIO_INDISPONIVEL com \"Falha ao baixar o áudio; verifique a conexão\" (EC-03)"
    - "extension/test/manifesto.test.ts::o script do mundo da página entra só no WhatsApp Web, antes da página, e sai do build num arquivo único (RNF-05, BUG-20261001-2MOY)"
    - "extension/test/configuracao-estruturas.test.ts::CONFIGURACAO_ESTRUTURAS nomeia os módulos internos da página, e nenhum outro fonte os cita"
  gate1: "fix/testes.diff aprovado em 2026-10-01 16:06; vermelho em fix/gate1-vermelho.txt (7 falhas, todas pelo defeito)"

regression_analysis:
  last_known_good: null
  first_known_bad: bab1e53
  bisect: "não aplicável: o defeito nasceu com o código, no primeiro commit da extensão"
  culprit_commit: bab1e53

mitigation: null   # oferecida em 2026-10-01; o usuário escolheu investigar direto (falha limpa, sem dano em curso)

change_risk:
  classification: média
  motivos:
    - "Depende de módulos internos e não documentados da página (WAWebCollections, WAWebDownloadManager)"
    - "Novo script no mundo principal da página, ligado ao script de conteúdo por MessageChannel"
    - "Muda o manifesto e eleva o Chrome mínimo de 105 para 111"
    - "Reversível por git revert; sem impacto em dados"

strategy:
  kind: direct
  decided_at: 2026-10-01T15:57-03:00
  plan: fix/plan.html

spec_verdict: spec-desatualizada
spec_addendum:
  path: _reversa_sdd/addenda/bug-BUG-20261001-2MOY-v001.md
  decided_by: iago
  verdict_at: 2026-10-01T16:36-03:00
  approved_at: 2026-10-01T16:54-03:00
change_set:
  - id: CHG-001
    kind: code
    artifacts: [extension/src/pagina/ponte-audio.ts, extension/src/pagina/protocolo-ponte.ts]
    purpose: "Ponte no mundo da página: obtém o áudio decifrado por downloadAndMaybeDecrypt (com mimetype) e devolve só bytes, tipo e duração por porta privada"
    diff: fix/CHG-001.diff
  - id: CHG-002
    kind: code
    artifacts: [extension/src/content/extrator-audio.ts]
    purpose: "Troca a leitura de <audio src> pelo pedido à ponte, com prazo de 30 s (EC-03) e motivos do EC-06"
    diff: fix/CHG-002.diff
  - id: CHG-003
    kind: code
    artifacts: [extension/src/adaptadores/adaptador-whatsapp-web.ts]
    purpose: "obterAudio pede o áudio pelo identificador"
    diff: fix/CHG-003.diff
  - id: CHG-004
    kind: configuration
    artifacts: [extension/src/content/configuracao-estruturas.ts]
    purpose: "modulosDaPagina (RF-13); versão 1.1.0"
    diff: fix/CHG-004.diff
  - id: CHG-005
    kind: configuration
    artifacts: [extension/manifest.json]
    purpose: "Script com world MAIN e run_at document_start só em web.whatsapp.com; Chrome mínimo 111"
    diff: fix/CHG-005.diff
  - id: CHG-006
    kind: configuration
    artifacts: [extension/package.json]
    purpose: "build empacota src/pagina/ponte-audio.ts em dist/pagina/ponte-audio.js (IIFE)"
    diff: fix/CHG-006.diff
  - id: CHG-007
    kind: test
    artifacts: [extension/test/integracao-conversa.test.ts]
    purpose: "Fora do plano: o teste de navegador monta também o script do mundo da página, sem o qual o Chrome recusa a extensão"
    diff: fix/CHG-007.diff
  - id: CHG-008
    kind: specification
    artifacts: [_reversa_sdd/addenda/bug-BUG-20261001-2MOY-v001.md]
    purpose: "Adendo v001: §12 (chave de mídia só repassada ao download da página), critério do RF-07 com as confirmações de leitura desligadas, OQ-01 respondida e técnica de obtenção registrada"
    diff: fix/CHG-008.diff
change_set_approval: "Gate 2 aprovado em 2026-10-01 16:16; verde em fix/gate2-verde.txt (100 testes: 98 ok, 0 falhas, 2 pulados; typecheck limpo); npm run build ok às 16:16"

closure:
  policy: local-software
  satisfied: true
  evidence:
    - fix/gate2-verde.txt
    - evidence/aceitacao-whatsapp-real.md
resolution_kind: fixed
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
- **Root Cause** (`confirmed`): premissa não provada do plano (`investigation.md`, Desafio 2; `roadmap.md`, D-02), materializada em `extrator-audio.ts`; ver o front matter.
- **Reproduction Tests**: `extension/test/extrator-audio.test.ts` (1).
- **Regression Tests**: `extension/test/extrator-audio.test.ts` (4), `manifesto.test.ts` (1), `configuracao-estruturas.test.ts` (1).

## Resolution

**Encerrado em 2026-10-01 16:58 -03 · `resolution_kind: fixed` · closure `local-software` satisfeita.**

### Causa raiz (`confirmed`)
O plano do ciclo forward afirmou, sem a prova de conceito que a seção 13 da spec exigia, que o player do
WhatsApp mantém um `<audio src="blob:…">` já decifrado. O extrator só sabia ler esse elemento, e o
WhatsApp Web não o cria antes da reprodução nem guarda cópia decifrada de áudio nunca tocado. O caminho
do EC-01, o download da própria página, nunca fora implementado. Nascida em `bab1e53`.

### Estratégia
Correção direta, escolhida pelo usuário às 15:57 depois da prova de conceito
(`evidence/prova-de-conceito.md`), que achou na página real o mecanismo de download e decifração
(`downloadAndMaybeDecrypt`) e o entregou sem som e sem mudar estado. Plano em `fix/plan.html`.

### Correction Change Set

| CHG | Tipo | Artefato | Propósito | Diff |
|---|---|---|---|---|
| CHG-001 | code | `extension/src/pagina/ponte-audio.ts`, `protocolo-ponte.ts` (novos) | Ponte no mundo da página: download decifrado com o `mimetype` do modelo; só bytes, tipo e duração atravessam a porta privada | [CHG-001](fix/CHG-001.diff) |
| CHG-002 | code | `extension/src/content/extrator-audio.ts` | Pedido à ponte no lugar de `<audio src>`; prazo de 30 s (EC-03); motivo do EC-06 | [CHG-002](fix/CHG-002.diff) |
| CHG-003 | code | `extension/src/adaptadores/adaptador-whatsapp-web.ts` | `obterAudio` pede pelo identificador | [CHG-003](fix/CHG-003.diff) |
| CHG-004 | configuration | `extension/src/content/configuracao-estruturas.ts` | `modulosDaPagina` (RF-13), versão 1.1.0 | [CHG-004](fix/CHG-004.diff) |
| CHG-005 | configuration | `extension/manifest.json` | Script `world: "MAIN"`, `document_start`, só em `web.whatsapp.com`; Chrome mínimo 111 | [CHG-005](fix/CHG-005.diff) |
| CHG-006 | configuration | `extension/package.json` | `build` empacota a ponte num IIFE | [CHG-006](fix/CHG-006.diff) |
| CHG-007 | test | `extension/test/integracao-conversa.test.ts` | Fora do plano: o teste de navegador monta também a ponte, sem a qual o Chrome recusa a extensão | [CHG-007](fix/CHG-007.diff) |
| CHG-008 | specification | `_reversa_sdd/addenda/bug-BUG-20261001-2MOY-v001.md` | Adendo do veredito `spec-desatualizada` | [CHG-008](fix/CHG-008.diff) |

Sem reparo de dados: o defeito não gravou estado.

### Testes: vermelho → verde
- Gate 1 (16:06, [`fix/testes.diff`](fix/testes.diff)): 100 testes, 91 ok, **7 falhas**, todas pelo defeito
  (`AUDIO_INDISPONIVEL: elemento de áudio ausente…`, "nenhum script declarado no mundo da página",
  "modulosDaPagina ausente"). Saída em [`fix/gate1-vermelho.txt`](fix/gate1-vermelho.txt).
- Gate 2 (16:16): 100 testes, **98 ok, 0 falhas**, 2 pulados; `typecheck` limpo; `npm run build` ok.
  Saída em [`fix/gate2-verde.txt`](fix/gate2-verde.txt).
- Removidos: os dois testes antigos do extrator, que codificavam a premissa refutada e o próprio defeito.

### Aceitação no WhatsApp Web real (`evidence/aceitacao-whatsapp-real.md`)
- Ponte presente na página real; áudios de 9 s e 13 s transcritos (19 e 39 palavras) em 3,8 s e 9,7 s,
  sem `<audio>` criado e com o player intacto. Fidelidade confirmada pelo usuário.
- RF-07: o remetente é instrumento cego com as confirmações de leitura desligadas (controle positivo
  negativo); pelo `ack` local, cujo controle positivo funcionou (tocar levou 1 → 4), o áudio transcrito
  e nunca tocado ficou em `ack` 1 por 191 s.

### Veredito de spec: `spec-desatualizada`
RF-06, RF-07, EC-01 e o passo 5 da seção 6.2 já definiam o certo. O adendo
`_reversa_sdd/addenda/bug-BUG-20261001-2MOY-v001.md` corrige a letra da §12 (a chave de mídia é
repassada só ao download da própria página, dentro do mundo dela), o critério de aceitação do RF-07 com
as confirmações de leitura desligadas e a OQ-01, e registra a técnica de obtenção. Veredito escolhido
por iago às 16:36; texto aprovado às 16:54.

## Agent Notes
- Origem `inspection`: achado do agente na inspeção feita para o BUG-20261001-GAOZ, não relatado diretamente pelo usuário; a classificação de reprodução fica `unknown` até o ícone existir.
- Relação proposta: `blocked-by` BUG-20261001-GAOZ (hipótese: sem o ícone, o defeito não se exercita). Não promovida sem evidência.
- Severidade critical e prioridade P0 confirmadas pelo usuário em 2026-10-01.
- Recomendação para o fix: modo `diagnosis` do `/reversa-debugger-debate`, porque há abordagens concorrentes para obter o áudio decifrado sem reprodução, com risco de violar RF-07 ou os termos de uso da plataforma. Nenhuma abordagem foi testada.
- Taxonomia: `taxonomy.yaml` está vazio; proposta `area: extensao`, `module: integracao-whatsapp`, `feature: extracao-de-audio`.
- Closure policy: adotei `local-software` (o `README.md` do registro guarda um critério livre do MAC1).
- 2026-10-01, fix: o debate foi dispensado porque a dúvida era empírica; a prova de conceito na página real a resolveu (`evidence/prova-de-conceito.md`).
- Candidatos a bug próprio, fora desta correção:
  - **EC-02 (mídia expirada):** o formato do erro do download da página para mídia expirada é desconhecido; sem amostra, cai no motivo genérico "Não foi possível baixar o áudio do WhatsApp Web".
  - **RF-08:** `extension/src/content/index.ts` escuta `play` num `<audio>` que o WhatsApp não põe no balão; o evento de reprodução provavelmente nunca é emitido (mesma premissa refutada).
  - **RF-11:** o monitor de saúde não verifica os módulos internos da página; se sumirem, só o clique falha, com "A integração com o WhatsApp Web mudou; atualize a extensão".
  - **Janela flutuante:** mostra "Erro: AUDIO_INDISPONIVEL" sem o texto "Não foi possível obter este áudio." e o motivo que `janela-flutuante.md` pede; e, no WhatsApp real, abriu sobre a lista de conversas, longe do balão (âncora não acompanhou).
  - **RF-16:** o ícone não reflete transcrevendo/concluído; a classe não muda depois do clique.
- Os nomes de membros internos (`Msg`, `downloadManager`, `downloadAndMaybeDecrypt`, campos do modelo) ficaram no código da ponte; só os nomes de módulos foram para a configuração, como o plano aprovou.
- As capturas do usuário (16:22 e 16:28) não foram copiadas para `evidence/` porque mostram conteúdo de conversa; a aceitação as descreve.
