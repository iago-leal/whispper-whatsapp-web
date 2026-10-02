---
schema_version: 1
id: BUG-20261002-OW7G
display_number: 12
title: "Janela deslocada sem a seta até o balão de origem (RF-05)"
status: resolved
phase: null
severity: medium
priority: P1
created: 2026-10-02
updated: 2026-10-02T19:40-03:00

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
  rate: "4/4 no Chrome for Testing com o gerenciador e a folha de estilos reais, na geometria da aceitação do K3DY (evidence/reproduction.md); observado também no WhatsApp Web real (aceitação do K3DY)"
  suspected_triggers:
    - "janela deslocada por colisão (RF-05): qualquer pilha de janelas de áudios próximos (confirmado: três de quatro deslocadas, 52, 207 e 259 px abaixo dos balões, nenhuma ligação)"
    - "deslocamentos maiores desde a altura real do K3DY"
  capsule: evidence/reproduction.md

regression_analysis:
  last_known_good: null
  first_known_bad: bab1e53
  bisect: "não aplicável: a seta nunca existiu; deslocadaPorColisao nasceu sem consumidor no primeiro commit das janelas (bab1e53)"
  culprit_commit: bab1e53

blocking: []
relationships:
  - bug: BUG-20261002-K3DY
    type: related-to
    state: supported
    evidence:
      - ref: ../BUG-20261002-K3DY-janelas-sobrepostas/evidence/aceitacao-whatsapp-real.md
        observation: "na aceitação do K3DY, as janelas 2, 3 e 4 ficaram 32, 187 e 219 px abaixo dos seus balões, sem ligação visual; com a altura real, os deslocamentos da colisão cresceram e a falta da seta ficou visível"
  - bug: BUG-20261002-HVT4
    type: related-to
    state: supported
    evidence:
      - ref: ../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/reproduction.md
        observation: "os dois defeitos nascem no mesmo par calcularPosicoesJanelas → recalcularPosicoes: o posicionador decide onde a janela fica sem borda vertical (HVT4) e devolve o deslocamento que o gerenciador descarta (OW7G); na pilha do cenário 2, a mesma colisão que leva a quinta janela além da tela afasta as de baixo dos balões"

traceability:
  specs:
    - "_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/janela-flutuante.md#8-design-e-interface"
  affected_code:
    - extension/src/content/janela-elemento.ts
    - extension/src/content/janela-flutuante.css
    - extension/src/content/gerenciador-janelas.ts
    - extension/src/content/posicionador-colisoes.ts
  root_cause:
    state: confirmed
    hypothesis: "A seta do RF-05 nunca foi implementada. O posicionador sabe que a janela saiu do lado do balão (deslocadaPorColisao) e devolve a âncora e a posição final, que bastam para desenhar a ligação; o gerenciador aplica só o translate3d da janela e descarta o resto; a janela e a folha de estilos não têm elemento, classe nem pseudoelemento de seta."
    causal_path:
      - "posicionador-colisoes.ts calcularPosicoesJanelas: calcula deslocadaPorColisao e não devolve geometria de ligação"
      - "gerenciador-janelas.ts recalcularPosicoes: lê só visivel, x e y de cada PosicaoCalculada; nenhum consumidor de deslocadaPorColisao"
      - "janela-elemento.ts criarElementoJanela e janela-flutuante.css: cabeçalho, corpo, rodapé e anúncio; nenhuma seta"
      - "a janela deslocada fica 52 a 259 px abaixo do seu balão, ao lado de balões de outros áudios ou de nenhum"
    evidence:
      - ref: evidence/reproduction.md
        observation: "cenário 3: S2, S3 e S4 com deslocadaPorColisao true, 52, 207 e 259 px abaixo dos balões, sem elemento além das janelas no container, sem filho de seta e sem pseudoelemento com conteúdo"
      - ref: ../BUG-20261002-K3DY-janelas-sobrepostas/evidence/aceitacao-whatsapp-real.md
        observation: "no WhatsApp real, as janelas 2, 3 e 4 ficaram 32, 187 e 219 px abaixo dos balões, sem ligação visual"
      - ref: "git log -S deslocadaPorColisao -- extension/src"
        observation: "o campo só aparece em bab1e53; a palavra seta não ocorre em extension/src"
    code_refs:
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: "calcularPosicoesJanelas (deslocadaPorColisao)", commit: bab1e53 }
      - { file: extension/src/content/gerenciador-janelas.ts, symbol: "GerenciadorDeJanelas.recalcularPosicoes", commit: 58aa6db }
      - { file: extension/src/content/janela-elemento.ts, symbol: "criarElementoJanela", commit: bab1e53 }
  reproduction_tests:
    - "extension/test/janelas-no-navegador.test.ts › reprodução: cinco áudios consecutivos resultam em cinco janelas, nenhuma sobreposta, cada seta apontando para o balão correto (critério do RF-05)"
    - "extension/test/janelas-no-navegador.test.ts › reprodução: na rolagem, cada seta acompanha o seu balão e a sua janela (RF-03, critério 1 do OW7G)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas liga por uma seta reta a janela à altura do seu balão, com a ponta na borda dele, no recebido e no enviado (RF-05, seção 8)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas liga a janela deslocada ao centro do seu balão por um cotovelo no corredor, saindo 10 px abaixo do topo da janela (RF-05)"
  regression_tests:
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas põe em trilhos distintos, sem cruzamento, os cotovelos que se sobrepõem, subindo ou descendo até o balão"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas liga por uma seta vertical a janela do modo abaixo (RF-02), abaixo ou acima do balão"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas não dá seta à janela oculta, e a seta da janela do balão em parte sob o cabeçalho mira a parte visível dele"
    - "extension/test/janelas-no-navegador.test.ts › a seta não rouba cliques e fica por trás das janelas (critério 3 do OW7G)"
    - "extension/test/janelas-no-navegador.test.ts › a seta da janela nova nasce no lugar, mesmo quando a altura medida a move, e fechar a janela leva a seta junto (OW7G)"

spec_verdict: spec-correta
spec_verdict_decision:
  decided_by: iago
  decided_at: "2026-10-02 19:33 -03"
  addendum: null
  evidence: "janela-flutuante.md RF-05 (Must) já pedia a seta que liga a janela deslocada ao balão de origem, com o critério 'cada seta apontando para o balão correto'; a seção 8 lista a 'seta de ligação ao balão' e o Decision Log, 'deslocamento vertical com seta'. O adendo 003 não a revoga. O código divergiu: a seta nunca foi implementada. O desenho (cotovelo no corredor) é detalhe de implementação, registrado em extension/src/content/JANELAS.md."

change_risk:
  classification: média
  reasons:
    - "elemento visual novo em toda janela visível, redesenhado a cada recálculo da rolagem (RNF-02), só com escritas"
    - "geometria de trilhos sem cruzamento num corredor de 8 px: legibilidade a conferir no WhatsApp real a partir do terceiro cotovelo sobreposto"
    - "transição de 120 ms do traçado (propriedade d do SVG), alinhada à da janela (evidence/experimento-transicao-da-seta.saida.txt)"
    - "sem contrato externo, sem dados persistidos; reversível por revert"

strategy:
  chosen: correção direta
  decided_by: iago
  decided_at: "2026-10-02 18:40 -03"
  scope_decisions:
    - "desenho: cotovelo no corredor de 8 px, ponta verde na borda do balão, seta reta quando o balão está à altura da janela, trilhos paralelos para cotovelos sobrepostos, por trás das janelas e sem roubar cliques; nenhuma janela muda de posição"
    - "plano único com o BUG-20261002-HVT4, que vem primeiro; a seta parte da posição final"
  plan: ../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/fix/plan.html
  plan_approved: "2026-10-02 18:45 -03, por iago"

change_set:
  - id: CHG-001
    kind: test
    artifact: extension/test/posicionador-colisoes.test.ts
    purpose: "unitários da seta: reta à altura do balão, cotovelo da janela deslocada, trilhos sem cruzamento, seta vertical do modo abaixo, sem seta na janela oculta e ponta na parte visível do balão"
    diff: fix/CHG-001.diff
    applied: "2026-10-02 19:15 -03, Gate 1 aprovado (19:14)"
  - id: CHG-002
    kind: test
    artifact: extension/test/janelas-no-navegador.test.ts
    purpose: "navegador: critério do RF-05 com cinco áudios, rolagem, seta atrás das janelas e sem cliques, nascimento no lugar e remoção ao fechar"
    diff: fix/CHG-002.diff
    applied: "2026-10-02 19:15 -03, Gate 1 aprovado (19:14)"
  - id: CHG-003
    kind: code
    artifact: extension/src/content/posicionador-colisoes.ts
    purpose: "SetaCalculada em cada posição visível (ponta, cauda, direção, trilho); distribuição dos trilhos sem cruzamento"
    diff: fix/CHG-003.diff
    applied: "2026-10-02 19:22 -03, Gate 2 aprovado (19:20), etapa 2"
  - id: CHG-004
    kind: code
    artifact: extension/src/content/gerenciador-janelas.ts
    purpose: "camada SVG atrás das janelas; desenho da seta só para a janela já na página, ocultação com a janela e remoção ao fechar"
    diff: fix/CHG-004.diff
    applied: "2026-10-02 19:22 -03, Gate 2 aprovado (19:20), etapa 2"
  - id: CHG-005
    kind: code
    artifact: extension/src/content/janela-flutuante.css
    purpose: "camada sem cliques, linha e ponta da seta; transição de 120 ms da propriedade d"
    diff: fix/CHG-005.diff
    applied: "2026-10-02 19:22 -03, Gate 2 aprovado (19:20), etapa 2"
  - id: CHG-006
    kind: documentation
    artifact: extension/src/content/JANELAS.md
    purpose: "passo 6 do algoritmo: a seta"
    diff: fix/CHG-006.diff
    applied: "2026-10-02 19:22 -03, Gate 2 aprovado (19:20), etapa 2"

closure:
  policy: local-software
  satisfied: true
  evidence:
    - ../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/gate1-vermelho.txt
    - ../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/gate2-etapa1-hvt4.txt
    - ../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/gate2-verde-suite.txt
    - ../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/gate2-typecheck.txt
    - ../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/testes-de-mutacao.md
    - ../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/aceitacao-whatsapp-real.md
resolution_kind: fixed
---

# Janela deslocada sem a seta até o balão de origem (RF-05)

## Summary

Quando várias janelas se abrem, as deslocadas pela colisão ficam abaixo dos seus balões sem nada que as ligue a eles. Uma janela pode ficar ao lado do balão de outro áudio, e o texto é facilmente atribuído ao áudio errado, sobretudo em grupos com remetentes diferentes.

## Expected Behavior

- `janela-flutuante.md` RF-05 (Must): várias janelas abertas, "deslocando para baixo a janela cuja posição ideal colidir com outra e mantendo uma seta que a liga ao balão de origem". Critério: "cinco áudios consecutivos de 3 s transcritos resultam em 5 janelas, nenhuma sobreposta, cada seta apontando para o balão correto".
- Seção 8: "A janela surge ao lado do balão, com uma seta apontando para ele"; entre os componentes afetados, "seta de ligação ao balão".
- Decision Log: "Colisão resolvida por deslocamento vertical com seta".
- Adendo 003: dá a colisão do RF-05 como implementada e não menciona a seta; não a revoga.

## Actual Behavior

No WhatsApp real (print da aceitação do K3DY, em px CSS), com quatro áudios recebidos consecutivos:

| Áudio | Balão (topo) | Janela (topo) | Abaixo do balão | Ao lado de |
|---|---|---|---|---|
| 1 | 149 | 149 | 0 | seu balão |
| 2 | 244 | 276 | 32 | fim do balão 2 e balões 3 e 4 |
| 3 | 339 | 526 | 187 | nenhum balão de voz |
| 4 | 434 | 653 | 219 | nenhum balão de voz |

Nenhuma janela tem seta ou outra ligação visual ao seu balão.

## Steps to Reproduce

1. No WhatsApp Web real, abrir uma conversa com três ou mais áudios consecutivos próximos.
2. Transcrever todos, em sequência.
3. Observar as janelas deslocadas: nenhuma mostra a que balão pertence.

## Evidence

- `../BUG-20261002-K3DY-janelas-sobrepostas/evidence/aceitacao-whatsapp-real.md`: medidas das quatro janelas e dos balões, e o achado 1.
- Relato: `../../intake/relato-20261002-1821.md`.

## Suspected Area

- `extension/src/content/janela-elemento.ts` e `janela-flutuante.css`: a janela não tem elemento nem pseudoelemento de seta.
- `extension/src/content/posicionador-colisoes.ts`: `calcularPosicoesJanelas` devolve `deslocadaPorColisao` para cada janela, mas nenhum consumidor lê o campo.
- `extension/src/content/gerenciador-janelas.ts`: `recalcularPosicoes` aplica só o `transform` da posição; tem a âncora e a posição final de cada janela, o que basta para desenhar a ligação, mas descarta o deslocamento.

## Acceptance Criteria

1. Toda janela deslocada do topo do seu balão mostra uma seta (ou ligação equivalente decidida no fix) que aponta para o balão de origem, e a ligação acompanha a rolagem (RF-03).
2. O critério do RF-05: cinco áudios consecutivos transcritos resultam em cinco janelas, nenhuma sobreposta, cada seta apontando para o balão correto.
3. A ligação não cobre o balão nem outra janela, e não rouba cliques da conversa.
4. Teste de navegador que falha sem a seta e passa com a correção.

## Traceability

| Tipo | Referência |
|---|---|
| Spec | `_reversa_sdd/sdd/janela-flutuante.md` RF-05 (Must), seção 8, Decision Log |
| Código | `extension/src/content/janela-elemento.ts`, `extension/src/content/janela-flutuante.css`, `extension/src/content/gerenciador-janelas.ts` (`recalcularPosicoes`), `extension/src/content/posicionador-colisoes.ts` (`deslocadaPorColisao`) |
| Testes existentes | `extension/test/janelas-no-navegador.test.ts` (K3DY) mede retângulos das janelas; nenhum teste verifica a ligação ao balão |
| Relações | `related-to` BUG-20261002-K3DY (supported); `related-to` BUG-20261002-HVT4 (supported) |

## Resolution

**Encerrado em 2026-10-02 19:40 -03 · `resolution_kind: fixed` · closure `local-software` satisfeita.**

O plano, as evidências dos gates e a aceitação são conjuntos com o BUG-20261002-HVT4 e ficam na pasta
dele (`../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/`); os diffs deste bug ficam em `fix/`, e `fix/plan.html` aponta para o plano.

### Causa raiz (`confirmed`)

A seta do RF-05 nunca foi implementada. O posicionador calculava `deslocadaPorColisao` e devolvia a
posição final, que bastam para desenhar a ligação, mas `GerenciadorDeJanelas.recalcularPosicoes` lia só
`visivel`, `x` e `y`; a janela e a folha de estilos não tinham elemento, classe nem pseudoelemento de seta.
O campo nasceu sem consumidor no primeiro commit das janelas (`bab1e53`). Reprodução 4/4
(`evidence/reproduction.md`): três de quatro janelas 52, 207 e 259 px abaixo dos balões, sem ligação.

### Estratégia

Correção direta, depois do HVT4, porque a seta parte da posição final. O desenho foi decidido pelo usuário
às 18:40: cotovelo no corredor de 8 px. O posicionador, puro, calcula a seta de cada janela visível. A
ponta fica na borda do balão voltada para a janela, à altura do centro da parte visível dele; a cauda, na
borda da janela, a 10 px dos cantos. A seta é reta quando o centro do balão cabe na lateral da janela e,
senão, faz cotovelo num trilho do corredor; no modo abaixo, é vertical. Cotovelos sobrepostos recebem
trilhos distintos, ordenados para não se cruzar. O gerenciador desenha cada seta numa camada SVG, primeira
filha do container e atrás das janelas, sem receber cliques, escrevendo o traçado pela propriedade CSS `d`
com a mesma transição de 120 ms da janela (experimento: `evidence/experimento-transicao-da-seta.saida.txt`).
A seta só é desenhada para a janela que já está na página, então a da janela nova nasce no lugar.

**Desvio do plano, aprovado no Gate 2 (19:20):** o plano previa a seta sem animação com
`prefers-reduced-motion`. A transição da janela não respeita essa preferência, e a regra só na seta a
faria saltar enquanto a janela desliza. Apresentadas três vias, a aprovação dos diffs como estavam fixou a
via (a): a seta anda junto com a janela, e as duas mantêm o comportamento atual.

### Correction Change Set

| CHG | Tipo | Artefato | Propósito | Diff |
|---|---|---|---|---|
| CHG-001 | test | `extension/test/posicionador-colisoes.test.ts` | Cinco unitários da geometria da seta e dos trilhos | [CHG-001](fix/CHG-001.diff) |
| CHG-002 | test | `extension/test/janelas-no-navegador.test.ts` | Navegador: critério do RF-05, rolagem, cliques e ciclo de vida da seta | [CHG-002](fix/CHG-002.diff) |
| CHG-003 | code | `extension/src/content/posicionador-colisoes.ts` | `SetaCalculada` em cada posição visível; trilhos sem cruzamento | [CHG-003](fix/CHG-003.diff) |
| CHG-004 | code | `extension/src/content/gerenciador-janelas.ts` | Camada SVG atrás das janelas; desenho, ocultação e remoção da seta | [CHG-004](fix/CHG-004.diff) |
| CHG-005 | code | `extension/src/content/janela-flutuante.css` | Camada, linha e ponta; transição de 120 ms do `d` | [CHG-005](fix/CHG-005.diff) |
| CHG-006 | documentation | `extension/src/content/JANELAS.md` | Passo 6 do algoritmo: a seta | [CHG-006](fix/CHG-006.diff) |

Sem reparo de dados: a seta vive só na aba.

### Diff do código e da spec

Spec: **sem alteração** (veredito `spec-correta`). Código (núcleo dos CHG-003 e CHG-004; íntegra em `fix/`):

```diff
--- a/extension/src/content/posicionador-colisoes.ts
+++ b/extension/src/content/posicionador-colisoes.ts
+export interface SetaCalculada {
+  direcao: 'esquerda' | 'direita' | 'acima' | 'abaixo';
+  pontaX: number; pontaY: number; caudaX: number; caudaY: number; trilho: number;
+}
+  seta: SetaCalculada | null;
+  for (const posta of postas) {
+    posta.resultado.y = Math.round(posta.y);
+    posta.resultado.seta = calcularSeta(posta, faixaVertical);
+  }
+  distribuirTrilhos(postas.map((posta) => posta.resultado.seta!));
+  // a vai mais perto do balão que b
+  const antes = (a: SetaCalculada, b: SetaCalculada) => dentro(a.pontaY, b) || dentro(b.caudaY, a);
--- a/extension/src/content/gerenciador-janelas.ts
+++ b/extension/src/content/gerenciador-janelas.ts
+        this.desenharSeta(reg, pos);
+  private desenharSeta(reg: RegistroJanela, pos: PosicaoCalculada): void {
+    if (!pos.visivel || !pos.seta) {
+      if (reg.seta) reg.seta.style.display = 'none';
+      return;
+    }
+    if (!reg.elemento?.isConnected) return;
+    grupo.querySelector<SVGPathElement>('.whispper-seta-linha')?.style.setProperty('d', `path("${tracadoDaLinha(pos.seta)}")`);
+    if (nova) this.garantirCamadaSetas()?.appendChild(grupo);
+    reg.seta?.remove();
```

### Testes: vermelho → verde

- Gate 1 (aprovado às 19:14; `../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/gate1-vermelho.txt`):
  as 9 falhas do OW7G. Navegador: "a janela S1 não tem seta visível" (`seta: null`), "a janela deslocada
  não tem cotovelo", a linha da janela nova inexistente. Unitários: `seta` indefinida em toda posição.
- Mutação (`../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/testes-de-mutacao.md`): com a
  seta desenhada antes de a janela entrar na página, a guarda do rascunho sobrevivia nos cenários em que a
  cauda não dependia da altura medida. O teste foi montado, antes do Gate 1, com L1 alta em 560 e L2 em
  600: a mutação o faz falhar (a cauda nasceria em 686 e deslizaria até 752).
- Gate 2 (aprovado às 19:20): na etapa 1, só com o HVT4, as 9 seguem vermelhas
  (`.../evidence/gate2-etapa1-hvt4.txt`); na etapa 2, `npm test` com 179 testes, **177 ok, 0 falhas**, 2
  pulados por opção; `npm run typecheck` limpo (`.../evidence/gate2-verde-suite.txt`,
  `.../evidence/gate2-typecheck.txt`).

### Aceitação no WhatsApp Web real (`../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/aceitacao-whatsapp-real.md`)

Rodada 2, modo lateral, zoom a 100%, dois áudios recebidos consecutivos, medidos no print por pixels
verdes: a janela alinhada ao balão tem seta reta, de x = 1977 (borda do balão) a 1991 (borda da janela),
à altura do centro do balão; a janela deslocada tem cotovelo, com a ponta no centro do seu balão (y =
1183), o trilho em x = 1986 a 1988 e a cauda 10 px CSS abaixo do topo da janela. As duas pontas tocam o
balão certo, e o traçado fica no corredor.

### Veredito de spec: `spec-correta`

O RF-05 (Must) já pedia "uma seta que a liga ao balão de origem", com o critério "cada seta apontando para
o balão correto", e a seção 8 lista a "seta de ligação ao balão". O desenho é detalhe de implementação,
registrado no `JANELAS.md`. Veredito escolhido por iago às 19:33.

### Fora desta correção

- **Modo abaixo com pilha** (rodada 1 da aceitação): a pilha que sobe para caber cobre os balões, e a seta
  vertical fica atrás das janelas. Bug novo a registrar com `/reversa-debugger`, ligado a este e ao HVT4,
  por decisão do usuário (19:27).
- Não conferidos no WhatsApp real, só no navegador de teste: a seta na rolagem e três ou mais cotovelos
  sobrepostos no mesmo corredor, onde as linhas se encostam (risco registrado no plano).

## Agent Notes

- Severidade `medium` e prioridade `P1` escolhidas pelo usuário no registro (18:21), com a decisão de corrigir num plano único com o HVT4: primeiro o HVT4 (onde a janela fica), depois a seta (como ela se liga ao balão a partir da posição final).
- A relação com o HVT4 é `proposed`: a correção do corte deve subir janelas para caber na área, o que também afasta o topo da janela do balão sem colisão; se isso se confirmar, a seta passa a servir aos dois deslocamentos.
- Provável veredito `spec-correta` (requisito Must nunca implementado), a confirmar no fix; o adendo 003 deu o RF-05 como entregue sem a seta.
- Restrições herdadas do K3DY: a janela nova recebe a posição antes de entrar na página; alturas lidas antes das escritas; a guarda `janelas-no-navegador.test.ts` deve continuar verde. A seta muda de lugar a cada rolagem e deve seguir a mesma ordem de leituras e escritas.
- Origem: achado na aceitação do K3DY e nota de outro agente, encaminhada pelo usuário.
- Taxonomia vazia: proposta de termos `area: extensao`, `module: janela-flutuante`.
- Fechamento (19:40): o plano, as evidências dos gates e a aceitação, conjuntos com o HVT4, ficam na pasta
  dele; aqui ficam a cápsula, o experimento da transição e os diffs CHG-001 a 006.
- A primeira nota se confirmou: a seta parte da posição final e serve aos dois deslocamentos, o da colisão
  (RF-05) e o da subida para caber (HVT4).
- Lacunas registradas para o próximo bug do modo abaixo com pilha: a seta vertical some quando a pilha cobre
  os balões; três ou mais cotovelos sobrepostos no mesmo corredor não foram vistos no WhatsApp real.
