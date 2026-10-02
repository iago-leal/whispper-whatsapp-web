---
schema_version: 1
id: BUG-20261002-A4MZ
display_number: 7
title: "Janela flutuante abre longe do balão, sobre a lista de conversas"
status: resolved
phase: null
severity: high
priority: P1
created: 2026-10-02
updated: 2026-10-02T16:59-03:00

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
  rate: "3/3 no Chrome for Testing com a geometria do print (evidence/reproduction.md); conferido no WhatsApp Web real em 2026-10-02 (evidence/conferencia-whatsapp-real.md)"
  suspected_triggers:
    - "âncora medida num elemento mais largo que o balão (confirmado: conv-msg[data-id] da largura do #main)"
    - "direção da mensagem não informada à janela (refutado como causa: com a âncora da linha, as duas direções dão o mesmo x)"
  capsule: evidence/reproduction.md

regression_analysis:
  last_known_good: null
  first_known_bad: bab1e53
  bisect: "não aplicável: o rastreador mede o elementoBalao e o posicionador mede o espaço contra a tela desde a primeira implementação (bab1e53); o IXWO só mascarava o defeito até a rolagem"
  culprit_commit: bab1e53

blocking: []
relationships:
  - bug: BUG-20261002-IXWO
    type: related-to
    state: confirmed
    evidence:
      - ref: ../BUG-20261002-IXWO-janela-invisivel/evidence/reproduction.md
        observation: "a reprodução do A4MZ depende do contorno do IXWO (rolar para a janela aparecer); os dois passam por GerenciadorDeJanelas.recalcularPosicoes"
      - ref: ../BUG-20261002-IXWO-janela-invisivel/evidence/experimento-causa-aba-visivel.saida.txt
        observation: "assim que a âncora chega, a janela vai para x = 12, à esquerda de um balão sem 320 px livres à direita: evidência parcial do mecanismo levantado no A4MZ, não da causa no WhatsApp real"
      - ref: evidence/reproduction.md
        observation: "com a correção do IXWO no ar, a âncora chega na abertura e leva a janela direto para x = 160: o IXWO mascarava o A4MZ, e os dois passam pela âncora lida em GerenciadorDeJanelas.recalcularPosicoes"
  - bug: BUG-20261002-K3DY
    type: related-to
    state: supported
    evidence:
      - ref: evidence/reproduction.md
        observation: "a janela do áudio enviado desce para y = 228 = 60 + 160 + 8: a colisão vertical usa a altura fixa de 160 px do K3DY; os dois defeitos vivem em calcularPosicoesJanelas, o A4MZ no eixo horizontal e o K3DY no vertical"

traceability:
  specs:
    - "_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais"
  affected_code:
    - extension/src/content/posicionador-colisoes.ts
    - extension/src/content/gerenciador-janelas.ts
    - extension/src/content/configuracao-estruturas.ts
    - extension/src/content/detector-mensagens.ts
    - extension/src/dominio/nucleo.ts
  root_cause:
    state: confirmed
    hypothesis: "A âncora mede a linha da mensagem (conv-msg[data-id]), que ocupa toda a largura da área da conversa, e não o balão visível (msg-container). Sem espaço à direita dessa âncora, o posicionador mede o espaço à esquerda contra a tela inteira, e não contra a área da conversa, e põe a janela sobre a lista de conversas."
    causal_path:
      - "detector-mensagens.ts baloesComVoz: voz.closest(balaoMensagem) devolve o conv-msg[data-id], que carrega o identificador (RF-04 da integração) e é guardado como elementoBalao"
      - "adaptador-whatsapp-web.ts registrarMensagem → RastreadorDeAncoras.registrar(idAudio, elementoBalao): obterAncora mede o conv-msg, 1073 de 1073 px do #main no WhatsApp real; configuracao-estruturas.ts não tem seletor para o contorno visível do balão"
      - "posicionador-colisoes.ts calcularPosicoesJanelas: espacoDireita = larguraDaTela − (ancora.x + ancora.largura + 8) < 320; espacoEsquerda = ancora.x − 8 conta a lista de conversas como espaço livre"
      - "o ramo do espaço à esquerda põe a janela em ancora.x − 320 − 8: 160 no print (tela de 1316) e 223 na conferência (tela de 1624), sobre a lista de conversas"
    evidence:
      - ref: evidence/reproduction.md
        observation: "3/3 com a janela em x 160 a 482, sobre #side (0 a 488), para o recebido e o enviado; o mesmo x do print"
      - ref: evidence/conferencia-whatsapp-real.md
        observation: "no WhatsApp real, conv-msg[data-id] vai de 551 a 1624 (toda a área da conversa) nas cinco mensagens de voz; o balão visível é o msg-container, de 336 px"
      - ref: evidence/conferencia-whatsapp-real.md
        observation: "a direção não é causa: com a âncora da linha, o ramo enviado dá o mesmo x (551 − 328 = 223); com a âncora no balão e o espaço medido no #main, as duas mensagens ficam junto ao balão mesmo com a direção lida como recebido"
    code_refs:
      - { file: extension/src/content/rastreador-ancora.ts, symbol: "RastreadorDeAncoras.obterAncora", commit: bab1e53 }
      - { file: extension/src/content/configuracao-estruturas.ts, symbol: "CONFIGURACAO_ESTRUTURAS.seletores", commit: bab1e53 }
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: "calcularPosicoesJanelas", commit: bab1e53 }
      - { file: extension/src/content/gerenciador-janelas.ts, symbol: "GerenciadorDeJanelas.recalcularPosicoes", commit: bab1e53 }
  reproduction_tests:
    - "extension/test/integracao-conversa.test.ts › reprodução: na geometria do WhatsApp real, a janela abre ao lado do balão visível, dentro da área da conversa: à direita do recebido e à esquerda do enviado (RF-01 da janela)"
  regression_tests:
    - "extension/test/integracao-conversa.test.ts › com a área da conversa reduzida a 600 px, a janela abre abaixo do balão, sem cobri-lo nem cobrir a lista de conversas (RF-02 da janela)"
    - "extension/test/posicionador-colisoes.test.ts › calcularPosicoesJanelas mede o espaço lateral dentro da área da conversa e, sem ele, abre abaixo do balão"
    - "extension/test/gerenciador-janelas.test.ts › GerenciadorDeJanelas lê a área da conversa ao abrir, antes de a janela existir"
    - "extension/test/integracao-conversa.test.ts › testes do IXWO (abertura sem rolagem e rolagem), agora medidos contra o balão visível"

spec_verdict: spec-correta
spec_verdict_decision:
  decided_by: iago
  decided_at: "2026-10-02, registrado às 16:55 -03"
  evidence: "RF-01 de janela-flutuante.md já pedia a janela ao lado do balão, no espaço livre da área da conversa, a 8 px e com os topos alinhados; RF-02, abaixo do balão sem espaço lateral; RF-10 de integracao-whatsapp-web.md, a âncora como retângulo da mensagem na tela. Os adendos 002 e 003 não tratam de posicionamento. O código divergiu ao medir a linha e a tela inteira."

change_risk:
  classification: baixa
  reasons:
    - "blast radius: só o script de conteúdo (configuração, rastreador, posicionador, gerenciador, adaptador e composição em index.ts); portas de domínio e núcleo intocados"
    - "sem contrato externo, sem dados persistidos, sem concorrência nova: a medida do balão e da área é síncrona, no mesmo cálculo de posição"
    - "dependência nova da estrutura do WhatsApp (data-testid=msg-container), isolada no módulo de configuração, com recuo para a medida atual se o seletor deixar de casar"
    - "reversível por revert de um commit"

change_set:
  - id: CHG-001
    kind: test
    artifact: extension/test/suporte/navegador-cdp.ts
    purpose: "Pagina.definirTamanho(largura, altura): tela fixa para medir a geometria do print e a área de 600 px"
    diff: fix/CHG-001.diff
  - id: CHG-002
    kind: test
    artifact: extension/test/integracao-conversa.test.ts
    purpose: "página com a geometria real; lerJanela mede o balão visível e se a janela cobre a lista; reprodução (recebido à direita, enviado à esquerda) e regressão do RF-02 (área de 600 px)"
    diff: fix/CHG-002.diff
  - id: CHG-003
    kind: test
    artifact: extension/test/posicionador-colisoes.test.ts
    purpose: "regressão unitária: espaço lateral medido dentro da área da conversa; sem ele, abaixo do balão"
    diff: fix/CHG-003.diff
  - id: CHG-004
    kind: test
    artifact: extension/test/gerenciador-janelas.test.ts
    purpose: "regressão unitária: a abertura lê a área da conversa uma vez, antes de a janela existir"
    diff: fix/CHG-004.diff
  - id: CHG-005
    kind: configuration
    artifact: extension/src/content/configuracao-estruturas.ts
    purpose: "seletor contornoBalao ([data-testid=\"msg-container\"]); versão 1.2.0, verificada em 2026-10-02"
    diff: fix/CHG-005.diff
  - id: CHG-006
    kind: code
    artifact: extension/src/content/rastreador-ancora.ts
    purpose: "obterAncora mede o contorno visível dentro do balão, com recuo ao balão"
    diff: fix/CHG-006.diff
  - id: CHG-007
    kind: code
    artifact: extension/src/content/posicionador-colisoes.ts
    purpose: "FaixaHorizontal; esquerdaDaArea (padrão 0) no espaço à esquerda e no recuo da posição abaixo"
    diff: fix/CHG-007.diff
  - id: CHG-008
    kind: code
    artifact: extension/src/content/gerenciador-janelas.ts
    purpose: "fonte da área da conversa no construtor; abrir a lê antes de criar a janela; recalcularPosicoes a repassa ao posicionador"
    diff: fix/CHG-008.diff
  - id: CHG-009
    kind: code
    artifact: extension/src/adaptadores/adaptador-whatsapp-web.ts
    purpose: "obterAreaConversa(): bordas horizontais do containerConversa, ou null sem conversa aberta"
    diff: fix/CHG-009.diff
  - id: CHG-010
    kind: code
    artifact: extension/src/content/index.ts
    purpose: "liga o gerenciador a adaptador.obterAreaConversa"
    diff: fix/CHG-010.diff

closure:
  policy: local-software
  satisfied: true
  evidence:
    - evidence/gate2-verde-suite.txt
    - evidence/gate2-typecheck.txt
    - evidence/aceitacao-whatsapp-real.md
resolution_kind: fixed
---

# Janela flutuante abre longe do balão, sobre a lista de conversas

## Summary

Quando a janela finalmente aparece (depois da rolagem, ver BUG-20261002-IXWO), ela não fica ao lado do balão de voz: abre à esquerda, sobre a lista de conversas, fora do painel da conversa. O usuário precisa procurar o texto longe do áudio de origem, e a janela cobre a lista de conversas.

## Expected Behavior

- `janela-flutuante.md` RF-01: a janela abre ao lado do balão, no espaço livre da área da conversa: à direita dos áudios recebidos e à esquerda dos enviados, com 8 px entre a janela e o balão e os topos alinhados (tolerância de 4 px).
- `janela-flutuante.md` RF-02: sem espaço lateral suficiente, a janela abre sobreposta à conversa, imediatamente abaixo do balão e sem cobri-lo.
- `integracao-whatsapp-web.md` RF-05 e RF-10: a integração emite o pedido com a direção (recebido ou enviado) e fornece a âncora de cada mensagem.

## Actual Behavior

No print do usuário (WhatsApp Web real, tela de 1316 px de largura), as duas janelas estão à esquerda, sobre a lista de conversas, com x de cerca de 160 a 480 px, enquanto os balões de voz estão no painel da conversa, com x de cerca de 550 a 885 px.

## Steps to Reproduce

1. No WhatsApp Web real, com a extensão do build de 2026-10-02, clicar no ícone de transcrição de uma ou mais mensagens de voz.
2. Rolar a conversa para a janela aparecer (contorno do BUG-20261002-IXWO).
3. Observar a posição da janela em relação ao balão.

## Evidence

- `evidence/janelas-longe-do-balao-e-sobrepostas-desfocado.png`: versão desfocada do print do usuário. As janelas ocupam a faixa da lista de conversas; os balões ficam à direita delas.
- Print original fora do repositório, por mostrar conversas e texto transcrito.
- Relato bruto: `../../intake/relato-20261002-1223.md`, Problema 2.

## Suspected Area

- `extension/src/dominio/nucleo.ts`: `processarSolicitacao` chama `this.exibicao.abrir(idAudio)` sem direção; `GerenciadorDeJanelas.abrir` assume `recebido`.
- `extension/src/content/configuracao-estruturas.ts`: o seletor `balaoMensagem` é `'[data-id], div[role="row"]'`, e `detector-mensagens.ts` (`baloesComVoz`) sobe do elemento de voz ao ancestral mais próximo que casa com ele. Se esse ancestral for a linha inteira da conversa, e não o balão, a âncora tem a largura do painel.
- `extension/src/content/posicionador-colisoes.ts`: com uma âncora da largura do painel, falta espaço à direita, e a regra cai no ramo "espaço à esquerda", que põe a janela a `ancora.x - largura - 8`. Com o painel começando por volta de x = 488 e a janela de 320 px, o resultado seria x ≈ 160, o que bate com o print. Hipótese não verificada no WhatsApp real.

## Acceptance Criteria

1. Num áudio recebido, a janela abre à direita do balão, a 8 px dele, com os topos alinhados (tolerância de 4 px), dentro do painel da conversa.
2. Num áudio enviado, a janela abre à esquerda do balão, nas mesmas condições.
3. Com o painel da conversa reduzido a 600 px, a janela abre abaixo do balão sem cobri-lo (RF-02).
4. Em nenhum caso a janela cobre a lista de conversas.
5. A âncora usada mede o balão da mensagem de voz, conferida por teste com a estrutura real registrada no módulo de configuração.

## Traceability

| Tipo | Referência |
|---|---|
| Spec | `_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais` (RF-01, RF-02) |
| Spec | `_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais` (RF-05, RF-10) |
| Código | `extension/src/content/posicionador-colisoes.ts`, `gerenciador-janelas.ts`, `configuracao-estruturas.ts`, `detector-mensagens.ts`; `extension/src/dominio/nucleo.ts` |
| Testes existentes | `extension/test/posicionador-colisoes.test.ts` cobre o posicionador com âncoras sintéticas do tamanho de um balão; nenhum teste cobre a medida da âncora nem a direção vinda do núcleo |
| Testes novos | reprodução e regressão do RF-02 em `extension/test/integracao-conversa.test.ts`; regressões unitárias em `posicionador-colisoes.test.ts` e `gerenciador-janelas.test.ts` |
| Relação | `related-to` BUG-20261002-IXWO (confirmed); `related-to` BUG-20261002-K3DY (supported) |

## Resolution

**Encerrado em 2026-10-02 16:59 -03 · `resolution_kind: fixed` · closure `local-software` satisfeita.**

### Causa raiz (`confirmed`)

Duas falhas encadeadas, ambas necessárias para o sintoma:

1. **A âncora media a linha, não o balão.** `baloesComVoz` sobe do player ao `conv-msg[data-id]`, que
   carrega o identificador e vira `elementoBalao`; o `RastreadorDeAncoras` media esse elemento. No
   WhatsApp real ele ocupa toda a área da conversa (x 551 a 1624, 1073 de 1073 px), e o balão visível é
   o `[data-testid="msg-container"]`, de 336 px. A configuração não tinha seletor para ele.
2. **O espaço lateral era medido contra a tela.** Sem espaço à direita da linha, `calcularPosicoesJanelas`
   media o espaço à esquerda a partir de x = 0, contando a lista de conversas, e punha a janela em
   `ancora.x − 320 − 8`: 160 no print, 223 na conferência real.

A direção não informada foi refutada como causa: com a âncora da linha, as duas direções dão o mesmo
x. Nascida em `bab1e53`; o IXWO mascarava o defeito até a rolagem, e o `git bisect` não se aplicava.
Evidências: `evidence/reproduction.md` (3/3, x = 160 com a geometria do print) e
`evidence/conferencia-whatsapp-real.md` (medida da âncora no WhatsApp real, só estrutura).

### Estratégia

Correção direta, escolhida pelo usuário. A âncora passa a medir o contorno visível do balão, por um
seletor novo no módulo de configuração, buscado a cada medida e com recuo à medida antiga; o
posicionador mede o espaço lateral entre as bordas da área da conversa, que o adaptador fornece e o
gerenciador recebe por função injetada, como já recebia a âncora. Na abertura, a área é lida antes de
a janela entrar na página: a revisão 1 do plano a lia depois, e a validação numa cópia isolada mostrou
a janela deslizando do canto da tela (`junto: null`, janela em x = 0 no meio da transição). O plano foi
revisto (`fix/plan.html`, revisão 2) e ganhou o CHG-004 para proteger essa ordem.

### Correction Change Set

| CHG | Tipo | Artefato | Propósito | Diff |
|---|---|---|---|---|
| CHG-001 | test | `extension/test/suporte/navegador-cdp.ts` | `Pagina.definirTamanho(largura, altura)` | [CHG-001](fix/CHG-001.diff) |
| CHG-002 | test | `extension/test/integracao-conversa.test.ts` | Geometria real; `lerJanela` contra o balão visível; reprodução e regressão do RF-02 | [CHG-002](fix/CHG-002.diff) |
| CHG-003 | test | `extension/test/posicionador-colisoes.test.ts` | Regressão unitária do espaço lateral dentro da área | [CHG-003](fix/CHG-003.diff) |
| CHG-004 | test | `extension/test/gerenciador-janelas.test.ts` | Regressão unitária: área lida uma vez, antes de a janela existir | [CHG-004](fix/CHG-004.diff) |
| CHG-005 | configuration | `extension/src/content/configuracao-estruturas.ts` | Seletor `contornoBalao`; versão 1.2.0 | [CHG-005](fix/CHG-005.diff) |
| CHG-006 | code | `extension/src/content/rastreador-ancora.ts` | Âncora no contorno visível, com recuo ao balão | [CHG-006](fix/CHG-006.diff) |
| CHG-007 | code | `extension/src/content/posicionador-colisoes.ts` | `FaixaHorizontal` e `esquerdaDaArea` | [CHG-007](fix/CHG-007.diff) |
| CHG-008 | code | `extension/src/content/gerenciador-janelas.ts` | Fonte da área no construtor; leitura antes de criar a janela | [CHG-008](fix/CHG-008.diff) |
| CHG-009 | code | `extension/src/adaptadores/adaptador-whatsapp-web.ts` | `obterAreaConversa()` | [CHG-009](fix/CHG-009.diff) |
| CHG-010 | code | `extension/src/content/index.ts` | Liga o gerenciador a `adaptador.obterAreaConversa` | [CHG-010](fix/CHG-010.diff) |

Sem reparo de dados: a janela vive só na aba, e o defeito não gravou estado.

### Diff do código e da spec

Spec: **sem alteração** (veredito `spec-correta`). Código (núcleo dos CHG-005 a CHG-008; íntegra em `fix/`):

```diff
--- a/extension/src/content/configuracao-estruturas.ts
+++ b/extension/src/content/configuracao-estruturas.ts
+    contornoBalao: '[data-testid="msg-container"]',
--- a/extension/src/content/rastreador-ancora.ts
+++ b/extension/src/content/rastreador-ancora.ts
-    return calcularCoordenadasAncora(idAudio, el);
+    const contorno = el.querySelector<HTMLElement>(CONFIGURACAO_ESTRUTURAS.seletores.contornoBalao);
+    return calcularCoordenadasAncora(idAudio, contorno ?? el);
--- a/extension/src/content/posicionador-colisoes.ts
+++ b/extension/src/content/posicionador-colisoes.ts
-  larguraViewport: number = typeof window !== 'undefined' ? window.innerWidth : 1200
+  direitaDaArea: number = typeof window !== 'undefined' ? window.innerWidth : 1200,
+  esquerdaDaArea: number = 0
-    const espacoEsquerda = ancora.x - GAP;
+    const espacoEsquerda = ancora.x - GAP - esquerdaDaArea;
-      x = Math.max(GAP, Math.min(ancora.x, larguraViewport - largura - GAP));
+      x = Math.max(esquerdaDaArea + GAP, Math.min(ancora.x, direitaDaArea - largura - GAP));
--- a/extension/src/content/gerenciador-janelas.ts
+++ b/extension/src/content/gerenciador-janelas.ts
     const ancoraAtual = ancora ?? this.obterAncora(idAudio) ?? undefined;
+    const area = this.obterAreaConversa();
-    this.recalcularPosicoes();
+    this.recalcularPosicoes(area);
-  recalcularPosicoes(): void {
+  recalcularPosicoes(area: FaixaHorizontal | null = this.obterAreaConversa()): void {
-    const posicoes = calcularPosicoesJanelas(requisicoes);
+    const posicoes = calcularPosicoesJanelas(requisicoes, area?.direita, area?.esquerda);
```

### Testes: vermelho → verde

- Gate 1 (aprovado às 16:40; saída em `evidence/gate1-vermelho.txt`): nos três arquivos, 20 testes, 13
  ok e 7 falhas. A reprodução falhou com `junto: null, cobreLista: true`; a regressão do RF-02 também;
  o unitário do posicionador deu x = 222 contra 550; o do gerenciador, nenhuma leitura de área. Os dois
  testes do IXWO, agora medidos contra o balão visível, falharam porque a janela se alinhava à linha.
- Gate 2 (aprovado às 16:41): `npm test` com 153 testes, **151 ok, 0 falhas**, 2 pulados por opção
  (`WHISPPER_E2E=1`, `MOTOR_REAL=1`); `npm run typecheck` limpo; `npm run build` ok. Saídas em
  `evidence/gate2-verde-suite.txt`, `evidence/gate2-typecheck.txt` e `evidence/build-aceitacao.txt`.
- Script de reprodução depois da correção (3/3 idênticas, `evidence/reproduzir-a4mz.depois.saida.txt`):
  recebido a 8 px à direita, enviado à esquerda, nenhuma sobre a lista.
- Mutação orgânica: a revisão 1, com a área lida depois de a janela entrar na página, fez a reprodução
  e os testes do IXWO falharem; os testes protegem também a ordem da leitura.

### Aceitação no WhatsApp Web real (`evidence/aceitacao-whatsapp-real.md`)

Às 16:51 e 16:57, no build de 16:45: a janela do recebido abriu 8 px à direita do balão e a do
enviado 6 px à esquerda (borda de 1 px fora dos 320 px do cálculo), topos alinhados, ambas dentro da
área da conversa e nenhuma sobre a lista. O critério 3 (área de 600 px) ficou coberto pelo teste de
navegador.

### Veredito de spec: `spec-correta`

RF-01 e RF-02 de `janela-flutuante.md` e RF-10 de `integracao-whatsapp-web.md` já definiam o certo; os
adendos 002 e 003 não tratam de posicionamento. Veredito escolhido por iago, registrado às 16:55.

### Fora desta correção

- Janela cortada na borda inferior da conversa (posicionador sem limite vertical; anterior a esta
  correção): bug próprio por decisão do usuário, relacionado ao K3DY, a registrar com `/reversa-debugger`.
- Sobreposição real de 17 px entre as janelas do enviado e do recebido: evidência do K3DY.
- Direção lida sempre como `recebido` e ícone ausente numa mensagem marcada: candidatos a bug no
  contexto `integracao-whatsapp-web` (ver Agent Notes).

## Agent Notes

- O defeito já constava como pendente antes deste registro: nas Agent Notes do BUG-20261001-2MOY ("texto de erro e âncora da janela flutuante") e na memória do projeto.
- A conta do Suspected Area é hipótese; confirmar medindo a âncora no WhatsApp real sem ler o conteúdo das mensagens, como no precedente do BUG-20261001-GAOZ.
- Taxonomia vazia: proposta de termos `area: extensao`, `module: janela-flutuante`.
- Fix (2026-10-02): candidatos a bug próprio achados na investigação, ainda sem registro:
  1. Janela cortada na borda inferior da área da conversa: o posicionador não tem limite vertical; no
     WhatsApp real, a janela de 242 px aberta a 105 px do fim da área cobriu a caixa de escrita e perdeu
     73 px abaixo da tela. A spec não diz o que fazer quando a janela não cabe (spec-gap); o RF-05 já
     admite deslocar a janela mantendo a seta até o balão. Registrar no contexto `janela-flutuante`,
     `related-to` K3DY, e corrigir junto com ele, que vai passar a usar a altura real.
  2. Direção sempre `recebido`: o detector procura a classe `message-out` e o ícone `msg-dblcheck`,
     ausentes no DOM atual, e o núcleo abre a janela sem direção. Depois desta correção a posição não
     depende disso, mas os contadores anônimos por direção ficam distorcidos. O único sinal estrutural
     comum achado foi o alinhamento do pai do `msg-container` (`flex-end` no enviado).
  3. Ícone ausente numa mensagem de voz marcada como injetada (hipótese: a página redesenhou o
     conteúdo do balão e a marca recusa a nova injeção).
- A colisão vertical age também entre janelas de lados opostos do balão, que não se sobrepõem na
  horizontal; o K3DY deve tratar a altura real e a sobreposição só quando as janelas se cruzam.
- A janela desenhada tem 322 px (borda de 1 px fora dos 320 px do CSS), e o cálculo usa 320.
