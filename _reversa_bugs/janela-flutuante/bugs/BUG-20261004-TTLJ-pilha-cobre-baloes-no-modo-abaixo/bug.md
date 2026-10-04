---
schema_version: 1
id: BUG-20261004-TTLJ
display_number: 13
title: "Modo abaixo: a pilha de janelas que sobe para caber cobre os próprios balões e esconde as setas"
status: resolved
phase: null
severity: medium
priority: P1
created: 2026-10-04
updated: 2026-10-04T17:12-03:00

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [janela-flutuante, posicionamento, modo-abaixo]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "1/1 no WhatsApp Web pelo whatsapp-cft em 2026-10-04 (evidence/reproduction.md); o mesmo padrão no print da aceitação do HVT4, rodada 1, em 2026-10-02"
  suspected_triggers:
    - "área da conversa abaixo de 726 px CSS: toda janela abre no modo abaixo (RF-02)"
    - "várias janelas abertas cuja pilha passaria do fim da área das mensagens e sobe para caber (Adição 2 do adendo do HVT4)"
  capsule: evidence/reproduction.md

blocking: []
relationships:
  - bug: BUG-20261002-HVT4
    type: related-to
    state: supported
    evidence:
      - "evidence/diagnostico.md §1: conterNaFaixa (Adição 2 do HVT4) sobe a pilha do modo abaixo sobre o próprio balão; sem a faixa, a pilha já cobria os balões seguintes"
  - bug: BUG-20261002-OW7G
    type: related-to
    state: supported
    evidence:
      - "evidence/diagnostico.md §1: a seta vertical do modo abaixo atravessa a janela vizinha, e a camada das setas fica atrás das janelas (garantirCamadaSetas)"

traceability:
  specs:
    - "_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/janela-flutuante.md#11-edge-cases-e-tratamento-de-erros"
    - "_reversa_sdd/addenda/bug-BUG-20261002-HVT4-v001.md#adição-2-oq-01-respondida-a-pilha-sobe-até-caber"
    - "_reversa_sdd/addenda/bug-BUG-20261002-HVT4-v001.md#adição-3-modo-abaixo-rf-02-no-pé-da-conversa"
    - "_reversa_sdd/addenda/bug-BUG-20261002-HVT4-v001.md#limite-conhecido"
    - "_reversa_sdd/addenda/bug-BUG-20261004-TTLJ-v001.md"
  affected_code:
    - extension/src/content/posicionador-colisoes.ts
    - extension/src/content/gerenciador-janelas.ts
    - extension/src/content/janela-flutuante.css
  root_cause:
    state: confirmed
    hypothesis: "No modo abaixo, calcularPosicoesJanelas põe cada janela na coluna do próprio balão e só resolve colisão entre janelas, nunca contra balões: numa sequência de áudios (um a cada 117 px), qualquer pilha de janelas de 171 a 242 px cobre balões, e conterNaFaixa (Adição 2) sobe a pilha sem distinguir o modo, cobrindo também o próprio balão. A seta desse modo é vertical e, na janela deslocada, atravessa a vizinha, atrás da qual a camada das setas fica. Na origem, lacuna de spec: o RF-02 foi escrito para uma janela, e sua combinação com o RF-05 e a Adição 2 nunca foi especificada."
    causal_path:
      - "área da conversa abaixo de 726 px: sem espaço ao lado do balão (336 px fixos), a janela cai no modo abaixo (RF-02), na coluna do balão"
      - "segunda janela em diante: a colisão a empurra para baixo da anterior, sobre os balões seguintes (anterior ao HVT4)"
      - "pilha que passaria do fim da área: conterNaFaixa a sobe em bloco, sobre os próprios balões (Adição 2 do HVT4)"
      - "seta vertical da janela deslocada: corre por trás da janela vizinha e some (camada das setas atrás das janelas, OW7G)"
    evidence:
      - ref: evidence/diagnostico.md
        observation: "calcularPosicoesJanelas, com as entradas medidas, devolve exatamente as posições da reprodução (64, 304, 483, 702, 952); sem a faixa, a janela 1 cobre 100% dos balões 2 e 3"
      - ref: evidence/reproduction.md
        observation: "no WhatsApp Web, balões cobertos de 87% a 96%, ▶ de 4 em 5 sob janela, 3 setas sem ponto visível"
      - ref: evidence/diagnostico.md
        observation: "balão de voz de largura fixa (336 px): modo abaixo em toda janela de navegador abaixo de uns 1270 px com a lista de conversas; a 900 px sobram 75 px ao lado do balão"
    code_refs:
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: calcularPosicoesJanelas, commit: a7b6bdd }
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: conterNaFaixa, commit: a7b6bdd }
      - { file: extension/src/content/gerenciador-janelas.ts, symbol: garantirCamadaSetas, commit: a7b6bdd }
  reproduction_tests:
    - "extension/test/posicionador-colisoes.test.ts › reprodução: no modo abaixo, com cinco áudios abertos, nenhuma janela à vista cobre o próprio balão, e nenhuma seta atravessa janela à vista (critérios 1 e 2 do TTLJ)"
    - "extension/test/janelas-no-navegador.test.ts › reprodução: no modo abaixo, com cinco áudios abertos, nenhuma janela à vista cobre o próprio balão, e a seta de cada uma tem trecho visível (critérios 1 e 2 do TTLJ)"
  regression_tests:
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas deixa à vista, no modo abaixo, só a janela de foco mais recente, 8 px abaixo do próprio balão e ligada a ele por uma seta vertical de 8 px (RF-02, RF-05)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas abre acima do próprio balão a janela de foco do modo abaixo que não cabe abaixo dele, mesmo com outras abertas (Adição 3 do HVT4)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas oculta a janela de foco do modo abaixo cujo balão sai da área, sem pôr outra à vista no lugar (RF-03)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas deixa à vista todas as janelas do modo lateral, qualquer que seja o foco (critério 4 do TTLJ)"
    - "extension/test/janelas-no-navegador.test.ts › no modo abaixo, só a janela aberta por último fica à vista; destacar outra a põe à vista e oculta a anterior, e fechar a janela à vista não traz outra (TTLJ)"

spec_verdict: spec-desatualizada
spec_verdict_decision:
  decided_by: iago
  decided_at: "2026-10-04 16:43 -03"
  addendum: _reversa_sdd/addenda/bug-BUG-20261004-TTLJ-v001.md
  addendum_text_approved: "2026-10-04 16:43 -03, por iago, na mesma resposta"
  addendum_amended: "2026-10-04 16:51 -03, por iago: Delta 3 e Limites conhecidos emendados antes do primeiro commit, depois da medida com áudios recebidos (evidence/diagnostico.md §5)"
  evidence: "O RF-05 (critério: 5 janelas, nenhuma sobreposta, cada seta para o balão correto) e a Adição 2 do adendo do HVT4 (a pilha sobe até caber) prescreviam, também no modo abaixo, todas as janelas à vista numa pilha, o que é geometricamente incompatível com o 'sem cobri-lo' do RF-02: o código os seguia (a função isolada reproduz as posições medidas). O 'Limite conhecido' do adendo do HVT4 registrava o conflito. O adendo muda a leitura do RF-05, da Adição 2 e do RF-02 no modo abaixo: uma janela à vista, a de foco mais recente."

change_risk:
  classification: média
  reasons:
    - "blast radius: posicionador e gerenciador do módulo janela-flutuante; porta ExibicaoDeTranscricao sem mudança (destacar já existia)"
    - "sem contrato externo, sem dados persistidos, sem concorrência; reversível por git revert"
    - "comportamento visível novo no modo abaixo, com adendo de spec"

change_set:
  - id: CHG-001
    kind: test
    artifact: extension/test/posicionador-colisoes.test.ts
    purpose: "reprodução e regressões do cálculo; o teste da seta vertical do modo abaixo passa a calcular cada janela sozinha"
    diff: fix/CHG-001.diff
    approved: "Gate 1, 2026-10-04 16:33"
  - id: CHG-002
    kind: test
    artifact: extension/test/janelas-no-navegador.test.ts
    purpose: "reprodução no Chrome for Testing com o CSS real; troca da janela à vista por destacar e fechamento"
    diff: fix/CHG-002.diff
    approved: "Gate 1, 2026-10-04 16:33"
  - id: CHG-003
    kind: code
    artifact: extension/src/content/posicionador-colisoes.ts
    purpose: "campo foco; xAoLado extraído do laço sem mudar a regra; no modo abaixo, só a janela de foco mais recente (foco positivo) fica à vista"
    diff: fix/CHG-003.diff
    approved: "Gate 2, 2026-10-04 16:40"
  - id: CHG-004
    kind: code
    artifact: extension/src/content/gerenciador-janelas.ts
    purpose: "contador de foco em abrir e destacar; destacar recalcula as posições; fechar a janela de foco zera o foco das demais"
    diff: fix/CHG-004.diff
    approved: "Gate 2, 2026-10-04 16:40"
  - id: CHG-005
    kind: documentation
    artifact: extension/src/content/JANELAS.md
    purpose: "passo 4 do algoritmo com a regra do modo abaixo"
    diff: fix/CHG-005.diff
    approved: "Gate 2, 2026-10-04 16:40"
  - id: CHG-006
    kind: specification
    artifact: _reversa_sdd/addenda/bug-BUG-20261004-TTLJ-v001.md
    purpose: "adendo do veredito spec-desatualizada: uma janela à vista no modo abaixo (RF-05, Adição 2 e RF-02)"
    diff: fix/CHG-006.diff
    approved: "veredito e texto, 2026-10-04 16:43; emenda do Delta 3, 16:51"

closure:
  policy: local-software
  satisfied: true
  evidence:
    - evidence/gate1-vermelho.txt
    - evidence/gate2-verde.txt
    - evidence/gate2-verde-suite.txt
    - evidence/aceitacao-whatsapp-real.md
    - _reversa_sdd/addenda/bug-BUG-20261004-TTLJ-v001.md
resolution_kind: fixed
---

# Modo abaixo: a pilha de janelas que sobe para caber cobre os próprios balões e esconde as setas

## Summary

Com a área da conversa abaixo de 726 px, toda janela abre no modo abaixo, na coluna do balão. Com várias
janelas abertas, a pilha que sobe para caber na área das mensagens (correção do BUG-20261002-HVT4) cobre
os balões de áudio, inclusive o próprio de cada janela, e o ▶ deles; a seta vertical que liga cada
janela ao seu balão (BUG-20261002-OW7G) corre por trás das janelas e some. O usuário perde de vista os
áudios e não sabe qual janela é de qual áudio.

## Expected Behavior

Pela spec efetiva (`janela-flutuante.md` com o adendo `bug-BUG-20261002-HVT4-v001`):

- RF-02: com espaço lateral menor que a janela, ela abre "imediatamente abaixo do balão e sem cobri-lo",
  com o critério "o balão permanece visível".
- RF-05: várias janelas abertas, nenhuma sobreposta, "mantendo uma seta que a liga ao balão de origem",
  com o critério "cada seta apontando para o balão correto".
- Adição 2 do adendo: a janela que passaria do fim da área das mensagens sobe até caber, e as de cima
  sobem junto; a pilha mais alta que a área começa no topo dela.
- Adição 3 do adendo: no modo abaixo, a janela que não cabe abaixo do balão abre acima dele, sem cobri-lo,
  se ali couber; senão, vale a Adição 2.

No modo abaixo com pilha, a Adição 2 e o "sem cobri-lo" do RF-02 colidem: subir para caber obriga a
cobrir balões. O "Limite conhecido" do adendo reconhece o conflito e deixa a solução para este bug, que,
portanto, também pede uma decisão de spec.

## Actual Behavior

Medido no WhatsApp Web em 2026-10-04 (`evidence/reproduction.md`), com área da conversa de 656 px, área
das mensagens de y = 64 a 768 e cinco áudios transcritos:

- A pilha soma 1120 px, começa no topo da área (64) e cobre de 87% a 96% de cada balão, quase sempre com
  a janela do áudio seguinte.
- O ▶ de quatro dos cinco áudios fica sob uma janela.
- Das cinco setas, três não têm nenhum ponto visível em nove amostrados, uma tem um, e a quinta só
  aparece sobre a caixa de escrita e fora da tela.
- As janelas 4 e 5 passam do fim da área; a 5 fica inteira abaixo da tela.

## Steps to Reproduce

1. Abrir no WhatsApp Web, com a extensão, uma conversa com cinco mensagens de voz consecutivas.
2. Deixar a área da conversa abaixo de 726 px de largura (viewport de 1200 × 832 dá 656 px).
3. Clicar no ícone de transcrição dos cinco áudios e esperar as cinco janelas.
4. Observar: as janelas sobem até o topo da área e cobrem os balões e o ▶; as setas verticais ficam por
   trás das janelas.

## Evidence

- `evidence/reproduction.md`: medidas de balões, janelas, ▶ e setas no WhatsApp Web (`whatsapp-cft`).
- `evidence/modo-abaixo-pilha-desfocado.png`: cópia desfocada do print, recortada à área da conversa
  (fora do git, como o original `evidence/modo-abaixo-pilha.png`).
- `../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/aceitacao-whatsapp-real.md`, rodada 1:
  o achado original, no WhatsApp real da conta do usuário.
- Relato: `../../intake/relato-20261004-1559.md`.

## Suspected Area

- `extension/src/content/posicionador-colisoes.ts`, `calcularPosicoesJanelas`: a subida em bloco da
  Adição 2 não distingue o modo abaixo, em que a janela mora na coluna do próprio balão.
- `extension/src/content/gerenciador-janelas.ts`: camada das setas atrás das janelas (OW7G); no modo
  abaixo a seta é vertical e fica toda sob a janela ou a vizinha.
- `extension/src/content/janela-flutuante.css`: ordem de pintura das setas e das janelas.

## Acceptance Criteria

1. No modo abaixo, com cinco janelas abertas, nenhuma janela cobre o balão de um áudio que esteja na área
   das mensagens, nem o ▶ dele (`elementFromPoint` no centro do ▶ não cai numa janela).
2. Cada janela exibida tem a sua seta com trecho visível, ligando-a ao balão correto.
3. As janelas seguem sem se sobrepor, com vãos de 8 px (RF-05), e nenhuma passa do fim da área das
   mensagens além do que a spec decidida no fix admitir.
4. O modo lateral não regride: a aceitação do HVT4 e do OW7G na rodada 2 (área de 726 px ou mais) segue
   valendo.
5. A decisão sobre o conflito entre o RF-02 e a Adição 2 no modo abaixo fica registrada num adendo.

## Traceability

- Specs: `janela-flutuante.md` §6.1 (RF-02, RF-05) e §11 (EC-05); adendo `bug-BUG-20261002-HVT4-v001`,
  Adições 2 e 3 e "Limite conhecido".
- Código onde aparece: `posicionador-colisoes.ts`, `gerenciador-janelas.ts`, `janela-flutuante.css`.
- Testes existentes que fixam o comportamento atual: em `extension/test/posicionador-colisoes.test.ts`,
  "sobe em bloco a pilha que passaria do fim da área, mantendo os vãos de 8 px" e "começa no topo da área
  a pilha mais alta que ela, sem sobreposição, e só o excesso passa do fim" (HVT4).
- Relações propostas: `related-to` BUG-20261002-HVT4 e `related-to` BUG-20261002-OW7G.

## Resolution

**Encerrado em 2026-10-04 17:12 -03 · `resolution_kind: fixed` · closure `local-software` satisfeita.**

### Causa raiz (`confirmed`)

No modo abaixo (RF-02), `calcularPosicoesJanelas` punha cada janela na coluna do próprio balão, de largura
fixa (336 px), e só resolvia colisão entre janelas, nunca contra balões. Numa sequência de áudios, um a
cada 117 px, a segunda janela em diante descia sobre os balões seguintes; `conterNaFaixa` (Adição 2 do
HVT4) subia a pilha em bloco, sem distinguir o modo, e passava a cobrir também o próprio balão. A seta
desse modo é vertical: na janela deslocada, atravessava a vizinha, atrás da qual corre a camada das setas
(OW7G). Com as entradas medidas, a função isolada devolve exatamente as posições da reprodução (64, 304,
483, 702 e 952; `evidence/diagnostico.md` §1). Na origem, uma lacuna de spec: o RF-02 foi escrito para uma
janela, e sua combinação com o RF-05 e a Adição 2 nunca fora especificada, como o "Limite conhecido" do
adendo do HVT4 admitia. O modo abaixo é o caso comum, e não um canto: com a lista de conversas aberta, vale
em toda janela de navegador abaixo de uns 1270 px (§2).

### Estratégia

Correção direta, "uma por vez", escolhida por iago por volta das 16:15. A medida mostrou que nenhuma regra
atende ao mesmo tempo a três exigências (todos os balões descobertos, todas as janelas à vista, todas
dentro da área); cedeu "todas à vista". No modo abaixo, as janelas seguem abertas, mas só a de foco mais
recente fica à vista, e o foco é a ordem do último `abrir` ou `destacar`. O clique no ícone de um áudio com
janela aberta já chegava ao gerenciador como `destacar` (`nucleo.ts`, `processarSolicitacao`), de modo que
a porta `ExibicaoDeTranscricao` não muda. Fechar a janela à vista zera o foco das demais e não traz outra.
A regra que escolhe o lado da janela foi extraída do laço sem mudança (`xAoLado`), para servir também à
escolha da janela de foco; o modo lateral segue como estava. A alternativa que deixaria todas as janelas à
vista sem cobrir balões, reservando espaço na conversa sob cada um, ficou de fora pelo risco.

### Correction Change Set

| CHG | Tipo | Artefato | Propósito | Diff |
|---|---|---|---|---|
| CHG-001 | test | `extension/test/posicionador-colisoes.test.ts` | Reprodução e quatro regressões do cálculo; o teste da seta vertical do modo abaixo passa a calcular cada janela sozinha | [CHG-001](fix/CHG-001.diff) |
| CHG-002 | test | `extension/test/janelas-no-navegador.test.ts` | Reprodução no Chrome for Testing com o CSS real; troca da janela à vista por `destacar` e fechamento | [CHG-002](fix/CHG-002.diff) |
| CHG-003 | code | `extension/src/content/posicionador-colisoes.ts` | Campo `foco`; `xAoLado` extraído; no modo abaixo, só a janela de foco mais recente com foco positivo fica à vista | [CHG-003](fix/CHG-003.diff) |
| CHG-004 | code | `extension/src/content/gerenciador-janelas.ts` | Contador de foco em `abrir` e `destacar`; `destacar` recalcula as posições; fechar a janela de foco zera o foco das demais | [CHG-004](fix/CHG-004.diff) |
| CHG-005 | documentation | `extension/src/content/JANELAS.md` | Passo 4 do algoritmo com a regra do modo abaixo | [CHG-005](fix/CHG-005.diff) |
| CHG-006 | specification | `_reversa_sdd/addenda/bug-BUG-20261004-TTLJ-v001.md` (novo) | Adendo do veredito `spec-desatualizada` | [CHG-006](fix/CHG-006.diff), [adendo](../../../../_reversa_sdd/addenda/bug-BUG-20261004-TTLJ-v001.md) |

Sem reparo de dados: a janela vive só na aba, e o defeito não gravou estado.

### Diff do código e da spec

Spec: adendo `_reversa_sdd/addenda/bug-BUG-20261004-TTLJ-v001.md` (CHG-006). Delta 1: no modo abaixo, o
RF-05 passa a ter uma janela à vista, a aberta ou destacada por último; as demais ficam ocultas, como no
RF-03, e voltam pelo ícone do áudio. Delta 2: no modo abaixo não há pilha; a janela à vista fica abaixo do
próprio balão ou, se ali não couber, acima dele (Adição 3), e a subida da Adição 2 só vale quando não cabe
em nenhum dos dois lugares. Delta 3: o "sem cobri-lo" do RF-02 refere-se ao próprio balão e ao ▶ dele; a
janela pode cobrir os balões vizinhos e, com a área da conversa de uns 390 px ou mais, não cobre ícone de
transcrição algum (emenda das 16:51, depois da medida com áudios recebidos, `evidence/diagnostico.md` §5).
O "Limite conhecido" do adendo do HVT4 fica resolvido.

Código (núcleo dos CHG-003 e CHG-004; íntegra em `fix/`):

```diff
--- a/extension/src/content/posicionador-colisoes.ts
+++ b/extension/src/content/posicionador-colisoes.ts
+  foco?: number;
+function xAoLado(ancora: CoordenadasAncora, req: RequisicaoPosicionamento, direitaDaArea: number, esquerdaDaArea: number): number | null {
+  /* a regra de lado de antes, fora do laço: recebido à direita, enviado à esquerda, ou onde couber; senão, null */
+}
+  const ordemDeFoco = new Map(requisicoes.map((req, i) => [req, req.foco ?? i + 1]));
+  const focadaAbaixo = requisicoes
+    .filter((req) => ordemDeFoco.get(req)! > 0 && req.ancora && xAoLado(req.ancora, req, direitaDaArea, esquerdaDaArea) === null)
+    .reduce<RequisicaoPosicionamento | undefined>((focada, req) => (!focada || ordemDeFoco.get(req)! > ordemDeFoco.get(focada)! ? req : focada), undefined);
-    if (!req.ancora || !req.ancora.visivel || foraDaFaixa) {
+    const xLateral = req.ancora ? xAoLado(req.ancora, req, direitaDaArea, esquerdaDaArea) : null;
+    if (!req.ancora || !req.ancora.visivel || foraDaFaixa || (xLateral === null && req !== focadaAbaixo)) {
--- a/extension/src/content/gerenciador-janelas.ts
+++ b/extension/src/content/gerenciador-janelas.ts
+  private ultimoFoco = 0;
-      seta: null
+      seta: null,
+      foco: ++this.ultimoFoco
   destacar(idAudio: string): void {
     const reg = this.janelas.get(idAudio);
-    if (reg && reg.elemento) {
+    if (!reg) return;
+    reg.foco = ++this.ultimoFoco;
+    this.recalcularPosicoes();
+    if (reg.elemento) {
       aplicarDestaqueJanela(reg.elemento);
     this.janelas.delete(idAudio);
+    if (reg.foco === this.ultimoFoco) {
+      for (const outra of this.janelas.values()) outra.foco = 0;
+    }
```

### Testes: vermelho → verde

- Gate 1 (aprovado às 16:33; `evidence/gate1-vermelho.txt`): 36 testes nos dois arquivos, 29 ok e 7
  falhas, que são as seis provas novas do TTLJ (as duas reproduções e as três regressões do foco no
  cálculo, mais a troca no navegador) e a suíte do navegador que as contém. A guarda do modo lateral passa
  já no vermelho, como deve: é regressão, não reprodução.
- Gate 2 (aprovado às 16:40; `evidence/gate2-verde.txt`, 16:41): 36 testes, **36 ok, 0 falhas**. Na
  primeira versão, fechar a janela de foco punha à vista a de foco anterior; o `fechar` passou a zerar os
  focos e o posicionador, a exigir foco positivo, antes da aprovação.
- Suíte completa no fechamento (`evidence/gate2-verde-suite.txt`, 17:10): typecheck limpo; testes da
  extensão, 192, com **190 ok, 0 falhas** e 2 pulados por opção; ruff limpo; pytest do auxiliar, 126 ok e
  6 pulados. Build da aceitação: carimbo de 2026-10-04 17:01:08 -0300.

### Aceitação no WhatsApp Web real (`evidence/aceitacao-whatsapp-real.md`)

Conferida às 17:00–17:05 pelo `whatsapp-cft`, no grupo de teste, só em geometria. Os sete critérios
passaram, cada um com a medida que o sustenta:

- Rodada 1 (cinco áudios enviados, área de 656 px, modo abaixo): uma janela à vista, a do áudio 5, acima do
  próprio balão (389 a 621, balão de 629 a 719), com a seta de 8 px inteira visível, o ▶ próprio livre e
  nenhum ícone sob ela. O clique no ícone 2 pôs à vista só a janela 2, 8 px abaixo do balão; fechá-la deixou
  quatro abertas e nenhuma à vista.
- Rodada 2 (quatro áudios recebidos): o mesmo resultado com balões à esquerda (janelas 9 e depois 7), sem
  ícone coberto.
- Rodada 3 (área de 944 px, modo lateral): as cinco janelas de balões na área ficam à vista, sem
  sobreposição, com vãos de 8 px; o posicionador de antes e o de agora dão saídas idênticas nessas entradas.

### Veredito de spec: `spec-desatualizada`

O RF-05 e a Adição 2 do adendo do HVT4 prescreviam, também no modo abaixo, todas as janelas à vista numa
pilha, o que é geometricamente incompatível com o "sem cobri-lo" do RF-02, e o código os seguia. Veredito
escolhido por iago às 16:43, com o texto do adendo aprovado na mesma resposta; Delta 3 e Limites
conhecidos emendados com aprovação às 16:51, antes do primeiro commit. O critério 1 deste bug, como estava
escrito ("nenhuma janela cobre o balão de um áudio na área"), é inalcançável no modo abaixo e foi conferido
na leitura do adendo.

### Fora desta correção

- **Modo lateral com os dois lados da conversa** (achado 1 da aceitação): a janela de um áudio enviado
  cobre o corredor da seta e parte do balão de um recebido; a seta do áudio 6 fica com 4 de 9 pontos
  visíveis. Comportamento anterior (posicionador idêntico antes e depois). Candidato a `/reversa-debugger`.
- **Balão em parte sob a caixa de escrita** não oculta a janela; a Adição 1 do HVT4 trata só o cabeçalho.
  Candidato a `/reversa-debugger`, como já anotado abaixo.
- Limites conhecidos do adendo: a janela de foco que não cabe nem abaixo nem acima do balão sobe sobre ele
  (área das mensagens abaixo de uns 590 px); com a área da conversa abaixo de uns 390 px, ela cobre até
  6 px da borda direita do ícone; a janela que volta à vista desliza da última posição visível.
- Reservar espaço na conversa sob cada balão, para ter todas as janelas à vista sem cobrir balões:
  candidato a feature.

## Agent Notes

- Severidade `medium` e prioridade `P1` escolhidas pelo usuário em 2026-10-04.
- `taxonomy.yaml` segue vazio; `area`, `module` e `feature` ficam `unclassified`, como nos demais bugs do
  contexto. Proposta de termos: `area: extensao`, `module: janela-flutuante`, `feature: posicionamento`.
- HVT4 e OW7G têm `DONE.md`: são somente leitura. A correção deste bug muda o comportamento que os testes
  do HVT4 citados acima fixam; o fix deve tratar isso como mudança de spec, não como regressão.
- Achado lateral, não registrado: o balão 5 da reprodução está em parte sob a caixa de escrita (763 a 852,
  caixa a partir de 768), e a janela dele não se oculta. A Adição 1 trata o balão em parte sob o
  cabeçalho, não sob a caixa de escrita. Candidato a `/reversa-debugger` se o fix não o absorver.
- Reprodução no `whatsapp-cft` com a conta real do usuário: siga a seção 3 da `/aceitacao-real` (só o
  grupo de teste e a conversa consigo mesmo, barra lateral escondida com conferência de todos os
  elementos, print recortado e desfocado com sigma 40, nenhum envio). Leia geometria, não texto.
- Achado lateral da aceitação, não registrado: no modo lateral, numa conversa com os dois lados, a janela
  de um áudio enviado cobre o corredor da seta e parte do balão de um recebido (`evidence/aceitacao-whatsapp-real.md`,
  achado 1). Anterior a esta correção; candidato a `/reversa-debugger`, `related-to` OW7G e K3DY.
