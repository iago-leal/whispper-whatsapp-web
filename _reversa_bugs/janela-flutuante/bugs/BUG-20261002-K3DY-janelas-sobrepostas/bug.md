---
schema_version: 1
id: BUG-20261002-K3DY
display_number: 8
title: "Janelas flutuantes se sobrepõem: o posicionador supõe altura fixa de 160 px"
status: resolved
phase: null
severity: medium
priority: P2
created: 2026-10-02
updated: 2026-10-02T18:13-03:00

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [janela-flutuante, posicionamento]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "4/4 no Chrome for Testing com o gerenciador e a folha de estilos reais (evidence/reproduction.md); medido também no WhatsApp Web real na aceitação do A4MZ (17 px de sobreposição)"
  suspected_triggers:
    - "janela concluída mais alta que 160 px (confirmado: 190 px com texto médio, 242 px no limite do RF-07)"
    - "janela que cresce ao concluir sem que as de baixo se movam (confirmado: definirEstado recalcula com os mesmos 160 px)"
  capsule: evidence/reproduction.md

regression_analysis:
  last_known_good: null
  first_known_bad: bab1e53
  bisect: "não aplicável: a altura de 160 px está no recalcularPosicoes desde a primeira implementação das janelas (bab1e53)"
  culprit_commit: bab1e53

blocking: []
relationships:
  - bug: BUG-20261002-A4MZ
    type: related-to
    state: confirmed
    evidence:
      - ref: ../BUG-20261002-A4MZ-janela-longe-do-balao/evidence/aceitacao-whatsapp-real.md
        observation: "achado 2 da aceitação do A4MZ: no WhatsApp real, janelas de 191 px se cruzam em 17 px porque 565 + 160 + 8 = 733 < 739; os dois defeitos vivem em calcularPosicoesJanelas, o A4MZ no eixo horizontal e o K3DY no vertical"
  - bug: BUG-20261002-IXWO
    type: related-to
    state: supported
    evidence:
      - ref: ../BUG-20261002-IXWO-janela-invisivel/evidence/reproduction.md
        observation: "a sobreposição só é vista depois do contorno do IXWO (rolagem); a altura fixa de 160 px e a âncora ausente nascem na mesma montagem de requisições de GerenciadorDeJanelas.recalcularPosicoes"

traceability:
  specs:
    - "_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais"
  affected_code:
    - extension/src/content/gerenciador-janelas.ts
    - extension/src/content/posicionador-colisoes.ts
  root_cause:
    state: confirmed
    hypothesis: "GerenciadorDeJanelas.recalcularPosicoes informa ao posicionador a altura literal de 160 px para toda janela, em vez da altura desenhada. O posicionador empilha cada janela em y + 160 + 8; a janela mais alta que 160 px invade a seguinte em (altura − 160) px, e a que cresce ao concluir não desloca as de baixo."
    causal_path:
      - "gerenciador-janelas.ts recalcularPosicoes: monta as requisições com largura: 320 e altura: 160 fixas, sem ler o elemento da janela"
      - "posicionador-colisoes.ts calcularPosicoesJanelas: ultimoFimY = y + altura + GAP com altura = 160; a janela seguinte só é deslocada se começar antes de y + 168"
      - "janela-flutuante.css .whispper-janela: altura ajustada ao conteúdo até max-height 240 px, mais 1 px de borda de cada lado: 94 px em espera, 129 com texto curto, 190 com texto médio, 242 no limite"
      - "definirEstado troca o conteúdo e chama recalcularPosicoes, que repete os 160 px: a janela que cresce de 94 para 242 px cobre a de baixo em 74 px"
    evidence:
      - ref: evidence/reproduction.md
        observation: "cenário 1: cinco janelas a 168 px uma da outra, qualquer que seja a altura; sobreposições de 22, 74 e 22 px, iguais a altura − 168 em cada par"
      - ref: evidence/reproduction.md
        observation: "cenário 2: em espera (94 px) não há sobreposição; depois de a de cima concluir (242 px), 74 px de sobreposição e a de baixo parada em y = 234"
      - ref: ../BUG-20261002-A4MZ-janela-longe-do-balao/evidence/aceitacao-whatsapp-real.md
        observation: "no WhatsApp real, a conta fecha com os mesmos 160 px: 565 + 160 + 8 = 733 < 739, sobreposição de 756 − 739 = 17 px"
    code_refs:
      - { file: extension/src/content/gerenciador-janelas.ts, symbol: "GerenciadorDeJanelas.recalcularPosicoes", commit: bab1e53 }
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: "calcularPosicoesJanelas", commit: bab1e53 }
  reproduction_tests:
    - "extension/test/janelas-no-navegador.test.ts › reprodução: cinco áudios consecutivos concluídos, com textos de alturas diferentes e um no limite de 240 px, resultam em cinco janelas sem sobreposição (RF-05, RF-07)"
    - "extension/test/janelas-no-navegador.test.ts › reprodução: quando a janela de cima cresce ao concluir, a de baixo desce e nenhuma se sobrepõe (RF-05)"
  regression_tests:
    - "extension/test/janelas-no-navegador.test.ts › a janela aberta acima de outra já aberta a empurra pela altura desenhada, a 8 px (RF-05)"
    - "extension/test/janelas-no-navegador.test.ts › a janela nova entra na página já na posição, sem deslizar do canto da tela (RF-01)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas não desloca a janela que não cruza, na horizontal, a janela de cima"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas desloca a janela pela de cima que a cruza, mesmo com outra, de lado oposto, entre as duas"
    - "extension/test/integracao-conversa.test.ts › testes do IXWO e do A4MZ (janela junto ao balão desde a primeira leitura, na abertura e na rolagem)"

spec_verdict: spec-correta
spec_verdict_decision:
  decided_by: iago
  decided_at: "2026-10-02, registrado às 18:03 -03"
  evidence: "RF-05 de janela-flutuante.md já pedia várias janelas, nenhuma sobreposta, deslocando para baixo a cuja posição ideal colidir com outra (colidir pressupõe cruzar); RF-07, altura ajustada ao texto até 240 px; seção 8, janelas consecutivas empilham-se sem se sobrepor. Os adendos 003 e 006 não tratam de altura nem da regra de colisão. O código divergiu ao supor 160 px e ao empurrar janelas que não se cruzam."

change_risk:
  classification: média
  reasons:
    - "blast radius visual: posição de todas as janelas, nos dois eixos do mesmo cálculo"
    - "ordem da abertura: medir a janela antes de ela receber a posição dispara a transição e a faz deslizar do canto (evidence/experimento-ordem-de-abertura.saida.txt; revisão 1 do A4MZ)"
    - "leitura de layout (offsetHeight) a cada recálculo, chamado por âncora em cada quadro de rolagem (RNF-02)"
    - "regra de colisão nova, decidida pelo usuário: só entre janelas que se cruzam na horizontal; idêntica à atual quando todas se cruzam"
    - "sem contrato externo, sem dados persistidos, sem concorrência nova; reversível por revert"

strategy:
  chosen: correção direta
  decided_by: iago
  decided_at: "2026-10-02 17:19 -03"
  scope_decisions:
    - "corte na borda inferior fica fora: registrar com /reversa-debugger e corrigir em seguida, sobre a altura real"
    - "colisão só entre janelas que se cruzam na horizontal entra no change set (nota do A4MZ)"
  plan: fix/plan.html
  plan_approved: "2026-10-02 17:24 -03, por iago"
  criterion_2_reading: "manter a transição de 120 ms do transform; o critério 2 é verificado no retângulo-alvo, na mesma tarefa do definirEstado, e no retângulo desenhado, ao fim da transição (decisão do usuário na aprovação do plano)"

change_set:
  - id: CHG-001
    kind: test
    artifact: extension/test/janelas-no-navegador.test.ts
    purpose: "novo: gerenciador montado do código-fonte no Chrome for Testing, com a folha de estilos real; reprodução dos critérios 1 e 2 e regressão do segundo cálculo da abertura e do deslize do canto"
    diff: fix/CHG-001.diff
    applied: "2026-10-02 17:51 -03, Gate 1 aprovado"
  - id: CHG-002
    kind: test
    artifact: extension/test/posicionador-colisoes.test.ts
    purpose: "regressão unitária: colisão só entre janelas que se cruzam na horizontal"
    diff: fix/CHG-002.diff
    applied: "2026-10-02 17:51 -03, Gate 1 aprovado"
  - id: CHG-001
    revision: 2
    kind: test
    artifact: extension/test/janelas-no-navegador.test.ts
    purpose: "o critério 2 espera o fim da transição (getAnimations vazio), e não 300 ms fixos: na suíte em paralelo, os quadros atrasaram e a prévia falhou 1 vez em 3 (evidence/gate2-previa-falha-de-temporizacao.txt)"
    diff: fix/CHG-001-rev2.diff
    applied: "2026-10-02 17:58 -03, Gate 2 aprovado"
  - id: CHG-003
    kind: code
    artifact: extension/src/content/gerenciador-janelas.ts
    purpose: "altura desenhada (offsetHeight) no recalcularPosicoes, lida antes das escritas; abrir posiciona a janela fora da página, insere e recalcula com a altura dela"
    diff: fix/CHG-003.diff
    applied: "2026-10-02 17:58 -03, Gate 2 aprovado"
  - id: CHG-004
    kind: code
    artifact: extension/src/content/posicionador-colisoes.ts
    purpose: "colisão só contra as janelas postas que cruzam a faixa horizontal; idêntica à anterior quando todas se cruzam"
    diff: fix/CHG-004.diff
    applied: "2026-10-02 17:58 -03, Gate 2 aprovado"
  - id: CHG-005
    kind: documentation
    artifact: extension/src/content/JANELAS.md
    purpose: "passo 3 do algoritmo de colisão: altura desenhada e colisão só entre janelas que se cruzam"
    diff: fix/CHG-005.diff
    applied: "2026-10-02 17:58 -03, Gate 2 aprovado"

closure:
  policy: local-software
  satisfied: true
  evidence:
    - evidence/gate2-verde-suite.txt
    - evidence/gate2-typecheck.txt
    - evidence/aceitacao-whatsapp-real.md
resolution_kind: fixed
---

# Janelas flutuantes se sobrepõem: o posicionador supõe altura fixa de 160 px

## Summary

Com duas janelas abertas, a segunda cobre a parte de baixo da primeira: o cabeçalho de uma fica sob o rodapé da outra. O resumo e o fim do texto da janela de cima ficam escondidos.

## Expected Behavior

- `janela-flutuante.md` RF-05: várias janelas abertas ao mesmo tempo, deslocando para baixo a que colidir com outra; cinco áudios consecutivos resultam em cinco janelas, nenhuma sobreposta.
- `janela-flutuante.md` RF-07: a janela tem 320 px de largura e altura ajustada ao texto até 240 px, com rolagem interna acima disso.

## Actual Behavior

No print do usuário, as duas janelas se sobrepõem verticalmente. Elas têm cerca de 190 e 230 px de altura, porque o estado concluído (texto e resumo) é mais alto que o estado de espera.

## Steps to Reproduce

1. No WhatsApp Web real, transcrever dois áudios próximos na mesma conversa, com textos de mais de duas linhas.
2. Rolar a conversa para as janelas aparecerem (contorno do BUG-20261002-IXWO).
3. Observar a borda inferior da janela de cima e a superior da de baixo.

## Evidence

- `evidence/janelas-longe-do-balao-e-sobrepostas-desfocado.png`: versão desfocada do print do usuário, com as duas janelas sobrepostas.
- Relato bruto: `../../intake/relato-20261002-1223.md`, Problema 3.

## Suspected Area

- `extension/src/content/gerenciador-janelas.ts`: `recalcularPosicoes` passa ao posicionador `altura: 160` fixa para todas as janelas, em vez da altura renderizada.
- `extension/src/content/posicionador-colisoes.ts`: a resolução de colisão empilha as janelas por `y + altura + 8`; com a altura subestimada, a janela seguinte começa antes do fim da anterior.
- `definirEstado` recalcula as posições a cada mudança de estado, mas com a mesma altura fixa; o recálculo existe, a medida é que está errada.

## Acceptance Criteria

1. Cinco áudios consecutivos transcritos resultam em cinco janelas sem sobreposição (RF-05), com textos de alturas diferentes, inclusive uma no limite de 240 px.
2. Quando uma janela cresce ao concluir, as de baixo são deslocadas, sem sobreposição em nenhum momento após a mudança de estado.
3. Teste do gerenciador ou de navegador que falha com a altura fixa e passa com a correção.

## Traceability

| Tipo | Referência |
|---|---|
| Spec | `_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais` (RF-05, RF-07) |
| Código | `extension/src/content/gerenciador-janelas.ts` (`recalcularPosicoes`), `extension/src/content/posicionador-colisoes.ts` |
| Testes existentes (no registro) | `extension/test/posicionador-colisoes.test.ts` ("desloca verticalmente janela para resolver colisão") recebe alturas como dado e passa; o defeito está em quem informa a altura |
| Testes da correção | `extension/test/janelas-no-navegador.test.ts` (2 de reprodução, 2 de regressão) e 2 unitários em `extension/test/posicionador-colisoes.test.ts` |
| Relações | `related-to` BUG-20261002-A4MZ (confirmed); `related-to` BUG-20261002-IXWO (supported) |

## Resolution

**Encerrado em 2026-10-02 18:13 -03 · `resolution_kind: fixed` · closure `local-software` satisfeita.**

### Causa raiz (`confirmed`)

`GerenciadorDeJanelas.recalcularPosicoes` informava ao posicionador `altura: 160` para toda janela, desde
a primeira implementação (`bab1e53`). O posicionador empilhava cada janela em `y + 160 + 8`: a janela
mais alta invadia a seguinte em `altura − 160` px, e a que crescia ao concluir não empurrava as de baixo,
porque o `definirEstado` recalculava com os mesmos 160 px. A conta fecha em todas as medidas: 22 px com
190 de altura e 74 px com 242, na reprodução (4/4, `evidence/reproduction.md`), e 17 px no WhatsApp real
(565 + 168 = 733 < 739, aceitação do A4MZ). Sem `git bisect`: o defeito nasceu com o código.

### Estratégia

Correção direta, escolhida pelo usuário, com duas decisões de escopo dele: a colisão passa a valer só
entre janelas que se cruzam na horizontal (nota do A4MZ), e o corte na borda inferior fica para um bug
próprio. A altura é a desenhada (`offsetHeight`), lida a cada recálculo, antes de qualquer escrita. A
ordem da abertura evita a armadilha da revisão 1 do A4MZ, medida antes do plano
(`evidence/experimento-ordem-de-abertura.saida.txt`): medida depois de entrar e antes de ter posição, a
janela dispara a transição e começa no canto (topo 0); posicionada fora da página, inserida e só então
medida, não dispara. Daí os dois cálculos do `abrir`. Na aprovação do plano, o usuário manteve a
transição de 120 ms: o critério 2 vale para o retângulo-alvo, na mesma tarefa do `definirEstado`, e para
o desenhado, ao fim da transição.

### Correction Change Set

| CHG | Tipo | Artefato | Propósito | Diff |
|---|---|---|---|---|
| CHG-001 | test | `extension/test/janelas-no-navegador.test.ts` (novo) | Gerenciador no Chrome for Testing com o CSS real: reprodução dos critérios 1 e 2; regressão do segundo cálculo e do deslize do canto | [CHG-001](fix/CHG-001.diff) |
| CHG-001 rev. 2 | test | idem | Critério 2 espera o fim da transição, e não 300 ms fixos (falha de temporização na suíte em paralelo) | [CHG-001-rev2](fix/CHG-001-rev2.diff) |
| CHG-002 | test | `extension/test/posicionador-colisoes.test.ts` | Dois unitários da colisão por faixa horizontal | [CHG-002](fix/CHG-002.diff) |
| CHG-003 | code | `extension/src/content/gerenciador-janelas.ts` | Altura desenhada no recálculo; `abrir` posiciona fora da página, insere e recalcula | [CHG-003](fix/CHG-003.diff) |
| CHG-004 | code | `extension/src/content/posicionador-colisoes.ts` | A janela só desce pelas postas que cruzam a sua faixa horizontal | [CHG-004](fix/CHG-004.diff) |
| CHG-005 | documentation | `extension/src/content/JANELAS.md` | Passo 3 do algoritmo de colisão | [CHG-005](fix/CHG-005.diff) |

Sem reparo de dados: a janela vive só na aba, e o defeito não gravou estado.

### Diff do código e da spec

Spec: **sem alteração** (veredito `spec-correta`). Código (núcleo dos CHG-003 e CHG-004; íntegra em `fix/`):

```diff
--- a/extension/src/content/gerenciador-janelas.ts
+++ b/extension/src/content/gerenciador-janelas.ts
+const ALTURA_SEM_MEDIDA = 160;
-      const container = this.garantirContainer();
-      container?.appendChild(el);
     this.recalcularPosicoes(area);
+    if (el) {
+      this.garantirContainer()?.appendChild(el);
+      this.recalcularPosicoes(area);
+    }
-      altura: 160,
+      altura: reg.elemento?.isConnected ? reg.elemento.offsetHeight : ALTURA_SEM_MEDIDA,
--- a/extension/src/content/posicionador-colisoes.ts
+++ b/extension/src/content/posicionador-colisoes.ts
-  let ultimoFimY = -Infinity;
+  const postas: Array<{ x: number; largura: number; fimY: number }> = [];
-    if (y < ultimoFimY) {
-      y = ultimoFimY;
+    const fimDasQueCruzam = postas
+      .filter((posta) => posta.x < x + largura && x < posta.x + posta.largura)
+      .reduce((fim, posta) => Math.max(fim, posta.fimY), -Infinity);
+    if (y < fimDasQueCruzam) {
+      y = fimDasQueCruzam;
-    ultimoFimY = y + altura + GAP;
+    postas.push({ x, largura, fimY: y + altura + GAP });
```

### Testes: vermelho → verde

- Gate 1 (aprovado às 17:50; `evidence/gate1-vermelho.txt`): 11 testes nos dois arquivos, 5 ok e 6
  falhas. Cinco concluídos: cruzamentos de 22, 74 e 22 px; a de cima cresce: a de baixo parada em 234;
  aberta acima: 234 contra 168; unitários: 264 contra 136 e contra 100. A guarda do deslize passa hoje.
- Mutação antes do Gate 1: com a correção ingênua (`offsetHeight` sem reordenar o `abrir`), as três
  reproduções passaram e a guarda falhou ("a janela C1 abriu com transição em curso"): a guarda pega a
  armadilha.
- Gate 2 (aprovado às 17:57): `npm test` com 160 testes, **158 ok, 0 falhas**, 2 pulados por opção;
  `npm run typecheck` e `tsc -p tsconfig.json --noEmit` limpos; testes do IXWO e do A4MZ verdes. Na
  cópia isolada, 4/4 suítes completas verdes antes da aplicação. Saídas em
  `evidence/gate2-verde-suite.txt` e `evidence/gate2-typecheck.txt`; build em `evidence/build-aceitacao.txt`.
- Reprodução depois da correção (`evidence/reproduzir-k3dy.depois.saida.txt`): nenhuma sobreposição nos
  três cenários; a de baixo desce de 168 para 316 quando a de cima conclui.

### Aceitação no WhatsApp Web real (`evidence/aceitacao-whatsapp-real.md`)

Quatro áudios recebidos consecutivos, medidos no print do usuário por colunas de pixels: janelas de
119,5, 242, 119,5 e 119,5 px, empilhadas com vãos de 7,5 a 8 px e sem cruzamento; a primeira com o topo
alinhado ao balão e folga lateral de 8 a 10 px. Com o código anterior, a terceira cobriria 74 px da
segunda.

### Veredito de spec: `spec-correta`

RF-05, RF-07 e a seção 8 de `janela-flutuante.md` já definiam o certo; os adendos 003 e 006 não tratam de
altura nem de colisão. Veredito escolhido por iago, registrado às 18:03.

### Fora desta correção

- Janela cortada na borda inferior da área da conversa: bug próprio, por decisão do usuário, a registrar
  com `/reversa-debugger`. Com a altura real, a pilha ficou mais longa e o corte, mais frequente (cinco
  janelas terminam em y = 978 numa tela de 806 na reprodução).
- Seta do RF-05 ausente, achada na aceitação: candidato a bug próprio (ver Agent Notes).

## Agent Notes

- O posicionador em si parece correto para as alturas que recebe; a correção provável fica no gerenciador, que precisa informar a altura renderizada de cada janela. A altura só é conhecida depois de o conteúdo ser escrito no DOM, o que pede cuidado com a ordem entre `atualizarConteudoJanela` e `recalcularPosicoes`.
- Taxonomia vazia: proposta de termos `area: extensao`, `module: janela-flutuante`.
- Fix (2026-10-02), achados e restrições para os próximos:
  1. **Corte na borda inferior** (candidato do A4MZ, decisão do usuário de registrar como bug próprio):
     spec-gap (OQ-01 aberta); a correção deve usar a altura desenhada que este bug introduziu.
  2. **Seta do RF-05 ausente**: a spec pede uma seta ligando a janela deslocada ao balão de origem (RF-05 e
     seção 8); o script de conteúdo e a folha de estilos não têm seta. No WhatsApp real, as janelas
     deslocadas ficaram 32, 187 e 219 px abaixo dos seus balões, sem ligação visual. Candidato no contexto
     `janela-flutuante`.
  3. **Borda fora das medidas da spec**: a janela desenhada tem 322 × até 242 px (borda de 1 px fora dos
     320 × 240 do CSS, `box-sizing: content-box`). A altura medida já inclui a borda; a largura do cálculo
     segue 320.
  4. **Crescimento sem mudança de estado** (por exemplo, "Falha ao copiar" quebrando a linha do rodapé)
     só é absorvido no recálculo seguinte; um `ResizeObserver` fica como evolução, se aparecer na prática.
  5. **RNF-02**: o recálculo, chamado por âncora a cada quadro de rolagem, passou a ler `offsetHeight`,
     sempre antes das escritas. Sem medição automática do RNF-02.
  6. **XDL5**: na aceitação, três áudios já transcritos antes falharam com `FALHA_NA_TRANSCRICAO` após
     0 s, com a extensão e a aba recarregadas (relato do usuário; ordem entre a recarga e as transcrições
     anteriores não confirmada). Dado para o diagnóstico do BUG-20261002-XDL5.
