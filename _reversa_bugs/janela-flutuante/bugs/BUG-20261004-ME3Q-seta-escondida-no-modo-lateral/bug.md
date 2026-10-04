---
schema_version: 1
id: BUG-20261004-ME3Q
display_number: 14
title: "Modo lateral: a janela de um áudio enviado esconde a seta e cobre o balão de um recebido"
status: resolved
phase: null
severity: medium
priority: P2
created: 2026-10-04
updated: 2026-10-04T18:10-03:00

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [janela-flutuante, posicionamento, modo-lateral]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "1/1 no WhatsApp Web pelo whatsapp-cft em 2026-10-04 17:04 (rodada 3 da aceitação do TTLJ, evidence/aceitacao-ttlj-whatsapp-real.md); 3/3 na reprodução isolada de 17:33 a 17:37 (posicionador puro, gerenciador no Chrome for Testing com o CSS real, conversa alternada), evidence/reproduction.md"
  suspected_triggers:
    - "modo lateral: área da conversa de 726 px ou mais"
    - "conversa com os dois lados: a janela de um enviado abre à esquerda do balão dele, na faixa dos balões recebidos"
    - "janela do enviado mais alta que o próprio balão (232 px contra 89 px), descendo até a altura do balão recebido seguinte e do corredor da seta dele"

blocking: []
relationships:
  - bug: BUG-20261002-OW7G
    type: related-to
    state: supported
    evidence:
      - "evidence/reproduction.md §2: a seta do áudio 6 some porque a camada das setas, que o OW7G pôs atrás das janelas, corre sob a janela 5; a camada não é a causa, e mudá-la não resolve (diagnostico.md §4, estratégia D)"
  - bug: BUG-20261002-K3DY
    type: related-to
    state: supported
    evidence:
      - "evidence/diagnostico.md §1: a colisão só entre janelas que se cruzam (decisão do K3DY) não trata balão nem corredor de seta de outro áudio como obstáculo"

traceability:
  specs:
    - "_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/janela-flutuante.md#8-design-e-interface"
    - "_reversa_sdd/addenda/bug-BUG-20261004-TTLJ-v001.md#delta-3-o-que-a-janela-à-vista-pode-cobrir-no-modo-abaixo-rf-02"
  affected_code:
    - extension/src/content/posicionador-colisoes.ts
    - extension/src/content/gerenciador-janelas.ts
    - extension/src/content/janela-flutuante.css
  root_cause:
    state: confirmed
    hypothesis: "No modo lateral, calcularPosicoesJanelas mede o espaço livre do RF-01 só na horizontal (xAoLado) e resolve colisão só entre janelas que se cruzam (K3DY). Com a área da conversa de 726 a 1118 px, a janela de um lado da conversa fica sobre a coluna dos balões do outro, e, mais alta que o próprio balão, desce sobre o balão seguinte do outro lado e o corredor da seta dele. calcularSeta mira esse balão sem saber da cobertura, e a camada das setas, atrás das janelas (OW7G), esconde o trecho coberto, inclusive a ponta."
    causal_path:
      - "área da conversa de 726 a 1118 px: a janela de um enviado (x = 719 a 1039) fica sobre a coluna dos recebidos (558 a 894), e a de um recebido (902 a 1222) sobre a dos enviados (a partir de 1047)"
      - "janela mais alta que o balão (232 contra 89 px): desce sobre as linhas do balão seguinte do outro lado"
      - "colisão só entre janelas (K3DY): o balão 6 e o corredor da seta dele não são obstáculo; a janela 6 é empurrada para y = 304 pela janela 5"
      - "calcularSeta: ponta no centro do balão 6 (894; 271,5), cotovelo no corredor até a cauda (902; 314); a janela 5 cobre de 64 a 296"
      - "camada das setas atrás das janelas (OW7G): a ponta e o trecho de 271,5 a 296 somem"
    evidence:
      - ref: evidence/reproduction.md
        observation: "posicionador puro, com as entradas da rodada 3, devolve as posições lidas no WhatsApp real (719/64, 902/304, 902/554, 902/794, 902/1034), a ponta da seta 6 sob a janela 5 e 4 de 9 pontos visíveis, a mesma contagem da rodada 3"
      - ref: evidence/reproduction.md
        observation: "no Chrome for Testing com o CSS real, elementFromPoint 2 px dentro do triângulo da ponta da seta 6 devolve a janela 5; as outras quatro setas têm 9 de 9 pontos"
      - ref: evidence/reproduction.md
        observation: "conversa alternada sem folga (28 px): as janelas dos dois lados formam uma pilha só, e a ponta de cada seta, exceto a primeira, fica sob a janela de cima, que cobre a borda inteira do balão"
      - ref: evidence/diagnostico.md
        observation: "janela sem texto já tem 109 px (cabeçalho 39, rodapé 48, respiro 20, borda 2): encolher a janela até o balão seguinte, sem folga, não deixa linha de texto"
    code_refs:
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: xAoLado, commit: b0c3408 }
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: calcularPosicoesJanelas, commit: b0c3408 }
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: calcularSeta, commit: b0c3408 }
      - { file: extension/src/content/gerenciador-janelas.ts, symbol: garantirCamadaSetas, commit: b0c3408 }
  reproduction_tests:
    - "extension/test/posicionador-colisoes.test.ts › reprodução: no modo lateral, numa conversa com os dois lados, nenhuma janela à vista cobre o balão de outra à vista nem a seta dela (critérios 1 e 2 do ME3Q)"
    - "extension/test/posicionador-colisoes.test.ts › reprodução: numa conversa alternada sem folga, nenhuma janela à vista cobre o balão de outra à vista nem a seta dela (ME3Q)"
    - "extension/test/janelas-no-navegador.test.ts › reprodução: no modo lateral, numa conversa com os dois lados, a seta de cada janela à vista tem a ponta e o trecho no corredor fora das janelas, e nenhuma janela cobre o balão de outra à vista (critérios 1 e 2 do ME3Q)"
  regression_tests:
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas deixa à vista, no conflito lateral, a janela de foco mais recente, no topo do próprio balão, e oculta a outra sem seta; com o foco invertido, a escolha se inverte (ME3Q)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas deixa à vista, no conflito lateral, a janela de foco mais antigo que não conflita com as de foco maior (ME3Q)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas deixa à vista, no conflito lateral entre janelas sem foco, a de cima (ME3Q)"
    - "extension/test/janelas-no-navegador.test.ts › no modo lateral, abrir o enviado 5 e depois o recebido 6 deixa à vista só a janela 6; destacar o 5 o põe à vista e oculta a 6, com as setas; fechar o 5 devolve a 6 (ME3Q)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas deixa à vista todas as janelas do modo lateral, qualquer que seja o foco (critério 4 do TTLJ), guarda do modo lateral de um lado só"

spec_verdict: spec-desatualizada
spec_verdict_decision:
  decided_by: iago
  decided_at: "2026-10-04 17:57 -03"
  addendum: _reversa_sdd/addenda/bug-BUG-20261004-ME3Q-v001.md
  addendum_text_approved: "2026-10-04 17:57 -03, por iago, na mesma resposta"
  evidence: "O RF-01 ('no espaço livre') e o Decision Log ('não cobre os balões seguintes') já pediam que a janela não cobrisse outros balões, e o código divergia; mas o Delta 1 do adendo do TTLJ deixou o RF-05 'sem mudança' no modo lateral (todas as janelas à vista), e a correção oculta a janela que cede no conflito e admite cobrir balões de texto e de áudios sem janela à vista do outro lado. O adendo muda a leitura do RF-05 lateral (Delta 1) e do 'espaço livre' do RF-01 com o racional do Decision Log (Delta 2)."

change_risk:
  classification: média
  reasons:
    - "blast radius: só posicionador-colisoes.ts, núcleo do cálculo usado em todos os modos; gerenciador, CSS e porta ExibicaoDeTranscricao sem mudança"
    - "sem contrato externo, sem dados persistidos, sem concorrência; reversível por git revert"
    - "comportamento visível novo no modo lateral (janela aberta e oculta no conflito), com adendo de spec; corpo do cálculo extraído para disporJanelas, guardado pelos 22 testes anteriores do posicionador"

change_set:
  - id: CHG-001
    kind: test
    artifact: extension/test/posicionador-colisoes.test.ts
    purpose: "duas reproduções (rodada 3 e conversa alternada sem folga) e três regressões do conflito lateral (foco, só cede quem conflita, empate)"
    diff: fix/CHG-001.diff
    approved: "Gate 1, 2026-10-04 17:51"
  - id: CHG-002
    kind: test
    artifact: extension/test/janelas-no-navegador.test.ts
    purpose: "reprodução da rodada 3 no Chrome for Testing com o CSS real (elementFromPoint na ponta e 9 pontos do corredor); troca por destacar e fechamento no gerenciador real"
    diff: fix/CHG-002.diff
    approved: "Gate 1, 2026-10-04 17:51"
  - id: CHG-003
    kind: code
    artifact: extension/src/content/posicionador-colisoes.ts
    purpose: "disporJanelas extraída sem mudar a regra; haConflito (balão ou corredor da seta de outra janela lateral à vista); com conflito, as janelas laterais entram por foco e a que criaria conflito fica oculta"
    diff: fix/CHG-003.diff
    approved: "Gate 2, 2026-10-04 17:54"
  - id: CHG-004
    kind: documentation
    artifact: extension/src/content/JANELAS.md
    purpose: "passo 3 do algoritmo com a regra do conflito lateral"
    diff: fix/CHG-004.diff
    approved: "Gate 2, 2026-10-04 17:54"
  - id: CHG-005
    kind: specification
    artifact: _reversa_sdd/addenda/bug-BUG-20261004-ME3Q-v001.md
    purpose: "adendo do veredito spec-desatualizada: conflito entre janelas no modo lateral (RF-05) e o que a janela lateral pode cobrir (RF-01, Decision Log)"
    diff: fix/CHG-005.diff
    approved: "veredito e texto, 2026-10-04 17:57"

closure:
  policy: local-software
  satisfied: true
  evidence:
    - evidence/gate1-vermelho.txt
    - evidence/gate2-verde.txt
    - evidence/gate2-verde-suite.txt
    - evidence/aceitacao-whatsapp-real.md
    - _reversa_sdd/addenda/bug-BUG-20261004-ME3Q-v001.md
resolution_kind: fixed
---

# Modo lateral: a janela de um áudio enviado esconde a seta e cobre o balão de um recebido

## Summary

No modo lateral, numa conversa com áudios dos dois lados, a janela de um áudio enviado abre à esquerda do
balão dele, que é a faixa onde ficam os balões recebidos. Mais alta que o próprio balão, ela desce sobre o
balão recebido seguinte e sobre o corredor de 8 px por onde corre a seta da janela dele. Como a camada das
setas fica atrás das janelas, o trecho de cima da seta do recebido, com a ponta, some: a ligação entre a
janela e o balão de origem fica sem ponto de chegada visível, e parte do balão recebido fica coberta.

## Expected Behavior

Pela spec efetiva (`janela-flutuante.md` com os adendos vigentes):

- RF-01: a janela abre "ao lado do balão do áudio, no espaço livre da área da conversa: à direita dos
  áudios recebidos e à esquerda dos enviados".
- RF-05: várias janelas abertas, nenhuma sobreposta, "mantendo uma seta que a liga ao balão de origem",
  com o critério "cada seta apontando para o balão correto".
- §8: "A janela surge ao lado do balão, com uma seta apontando para ele".

A seta de cada janela à vista deve ficar visível até a ponta, no balão de origem. Sobre a cobertura do
balão de outro áudio no modo lateral, a spec não é explícita: o RF-01 fala em "espaço livre", e o Delta 3
do adendo `bug-BUG-20261004-TTLJ-v001` admite cobrir balões vizinhos só no modo abaixo. A leitura fica para
o veredito de spec do fix.

## Actual Behavior

Medido no WhatsApp Web em 2026-10-04 17:04 (rodada 3 da aceitação do TTLJ), com o navegador em
1440 × 832, a área da conversa em 944 px (x = 496) e a área das mensagens de y = 64 a 768:

- Balão 5 (enviado, y = 56 a 145, em parte sob o cabeçalho): janela à esquerda dele, em x = 719 a 1041 e
  y = 64 a 296.
- Balão 6 (recebido, x = 558 a 894, y = 227 a 316): janela à direita dele, em x = 902 a 1224, deslocada
  para y = 304 pela colisão com a janela 5 (as duas se cruzam na horizontal; vão de 8 px).
- A seta do áudio 6 sobe pelo corredor (x = 894 a 902) até o centro do balão; a janela 5 cobre o trecho de
  cima, e só 4 de 9 pontos amostrados ficam visíveis. As outras quatro setas da rodada tinham 9 de 9.
- A janela 5 cobre a parte direita do balão 6 (x = 719 a 894, y = 227 a 296).

Observação do agente, pela leitura do código (hipótese, não medida): pelo `calcularSeta`, a seta do áudio 6
tem a ponta em (894; 271,5) e a cauda em (902; 314), em cotovelo; o trecho de y = 271,5 a 296, que inclui a
ponta, fica sob a janela 5.

## Steps to Reproduce

1. Abrir no WhatsApp Web, com a extensão, uma conversa com um áudio enviado seguido de perto por um áudio
   recebido (na reprodução, 82 px entre o fim do balão enviado e o topo do recebido).
2. Deixar a área da conversa com 726 px ou mais de largura (navegador de 1440 × 832 com a lista de
   conversas dá 944 px).
3. Clicar no ícone de transcrição dos dois áudios e esperar as duas janelas.
4. Observar: a janela do enviado desce sobre o balão recebido e sobre o corredor da seta dele; a seta do
   recebido aparece só no trecho de baixo, sem a ponta no balão.

## Evidence

- `evidence/aceitacao-ttlj-whatsapp-real.md`: cópia da aceitação do TTLJ no WhatsApp Web real
  (`whatsapp-cft`, grupo de teste); a rodada 3 e o achado lateral 1 trazem as medidas deste bug. Não há print
  da rodada 3.
- Relato: `../../intake/relato-20261004-1720.md`.
- `evidence/reproduction.md`: reprodução isolada de 17:33 a 17:37 (posicionador puro, gerenciador no Chrome for
  Testing com o CSS real, conversa alternada sem folga, faixa de largura afetada).
- `evidence/diagnostico.md`: onde nasce a causa, medidas da janela que limitam as saídas, estratégias
  consideradas.
- `evidence/gate1-vermelho.txt`, `evidence/gate2-verde.txt` e `evidence/gate2-verde-suite.txt`: prova dos gates.
- `evidence/aceitacao-whatsapp-real.md`: aceitação da correção no WhatsApp Web real, de 18:03 a 18:07, com a
  cópia desfocada do print do modo lateral (`aceitacao-modo-lateral-desfocado.png`, fora do git).

## Suspected Area

- `extension/src/content/posicionador-colisoes.ts`, `calcularPosicoesJanelas`: a colisão só considera
  janelas postas que cruzam a faixa horizontal da nova (decisão do K3DY); balões e corredores de seta de
  outros áudios não entram como obstáculo, e o "espaço livre" do RF-01 é medido só na horizontal, contra a
  borda da área.
- `extension/src/content/posicionador-colisoes.ts`, `calcularSeta`: a ponta mira o centro da parte visível
  do balão, sem saber se outra janela a cobre.
- `extension/src/content/gerenciador-janelas.ts`, `garantirCamadaSetas`, e `janela-flutuante.css`: a camada
  das setas é a primeira filha do container, atrás de todas as janelas (OW7G), de modo que qualquer janela
  sobre um corredor esconde a seta que passa por ele.

## Acceptance Criteria

1. No modo lateral, numa conversa com áudios dos dois lados, a seta de cada janela à vista tem a ponta
   visível no balão de origem (`elementFromPoint` na ponta não cai numa janela) e o trecho no corredor
   visível.
2. A janela de um áudio não cobre o balão de outro áudio que esteja na área das mensagens, ou a cobertura
   admitida fica registrada no veredito de spec do fix.
3. As janelas seguem sem se sobrepor, com vãos de 8 px (RF-05), e o modo lateral numa conversa de um lado
   só não regride (rodada 3 da aceitação do TTLJ e aceitação do OW7G).
4. O modo abaixo segue como o adendo do TTLJ decidiu.

## Traceability

- Specs: `janela-flutuante.md` §6.1 (RF-01, RF-05) e §8; adendo `bug-BUG-20261004-TTLJ-v001`, Delta 3,
  como limite (vale só para o modo abaixo).
- Código onde aparece: `posicionador-colisoes.ts`, `gerenciador-janelas.ts`, `janela-flutuante.css`.
- Testes existentes que fixam o comportamento atual, em `extension/test/posicionador-colisoes.test.ts`:
  "não desloca a janela que não cruza, na horizontal, a janela de cima" e "desloca a janela pela de cima que
  a cruza, mesmo com outra, de lado oposto, entre as duas" (K3DY); "liga por uma seta reta a janela à altura
  do seu balão, com a ponta na borda dele, no recebido e no enviado". Em
  `extension/test/janelas-no-navegador.test.ts`: "a seta não rouba cliques e fica por trás das janelas
  (critério 3 do OW7G)".
- Relações propostas: `related-to` BUG-20261002-OW7G e `related-to` BUG-20261002-K3DY.

## Resolution

**Encerrado em 2026-10-04 18:10 -03 · `resolution_kind: fixed` · closure `local-software` satisfeita.**
Por decisão de iago às 17:59, a trava esperou a aceitação no WhatsApp Web real, que passou nos cinco
critérios (seção "Aceitação" abaixo).

### Causa raiz (`confirmed`)

No modo lateral, `calcularPosicoesJanelas` media o "espaço livre" do RF-01 só na horizontal (`xAoLado`) e
resolvia colisão só entre janelas que se cruzam (decisão do K3DY). Com a área da conversa de 726 a 1118 px, a
janela de um lado fica sobre a coluna dos balões do outro (a de um recebido termina em esquerda + 726; o
balão de um enviado começa em direita − 393). Mais alta que o próprio balão, desce sobre o balão seguinte do
outro lado e o corredor da seta dele. `calcularSeta` mirava esse balão sem saber da cobertura, e a camada das
setas, atrás das janelas (OW7G), escondia a ponta. Com as entradas da rodada 3, a função isolada devolve as
posições lidas no WhatsApp real e os mesmos 4 de 9 pontos visíveis; no navegador, `elementFromPoint` na ponta
da seta 6 cai na janela 5 (`evidence/reproduction.md`). Numa conversa alternada sem folga, toda seta depois
da primeira perde a ponta, e encolher a janela não resolve: sem texto, ela já tem 109 px
(`evidence/diagnostico.md`).

### Estratégia

Correção direta, "uma por vez no conflito lateral", escolhida por iago às 17:41 entre encolher a janela de
cima, apontar a ponta para a parte descoberta do balão e o debate multiagente. Conflito: uma janela lateral à
vista cobre o balão de outra janela à vista, na parte dele dentro da área, ou o corredor da seta dela. Sem
conflito, o cálculo devolve a disposição de antes. Com conflito, as janelas laterais entram por foco (último
`abrir` ou `destacar`; empate, de cima para baixo), e a que criaria conflito fica aberta e oculta até o
clique no ícone dela. O gerenciador, que já repassava o foco (TTLJ), o CSS e a camada das setas não mudam.

### Correction Change Set

| CHG | Tipo | Artefato | Propósito | Diff |
|---|---|---|---|---|
| CHG-001 | test | `extension/test/posicionador-colisoes.test.ts` | Duas reproduções (rodada 3, alternada sem folga) e três regressões do conflito lateral | [CHG-001](fix/CHG-001.diff) |
| CHG-002 | test | `extension/test/janelas-no-navegador.test.ts` | Reprodução da rodada 3 com o CSS real; troca por `destacar` e fechamento | [CHG-002](fix/CHG-002.diff) |
| CHG-003 | code | `extension/src/content/posicionador-colisoes.ts` | `disporJanelas` extraída; `haConflito`; entrada das janelas laterais por foco no conflito | [CHG-003](fix/CHG-003.diff) |
| CHG-004 | documentation | `extension/src/content/JANELAS.md` | Passo 3 do algoritmo com a regra do conflito lateral | [CHG-004](fix/CHG-004.diff) |
| CHG-005 | specification | `_reversa_sdd/addenda/bug-BUG-20261004-ME3Q-v001.md` (novo) | Adendo do veredito `spec-desatualizada` | [CHG-005](fix/CHG-005.diff), [adendo](../../../../_reversa_sdd/addenda/bug-BUG-20261004-ME3Q-v001.md) |

Sem reparo de dados: a janela vive só na aba, e o defeito não gravou estado.

### Diff do código e da spec

Spec: adendo `_reversa_sdd/addenda/bug-BUG-20261004-ME3Q-v001.md` (CHG-005), veredito e texto aprovados por
iago às 17:57. Delta 1: no modo lateral, as janelas seguem à vista salvo em conflito, em que a de foco mais
recente fica e a outra se oculta até o clique no ícone; fechar a que causava o conflito devolve a outra.
Delta 2: a janela lateral pode cobrir mensagens do outro lado sem janela à vista, nunca o balão nem a seta de
outra janela à vista; o racional do Decision Log segue valendo na conversa de um lado só e com área de 1119 px
ou mais.

Código (núcleo do CHG-003; íntegra em `fix/CHG-003.diff`):

```diff
+  const todas = dispor(new Set());
+  if (!haConflito(todas.postas, faixaVertical)) return todas.resultados;
+
+  const laterais = todas.postas
+    .filter((posta) => posta.lateral)
+    .map((posta) => posta.req)
+    .sort((a, b) => ordemDeFoco.get(b)! - ordemDeFoco.get(a)!);
+  const cedidas = new Set(laterais);
+  for (const req of laterais) {
+    cedidas.delete(req);
+    if (haConflito(dispor(cedidas).postas, faixaVertical)) cedidas.add(req);
+  }
+  return dispor(cedidas).resultados;
-    if (!req.ancora || !req.ancora.visivel || foraDaFaixa || (xLateral === null && req !== focadaAbaixo)) {
+    if (!req.ancora || !req.ancora.visivel || foraDaFaixa || cedidas.has(req) || (xLateral === null && req !== focadaAbaixo)) {
+function haConflito(postas: Posta[], faixa?: FaixaVertical): boolean {
+  /* janela lateral à vista sobre o balão (parte na área) ou o corredor da seta (± 3,5 px) de outra */
+}
```

### Testes: vermelho → verde

| Etapa | Comando | Resultado |
|---|---|---|
| Gate 1, 17:52 | `node --test test/posicionador-colisoes.test.ts test/janelas-no-navegador.test.ts` | 43 testes, 35 passam, 8 falham (os 7 novos e o teste-pai do navegador), exit 1: "a ponta da seta de 6 está sob uma janela … pontosVisiveis: 3", "a janela 5 cobre o balão de 6", 5 e 6 à vista juntas ([saída](evidence/gate1-vermelho.txt)) |
| Gate 2, 17:54 | o mesmo | 43 de 43, exit 0 ([saída](evidence/gate2-verde.txt)) |
| `/verificar` completo, 17:55 | `.claude/skills/verificar/scripts/verificar.sh` | typecheck, 199 testes da extensão (197 passam, 2 pulados de antes), ruff, 126 do pytest e build carimbado `2026-10-04 17:55:14 -0300`, tudo verde ([resumo](evidence/gate2-verde-suite.txt)) |
| `/verificar` completo, 18:01 | o mesmo | os mesmos números, com o adendo já gravado; build carimbado `2026-10-04 18:01:52 -0300`, o da aceitação |

### Aceitação no WhatsApp Web real (`evidence/aceitacao-whatsapp-real.md`)

Conferida às 18:03–18:07 pelo `whatsapp-cft`, no grupo de teste, só por medidas de geometria, nas
dimensões da rodada 3 do TTLJ, em que o defeito foi visto. Os cinco critérios passaram, cada um com a medida que o sustenta:

- Rodada 1 (área de 944 px, modo lateral, áudios 5 a 9 abertos nessa ordem): a janela 5, de foco mais
  antigo, cede; as janelas 6 a 9 ficam à vista, sem sobreposição, com vãos de 8 px, e cada seta tem a ponta
  fora de qualquer janela e 9 de 9 pontos. A janela 6 sobe ao topo da área, com seta reta em y = 271,5;
  antes, empurrada pela 5, tinha 4 de 9 pontos e a ponta sob ela.
- Rodada 2: o clique no ícone 5 põe a janela 5 à vista e oculta a 6; o botão de fechar da janela 5 devolve a
  6. Nenhuma janela à vista cobre o balão de outra à vista; as coberturas medidas são de balões cuja janela
  cedeu ou foi fechada, como admite o Delta 2.
- Rodada 3 (área de 656 px, modo abaixo): uma janela à vista, a de foco, com seta vertical inteira e o ▶
  próprio livre, como o adendo do TTLJ decidiu.

Nenhum achado lateral novo.

## Agent Notes

- Registrado a partir do achado lateral 1 da aceitação do BUG-20261004-TTLJ, confirmado pelo usuário com o
  relato "seta escondida no modo lateral". O usuário respondeu "CONTINUAR" às perguntas do intake; o
  registro adotou as opções recomendadas: o cenário é o do achado 1, a cobertura do balão recebido entra
  neste mesmo bug, e severidade `medium` e prioridade `P2` (propostas pelo agente). Confirme ou ajuste no
  início do fix.
- Comportamento anterior ao TTLJ: o posicionador de antes e o de depois daquela correção dão saídas
  idênticas nas entradas da rodada 3.
- OW7G, K3DY e TTLJ têm `DONE.md` e são somente leitura. A camada das setas atrás das janelas foi critério
  do OW7G (a seta não rouba cliques) e a colisão só entre janelas que se cruzam foi decisão do usuário no
  K3DY: mudar qualquer das duas é mudança de comportamento decidido, a tratar no veredito de spec, não como
  regressão.
- Reprodução no `whatsapp-cft` com a conta real do usuário: siga a `/aceitacao-real` (só o grupo de teste e
  a conversa consigo mesmo, barra lateral escondida e conferida, print recortado e desfocado com sigma 40,
  nenhum envio). A rodada 3 não tem print; uma nova reprodução deve medir a ponta da seta com
  `elementFromPoint`.
- `taxonomy.yaml` segue vazio; `area`, `module` e `feature` ficam `unclassified`, como nos demais bugs do
  contexto. Proposta de termos: `area: extensao`, `module: janela-flutuante`, `feature: posicionamento`.
- 2026-10-04 17:41, `/reversa-debugger-fix`: o usuário confirmou `medium` e `P2` e escolheu a estratégia A,
  "uma por vez no conflito lateral" (recomendada entre encolher a janela de cima, apontar a ponta para a
  parte descoberta e o debate multiagente; diagnóstico §4). Plano em `fix/plan.html`, aguardando aprovação.
- Fora da regra, por desenho: o conflito só considera pares de janelas laterais. Na faixa de 721 a 725 px,
  em que o enviado ainda abre ao lado e o recebido já cai no modo abaixo, a janela do modo abaixo segue o
  Delta 3 do TTLJ. O balão de áudio sem janela à vista, e de mensagem de texto, do outro lado pode seguir
  coberto pela janela lateral (o posicionador não o conhece).
- 2026-10-04 17:59: com a closure já satisfeita, o usuário decidiu esperar a aceitação real antes da trava,
  como no TTLJ. Na aceitação, os critérios 1 a 4 do registro leem-se pelo adendo `bug-BUG-20261004-ME3Q-v001`:
  o critério 2 vale para o balão de outra janela à vista, e a cobertura de mensagens sem janela à vista do
  outro lado (Delta 2) não reprova. Rodada sugerida: a geometria da rodada 3 (1440 × 832, área de 944 px), com
  áudios dos dois lados, medindo a ponta e nove pontos de cada seta com `elementFromPoint`, a troca pelo ícone
  e o fechamento.
- 2026-10-04 18:10: aceitação no WhatsApp Web real pela `/aceitacao-real`, de 18:03 a 18:07, com os cinco
  critérios aprovados (`evidence/aceitacao-whatsapp-real.md`). Bug encerrado com `DONE.md`, como o usuário
  decidira às 17:59. Sem commit: o fix e o registro aguardam o pedido do usuário.
