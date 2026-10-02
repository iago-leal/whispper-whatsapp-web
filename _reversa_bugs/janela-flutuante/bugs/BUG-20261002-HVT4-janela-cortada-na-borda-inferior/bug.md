---
schema_version: 1
id: BUG-20261002-HVT4
display_number: 11
title: "Janela flutuante cortada na borda inferior: o posicionador não tem limite vertical"
status: resolved
phase: null
severity: high
priority: P1
created: 2026-10-02
updated: 2026-10-02T19:40-03:00

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [janela-flutuante, posicionamento, spec-gap]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "4/4 no Chrome for Testing com o gerenciador e a folha de estilos reais, na geometria do WhatsApp real (evidence/reproduction.md); medido também no WhatsApp Web real na aceitação do A4MZ (73 px abaixo da tela)"
  suspected_triggers:
    - "áudio no pé da conversa: a janela começa no topo do balão e desce além da área das mensagens (confirmado: 137 px além do fim das mensagens com texto longo, 34 px com erro)"
    - "pilha de janelas deslocadas por colisão (EC-05), mais longa desde a altura real do K3DY (confirmado: a quinta de cinco termina 186 px além do fim das mensagens)"
  capsule: evidence/reproduction.md

regression_analysis:
  last_known_good: null
  first_known_bad: bab1e53
  bisect: "não aplicável: o posicionador nunca teve borda vertical, desde a primeira implementação das janelas (bab1e53); o K3DY (58aa6db) só tornou as pilhas mais longas"
  culprit_commit: bab1e53

blocking: []
relationships:
  - bug: BUG-20261002-K3DY
    type: related-to
    state: supported
    evidence:
      - ref: ../BUG-20261002-K3DY-janelas-sobrepostas/evidence/reproduzir-k3dy.depois.saida.txt
        observation: "com a altura desenhada do K3DY, cinco janelas empilhadas terminam em y = 978 numa tela de 806: o mesmo calcularPosicoesJanelas que resolve a colisão vertical não limita o fim da pilha"

traceability:
  specs:
    - "_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/janela-flutuante.md#11-edge-cases-e-tratamento-de-erros"
    - "_reversa_sdd/sdd/janela-flutuante.md#14-open-questions"
  affected_code:
    - extension/src/content/posicionador-colisoes.ts
    - extension/src/content/gerenciador-janelas.ts
    - extension/src/adaptadores/adaptador-whatsapp-web.ts
  root_cause:
    state: confirmed
    hypothesis: "A área em que a janela deve caber só tem bordas horizontais. AdaptadorWhatsAppWeb.obterAreaConversa mede left e right do #main; o tipo FaixaHorizontal não tem topo nem fundo; calcularPosicoesJanelas põe o topo da janela no topo do balão, abaixo dele (RF-02) ou no fim da janela de cima (colisão) e nunca compara o fim da janela com uma borda inferior. A janela do áudio no pé da conversa, e o fim de uma pilha, descem sobre a caixa de escrita e além da tela."
    causal_path:
      - "adaptador-whatsapp-web.ts obterAreaConversa: devolve { esquerda: left, direita: right } do #main; a lista de mensagens (containerMensagens, já na configuração) não é medida"
      - "posicionador-colisoes.ts FaixaHorizontal e calcularPosicoesJanelas(requisicoes, direitaDaArea, esquerdaDaArea): sem parâmetro vertical"
      - "calcularPosicoesJanelas: y = ancora.y (lado), ancora.y + ancora.altura + 8 (RF-02) ou fim da janela de cima (colisão); nenhum limite a y + altura"
      - "gerenciador-janelas.ts recalcularPosicoes: aplica translate3d(x, y) sem conferir a altura da área"
    evidence:
      - ref: evidence/reproduction.md
        observation: "cenário 1: balão em y = 739, janela de texto longo de 739 a 981, 137 px além do fim das mensagens (844) e 74 px além da tela (907); a de erro, 34 px além do fim das mensagens"
      - ref: evidence/reproduction.md
        observation: "cenário 2: cinco áudios consecutivos, a quinta janela de 840 a 1030, 186 px além do fim das mensagens"
      - ref: ../BUG-20261002-A4MZ-janela-longe-do-balao/evidence/aceitacao-whatsapp-real.md
        observation: "no WhatsApp real, a mesma janela de 739 a 981 cobriu a caixa de escrita e perdeu 73 px abaixo da tela"
    code_refs:
      - { file: extension/src/adaptadores/adaptador-whatsapp-web.ts, symbol: "AdaptadorWhatsAppWeb.obterAreaConversa", commit: f047f87 }
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: "calcularPosicoesJanelas", commit: bab1e53 }
      - { file: extension/src/content/gerenciador-janelas.ts, symbol: "GerenciadorDeJanelas.recalcularPosicoes", commit: 58aa6db }
  reproduction_tests:
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas sobe a janela que passaria do fim da área das mensagens até terminar 8 px acima dele"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas sobe em bloco a pilha que passaria do fim da área, mantendo os vãos de 8 px"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas começa no topo da área a pilha mais alta que ela, sem sobreposição, e só o excesso passa do fim"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas oculta a janela do balão sob a caixa de escrita ou sob o cabeçalho, e começa no topo da área a do balão em parte sob o cabeçalho (RF-03)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas abre acima do balão, sem cobri-lo, a janela do modo abaixo (RF-02) que não cabe abaixo dele no pé da conversa"
    - "extension/test/janelas-no-navegador.test.ts › reprodução: a janela do último áudio, no pé da conversa, fica inteira na área das mensagens, com \"Copiar\" visível (critérios 1 e 2 do HVT4)"
    - "extension/test/janelas-no-navegador.test.ts › reprodução: quatro áudios no pé da conversa empilham-se dentro da área das mensagens, sem sobreposição (EC-05, RF-05)"
    - "extension/test/integracao-conversa.test.ts › reprodução: na geometria do WhatsApp real, a janela do último áudio da conversa fica inteira entre o cabeçalho e a caixa de escrita (critério 1 do HVT4)"
  regression_tests:
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas mantém no topo do balão a janela que cabe na área das mensagens (RF-01)"
    - "extension/test/janelas-no-navegador.test.ts › a janela nova aberta no pé da conversa entra na página já no lugar, sem deslizar (RF-01; lição do K3DY)"
    - "extension/test/janelas-no-navegador.test.ts › testes do K3DY (cinco janelas sem sobreposição, a de baixo desce quando a de cima cresce, empurrão pela altura desenhada, abertura sem deslize)"
    - "extension/test/integracao-conversa.test.ts › testes do IXWO, do A4MZ e da feature 006, agora na moldura vertical conferida no WhatsApp real (cabeçalho, lista rolável, caixa de escrita), entre eles o da rolagem (RF-03), o da geometria real (RF-01) e o da área de 600 px (RF-02)"

spec_verdict: spec-gap
spec_verdict_decision:
  decided_by: iago
  decided_at: "2026-10-02 19:33 -03"
  addendum: _reversa_sdd/addenda/bug-BUG-20261002-HVT4-v001.md
  addendum_text_approved: "2026-10-02 19:36 -03, por iago"
  evidence: "janela-flutuante.md não definia o limite vertical: a área da conversa do RF-01 só tinha bordas horizontais; a área visível do RF-03 não dizia qual era; o EC-05 trazia só uma proposta (aparecem por inteiro com a rolagem) sujeita à OQ-01, aberta. Os adendos 003 e 006 não tratam do caso. O adendo especifica pela primeira vez a área das mensagens como borda vertical, responde à OQ-01 (subir até caber) e o modo abaixo no pé da conversa."

change_risk:
  classification: média
  reasons:
    - "blast radius visual: posição de toda pilha que encosta no fundo da área, e visibilidade de toda janela, que passa a depender da área das mensagens"
    - "medida nova no adaptador a cada recálculo (ancestrais da lista com getComputedStyle e getBoundingClientRect), lida antes das escritas (RNF-02)"
    - "abertura: a posição da janela nova passa a depender da altura dela; sem guarda, ela deslizaria no segundo cálculo do abrir"
    - "página falsa dos testes de integração ganha cabeçalho, lista rolável e caixa de escrita, e todos os testes do IXWO, A4MZ e GAOZ passam a rodar nela"
    - "sem contrato externo, sem dados persistidos, sem concorrência nova; reversível por revert"

strategy:
  chosen: correção direta
  decided_by: iago
  decided_at: "2026-10-02 18:40 -03"
  scope_decisions:
    - "comportamento (spec-gap, OQ-01): subir até caber; a janela e a pilha acima dela sobem até terminar 8 px acima do fim da área das mensagens, nunca acima do topo; só a pilha mais alta que a área passa do fim"
    - "a janela se oculta quando o balão sai da área das mensagens (RF-03 lido contra a área), e não só da tela"
    - "plano único com o BUG-20261002-OW7G, HVT4 primeiro; gates conjuntos, aplicação em duas etapas"
    - "estrutura vertical lida no DOM real do WhatsApp Web antes do Gate 1 (só retângulos e data-testid)"
  plan: fix/plan.html
  plan_approved: "2026-10-02 18:45 -03, por iago"

change_set:
  - id: CHG-001
    kind: test
    artifact: extension/test/posicionador-colisoes.test.ts
    purpose: "unitários do limite vertical: subida da janela e da pilha, pilha mais alta que a área, RF-01 mantido, ocultação fora da área das mensagens, modo abaixo que abre acima no pé"
    diff: fix/CHG-001.diff
    applied: "2026-10-02 19:15 -03, Gate 1 aprovado (19:14)"
  - id: CHG-002
    kind: test
    artifact: extension/test/janelas-no-navegador.test.ts
    purpose: "navegador na geometria do WhatsApp real (1624 × 907, mensagens de 64 a 844): pé da conversa com Copiar visível, pilha no pé, guarda da abertura sem deslize"
    diff: fix/CHG-002.diff
    applied: "2026-10-02 19:15 -03, Gate 1 aprovado (19:14)"
  - id: CHG-003
    kind: test
    artifact: extension/test/integracao-conversa.test.ts
    purpose: "página falsa com a moldura vertical lida no DOM real (cabeçalho, lista rolável, caixa de escrita) em todos os testes; teste novo com a extensão montada: a janela do último áudio não cobre a caixa de escrita"
    diff: fix/CHG-003.diff
    applied: "2026-10-02 19:15 -03, Gate 1 aprovado (19:14)"
  - id: CHG-004
    kind: code
    artifact: extension/src/content/posicionador-colisoes.ts
    purpose: "FaixaVertical e AreaDaConversa; ocultação do balão fora da área das mensagens; modo abaixo que abre acima no pé; passadas de baixo para cima (limite) e de cima para baixo (piso)"
    diff: fix/CHG-004.diff
    applied: "2026-10-02 19:21 -03, Gate 2 aprovado (19:20), etapa 1"
  - id: CHG-005
    kind: code
    artifact: extension/src/content/gerenciador-janelas.ts
    purpose: "repassa topo e fundo ao posicionador; abrir com whispper-janela-entrando até o estilo fixar"
    diff: fix/CHG-005.diff
    applied: "2026-10-02 19:21 -03, Gate 2 aprovado (19:20), etapa 1"
  - id: CHG-006
    kind: code
    artifact: extension/src/content/janela-flutuante.css
    purpose: ".whispper-janela-entrando sem transição"
    diff: fix/CHG-006.diff
    applied: "2026-10-02 19:21 -03, Gate 2 aprovado (19:20), etapa 1"
  - id: CHG-007
    kind: code
    artifact: extension/src/adaptadores/adaptador-whatsapp-web.ts
    purpose: "obterAreaConversa devolve topo e fundo: interseção do #main, da tela e dos ancestrais da lista de mensagens que a recortam"
    diff: fix/CHG-007.diff
    applied: "2026-10-02 19:21 -03, Gate 2 aprovado (19:20), etapa 1"
  - id: CHG-008
    kind: documentation
    artifact: extension/src/content/JANELAS.md
    purpose: "passo 4 (modo abaixo no pé) e passo 5 (limite vertical) do algoritmo"
    diff: fix/CHG-008.diff
    applied: "2026-10-02 19:21 -03, Gate 2 aprovado (19:20), etapa 1"
  - id: CHG-009
    kind: specification
    artifact: _reversa_sdd/addenda/bug-BUG-20261002-HVT4-v001.md
    purpose: "adendo aditivo (spec-gap): área das mensagens como borda vertical; OQ-01 respondida, subir até caber; modo abaixo no pé da conversa; limite conhecido do modo abaixo com pilha"
    diff: null
    applied: "2026-10-02 19:36 -03, texto aprovado por iago"

closure:
  policy: local-software
  satisfied: true
  evidence:
    - evidence/gate1-vermelho.txt
    - evidence/gate2-etapa1-hvt4.txt
    - evidence/gate2-verde-suite.txt
    - evidence/gate2-typecheck.txt
    - evidence/testes-de-mutacao.md
    - evidence/aceitacao-whatsapp-real.md
resolution_kind: fixed
---

# Janela flutuante cortada na borda inferior: o posicionador não tem limite vertical

## Summary

A janela de um áudio perto do pé da conversa desce além da área das mensagens: cobre a caixa de escrita e, quando é alta, perde a parte de baixo, com o resumo e o botão "Copiar", abaixo da tela. Como a conversa já está no fim, rolar não a traz de volta.

## Expected Behavior

**spec-gap.** A spec não define o que fazer quando a janela não cabe abaixo do ponto em que abriria:

- `janela-flutuante.md` RF-01: a janela abre ao lado do balão, "no espaço livre da área da conversa", com o topo alinhado ao do balão. Não diz se a área limita também a altura.
- RF-05: desloca para baixo a janela que colidir, mantendo uma seta até o balão.
- EC-05 (colisão em cadeia): "as que passarem da borda inferior aparecem por inteiro com a rolagem (proposta sujeita à OQ-01)". Vale só para a cadeia, e a rolagem não ajuda no fim da conversa.
- OQ-01 (aberta): aceitar o corte e exibir com a rolagem, ou agrupar áudios consecutivos numa janela.

A pergunta "é bug ou nunca foi especificado?" fica aberta para o `/reversa-debugger-fix`, que deve propor o comportamento (por exemplo, subir a janela até caber na área das mensagens, preservando a ligação ao balão) para decisão do usuário.

## Actual Behavior

- WhatsApp Web real, aceitação do A4MZ: a janela do áudio recebido foi de y = 739 a 981 (242 px). A área das mensagens termina em y = 844 e a tela em 907: a janela cobriu a caixa de escrita e perdeu 73 px abaixo da tela.
- Navegador de teste, reprodução do K3DY depois da correção (tela de 806 px): cinco janelas empilhadas, a última de y = 849 a 978, com 172 px abaixo da tela.

## Steps to Reproduce

1. No WhatsApp Web real, abrir uma conversa cujo último item seja um áudio, rolada até o fim.
2. Transcrever esse áudio, de preferência um com texto longo (janela no limite de 240 px).
3. Observar a borda inferior da janela em relação à caixa de escrita e ao fim da tela.
4. Variante da cadeia: transcrever três a cinco áudios consecutivos próximos do fim, para as janelas se empilharem.

## Evidence

- `../BUG-20261002-A4MZ-janela-longe-do-balao/evidence/aceitacao-whatsapp-real.md`, "Achados fora do escopo", item 1: medidas no WhatsApp real.
- `../BUG-20261002-K3DY-janelas-sobrepostas/evidence/reproduzir-k3dy.depois.saida.txt`, cenário 1: a pilha de cinco janelas até y = 978.
- Relato: `../../intake/relato-20261002-1818.md`.

## Suspected Area

- `extension/src/content/posicionador-colisoes.ts`: `calcularPosicoesJanelas` só recebe as bordas horizontais da área (`direitaDaArea`, `esquerdaDaArea`); não há borda inferior, e nem o modo abaixo do balão (RF-02) nem a colisão limitam o `y`.
- `extension/src/adaptadores/adaptador-whatsapp-web.ts`: `obterAreaConversa` devolve só `esquerda` e `direita` do `#main` (`FaixaHorizontal`); a borda inferior da lista de mensagens (`containerMensagens`, já na configuração) não é medida.
- `extension/src/content/gerenciador-janelas.ts`: repassa a área ao posicionador; mudar a forma dela passa por aqui.

## Acceptance Criteria

1. A janela de um áudio no pé da conversa não cobre a caixa de escrita nem passa da tela: fica inteira dentro da área das mensagens, com o comportamento decidido no fix.
2. Na janela no limite de 240 px aberta no último áudio, o rodapé ("Copiar" e o resumo) fica visível sem rolar a conversa.
3. Sem regressão do RF-01 (topo alinhado ao balão quando cabe), do RF-05/K3DY (nenhuma sobreposta) e do RF-03 (acompanha a rolagem).
4. Teste de navegador que falha com o posicionador sem limite vertical e passa com a correção.

## Traceability

| Tipo | Referência |
|---|---|
| Spec | `_reversa_sdd/sdd/janela-flutuante.md` RF-01, RF-05, EC-05, OQ-01 (`spec-gap`) |
| Código | `extension/src/content/posicionador-colisoes.ts` (`calcularPosicoesJanelas`), `extension/src/adaptadores/adaptador-whatsapp-web.ts` (`obterAreaConversa`), `extension/src/content/gerenciador-janelas.ts` |
| Testes existentes | `extension/test/janelas-no-navegador.test.ts` (K3DY) mede retângulos das janelas no navegador de teste; nenhum teste verifica a borda inferior |
| Relação | `related-to` BUG-20261002-K3DY (supported) |

## Resolution

**Encerrado em 2026-10-02 19:40 -03 · `resolution_kind: fixed` · closure `local-software` satisfeita.**

### Causa raiz (`confirmed`)

A área em que a janela deve caber só tinha bordas horizontais. `AdaptadorWhatsAppWeb.obterAreaConversa`
media `left` e `right` do `#main`, o tipo `FaixaHorizontal` não tinha topo nem fundo, e
`calcularPosicoesJanelas` punha a janela no topo do balão, abaixo dele (RF-02) ou no fim da janela de cima
(colisão), sem comparar o fim dela com borda inferior alguma. O defeito nasceu com o código (`bab1e53`); o
K3DY (`58aa6db`) só alongou as pilhas. Reprodução 4/4 (`evidence/reproduction.md`): a janela de texto
longo do último áudio terminava 137 px além do fim das mensagens, e a quinta janela de uma pilha, 186 px.

### Estratégia

Correção direta, em plano único com o BUG-20261002-OW7G (HVT4 primeiro), com o comportamento decidido pelo
usuário às 18:40: subir até caber. A estrutura vertical foi lida no WhatsApp Web real antes do Gate 1
(`evidence/estrutura-vertical-whatsapp-real.md`): a lista rola dentro de `conversation-panel-messages`, o
único ancestral que a recorta, do fim do cabeçalho ao começo da caixa de escrita. O adaptador intersecta o
`#main`, a tela e os ancestrais da lista que a recortam, sem depender de `data-testid`. O posicionador
ganha duas passadas depois da colisão: de baixo para cima, o limite em `fundo − 8`; de cima para baixo, o
piso no topo da área. A janela cujo balão sai da área das mensagens se oculta. Como a subida faz a posição
da janela nova depender da altura medida, o `abrir` a insere com a classe `whispper-janela-entrando`, que
suspende a transição até o estilo fixar (lição do K3DY).

### Correction Change Set

| CHG | Tipo | Artefato | Propósito | Diff |
|---|---|---|---|---|
| CHG-001 | test | `extension/test/posicionador-colisoes.test.ts` | Seis unitários do limite vertical | [CHG-001](fix/CHG-001.diff) |
| CHG-002 | test | `extension/test/janelas-no-navegador.test.ts` | Navegador na geometria do WhatsApp real: pé da conversa, pilha no pé, guarda da abertura | [CHG-002](fix/CHG-002.diff) |
| CHG-003 | test | `extension/test/integracao-conversa.test.ts` | Moldura vertical do DOM real em todos os testes; janela do último áudio fora da caixa de escrita | [CHG-003](fix/CHG-003.diff) |
| CHG-004 | code | `extension/src/content/posicionador-colisoes.ts` | Faixa vertical, ocultação, modo abaixo no pé, passadas de limite e de piso | [CHG-004](fix/CHG-004.diff) |
| CHG-005 | code | `extension/src/content/gerenciador-janelas.ts` | Repassa topo e fundo; abertura sem deslize | [CHG-005](fix/CHG-005.diff) |
| CHG-006 | code | `extension/src/content/janela-flutuante.css` | `.whispper-janela-entrando` sem transição | [CHG-006](fix/CHG-006.diff) |
| CHG-007 | code | `extension/src/adaptadores/adaptador-whatsapp-web.ts` | `obterAreaConversa` com topo e fundo da parte visível da lista | [CHG-007](fix/CHG-007.diff) |
| CHG-008 | documentation | `extension/src/content/JANELAS.md` | Passos 4 e 5 do algoritmo | [CHG-008](fix/CHG-008.diff) |
| CHG-009 | specification | `_reversa_sdd/addenda/bug-BUG-20261002-HVT4-v001.md` (novo) | Adendo aditivo do veredito `spec-gap` | [adendo](../../../../_reversa_sdd/addenda/bug-BUG-20261002-HVT4-v001.md) |

Sem reparo de dados: a janela vive só na aba, e o defeito não gravou estado.

### Diff do código e da spec

Spec: adendo aditivo `_reversa_sdd/addenda/bug-BUG-20261002-HVT4-v001.md` (CHG-009). Adição 1: a área das
mensagens é a borda vertical da área da conversa (RF-01) e a área visível do RF-03. Adição 2: a OQ-01 fica
respondida, a pilha sobe até caber, e a proposta do EC-05 deixa de valer. Adição 3: no pé da conversa, a
janela do modo abaixo (RF-02) abre acima do balão, se couber. Limite conhecido: o modo abaixo com pilha.

Código (núcleo dos CHG-004, 005 e 007; íntegra em `fix/`):

```diff
--- a/extension/src/content/posicionador-colisoes.ts
+++ b/extension/src/content/posicionador-colisoes.ts
+    const foraDaFaixa = !!req.ancora && !!faixaVertical &&
+      (req.ancora.y + req.ancora.altura <= faixaVertical.topo || req.ancora.y >= faixaVertical.fundo);
+  if (faixaVertical) conterNaFaixa(postas, faixaVertical);
+  for (const posta of postas) posta.resultado.y = Math.round(posta.y);
+function conterNaFaixa(postas: Posta[], { topo, fundo }: FaixaVertical): void {
+  for (let i = postas.length - 1; i >= 0; i--) { /* limite: fundo − 8 ou 8 px acima das de baixo que a cruzam */ }
+  for (let i = 0; i < postas.length; i++) { /* piso: topo ou 8 px abaixo das de cima que a cruzam */ }
+}
--- a/extension/src/content/gerenciador-janelas.ts
+++ b/extension/src/content/gerenciador-janelas.ts
+    el?.classList.add('whispper-janela-entrando');
     this.recalcularPosicoes(area);
     if (el) {
       this.garantirContainer()?.appendChild(el);
       this.recalcularPosicoes(area);
+      void getComputedStyle(el).transform;
+      el.classList.remove('whispper-janela-entrando');
     }
--- a/extension/src/adaptadores/adaptador-whatsapp-web.ts
+++ b/extension/src/adaptadores/adaptador-whatsapp-web.ts
+    const lista = painel.querySelector<HTMLElement>(CONFIGURACAO_ESTRUTURAS.seletores.containerMensagens);
+    for (let el = lista; el && el !== painel; el = el.parentElement) {
+      if (getComputedStyle(el).overflowY === 'visible') continue;
+      const recorte = el.getBoundingClientRect();
+      topo = Math.max(topo, recorte.top);
+      fundo = Math.min(fundo, recorte.bottom);
+    }
+    return { esquerda: left, direita: right, topo, fundo };
```

### Testes: vermelho → verde

- Gate 1 (aprovado às 19:14; `evidence/gate1-vermelho.txt`, conjunto com o OW7G): 42 testes nos três
  arquivos, 23 ok e 19 falhas (17 testes e 2 suítes). As 8 do HVT4: integração, "a janela cobre a caixa de
  escrita" (743 a 861, com a caixa em 843); navegador, a janela P de 739 a 981 e a pilha em 434, 581, 831 e
  978 contra 153, 300, 550 e 697; unitários, 739 contra 594, 815 contra 592 e o balão sob a caixa de escrita
  ainda visível. As regressões do RF-01 e da guarda da abertura passam. `typecheck`: 12 `TS2554`, porque o
  quarto parâmetro ainda não existia.
- Mutação (`evidence/testes-de-mutacao.md`): sem `whispper-janela-entrando`, a guarda da abertura falha.
- Gate 2 (aprovado às 19:20), etapa 1, só com o HVT4 (`evidence/gate2-etapa1-hvt4.txt`): 46 testes, 36
  ok; as 10 falhas são os 9 testes do OW7G e a suíte deles. Etapa 2, com o OW7G: `npm test` com 179
  testes, **177 ok, 0 falhas**, 2 pulados por opção; `npm run typecheck` limpo
  (`evidence/gate2-verde-suite.txt`, `evidence/gate2-typecheck.txt`). O código aplicado é idêntico byte a
  byte ao validado numa cópia isolada antes do Gate 1. Build: `evidence/build-aceitacao.txt`.

### Aceitação no WhatsApp Web real (`evidence/aceitacao-whatsapp-real.md`)

- Rodada 1 (página de cerca de 1299 px CSS; área da conversa de cerca de 715 px, modo abaixo; os três
  últimos áudios da conversa): as três janelas, de 730 a 1673 px do print, ficam entre o cabeçalho (cerca
  de 186) e a caixa de escrita (cerca de 1700), sem sobreposição; "Copiar" visível na janela com texto.
  Critérios 1 e 2 cumpridos.
- Rodada 2 (zoom a 100%, modo lateral): topo da janela alinhado ao do balão, janelas a 8 px e sem
  sobreposição. Critério 3 cumprido para RF-01 e RF-05; o RF-03 é provado pelos testes de rolagem.

### Veredito de spec: `spec-gap`

A spec não definia o limite vertical (RF-01, RF-03, EC-05 e OQ-01 de `janela-flutuante.md`; os adendos
003 e 006 não tratam do caso). Veredito escolhido por iago às 19:33; texto do adendo aprovado às 19:36.

### Fora desta correção

- **Modo abaixo com pilha** (rodada 1 da aceitação): a pilha que sobe para caber cobre os balões, inclusive
  o próprio, e a seta vertical do OW7G fica atrás das janelas. Antes, a pilha também cobria os balões
  seguintes, mas descia para fora da tela. Por decisão do usuário (19:27), fica para um bug novo, a
  registrar com `/reversa-debugger`, ligado a este e ao OW7G.
- Pilha mais alta que a área das mensagens: começa no topo, e só o excesso passa do fim (Adição 2 do
  adendo); a rolagem não o traz no fim da conversa. Não observado no WhatsApp real.

## Agent Notes

- Severidade `high` e prioridade `P1` escolhidas pelo usuário no registro (18:18).
- Registrado pela rota completa por decisão do usuário: é `spec-gap` com decisão de comportamento (OQ-01), e o posicionador já mudou em dois bugs no mesmo dia.
- Restrições herdadas do K3DY para a correção: a altura é a desenhada e lida antes das escritas; a janela nova recebe a posição antes de entrar na página (senão desliza do canto da tela); a colisão vale só entre janelas que se cruzam na horizontal; a guarda `janelas-no-navegador.test.ts` deve continuar verde.
- Interação com a seta do RF-05, registrada como BUG-20261002-OW7G às 18:21: subir uma janela para caber afasta o topo dela do balão; a ligação visual que a spec pede pesa mais aqui. Por decisão do usuário, os dois são corrigidos num plano único, o HVT4 primeiro.
- Taxonomia vazia: proposta de termos `area: extensao`, `module: janela-flutuante`.
- Fechamento (19:40): a cápsula, o plano, os diffs e as evidências do plano único com o OW7G ficam nesta
  pasta; a pasta do OW7G aponta para elas.
- Desvio do plano, decidido na aprovação do Gate 2 (19:20): sem regra de `prefers-reduced-motion` para a
  seta, porque a transição da janela também não tem; ver a Resolution do OW7G.
- O teste de rolagem do RF-03 da integração (`painel` rolável) passou na moldura nova só com o seletor do
  contêiner rolável trocado; o espaçador previsto acima das linhas não foi necessário.
