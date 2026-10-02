---
schema_version: 1
id: BUG-20261002-IXWO
display_number: 6
title: "Janela flutuante fica invisível até a página rolar: a âncora só chega em scroll ou resize"
status: resolved
phase: null
severity: critical
priority: P0
created: 2026-10-02
updated: 2026-10-02T16:05-03:00

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [janela-flutuante, posicionamento, cronometro]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "3/3 no navegador de teste em 2026-10-02 (aba em segundo plano) e 1/1 com a aba em primeiro plano; todas as transcrições dos dois vídeos do usuário no WhatsApp Web real"
  suspected_triggers: []
  capsule: evidence/reproduction.md

regression_analysis:
  last_known_good: null
  first_known_bad: bab1e53
  bisect: "não aplicável: GerenciadorDeJanelas.abrir registra a janela sem âncora desde a primeira implementação (bab1e53); a feature 006 não tocou esse caminho"
  culprit_commit: bab1e53

change_risk:
  classification: baixa
  reasons:
    - "blast radius: só o script de conteúdo (gerenciador, adaptador e composição em index.ts); porta de domínio ExibicaoDeTranscricao e núcleo intocados"
    - "sem contrato externo, sem dados persistidos, sem concorrência nova: a leitura da âncora é síncrona, no mesmo clique"
    - "reversível por revert de um commit"
    - "efeito colateral esperado: a janela passa a aparecer na hora, inclusive na posição errada do BUG-20261002-A4MZ e sobreposta como no BUG-20261002-K3DY, que deixam de depender da rolagem para serem vistos"

blocking: []
relationships: []

traceability:
  specs:
    - "_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/janela-flutuante.md#7-requisitos-não-funcionais"
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais"
    - "_reversa_sdd/addenda/006-cronometro-transcricao.md"
  affected_code:
    - extension/src/content/gerenciador-janelas.ts
    - extension/src/content/rastreador-ancora.ts
    - extension/src/content/posicionador-colisoes.ts
    - extension/src/content/index.ts
    - extension/src/dominio/nucleo.ts
  root_cause:
    state: confirmed
    hypothesis: "A janela nasce sem âncora e nada a entrega depois do clique: o rastreador só empurra a âncora no registro da mensagem (antes de a janela existir, e o gerenciador ignora âncora de janela inexistente) e em scroll/resize. Sem âncora, o posicionador marca a janela como invisível."
    causal_path:
      - "NucleoDeTranscricao.processarSolicitacao chama exibicao.abrir(idAudio): a porta não leva âncora, por desenho"
      - "GerenciadorDeJanelas.abrir grava o registro com ancora: undefined; ninguém consulta RastreadorDeAncoras.obterAncora"
      - "recalcularPosicoes → calcularPosicoesJanelas devolve visivel: false para requisição sem âncora → classe whispper-janela-oculta (opacidade 0), sem transform"
      - "RastreadorDeAncoras.registrar notificou no momento da detecção da mensagem; GerenciadorDeJanelas.atualizarAncora descartou, porque a janela ainda não existia"
      - "a próxima notificação só vem de scroll ou resize; sem rolagem, a janela fica oculta em todos os estados, inclusive concluído e erro"
    evidence:
      - ref: evidence/reproduction.md
        observation: "3/3 com a janela oculta e sem transform 150 ms e 3 s após o clique"
      - ref: evidence/experimento-causa-aba-visivel.saida.txt
        observation: "com a aba visível, a janela segue oculta; um resize real, sem outra mudança, a exibe com translate3d(12px, 120px, 0px): o insumo que faltava era só a âncora"
      - ref: evidence/desempenho-motor-20261002-1222.tsv
        observation: "no WhatsApp real as transcrições terminaram ok; o texto existia e a janela não aparecia"
    code_refs:
      - { file: extension/src/content/gerenciador-janelas.ts, symbol: "GerenciadorDeJanelas.abrir", commit: bab1e53 }
      - { file: extension/src/content/rastreador-ancora.ts, symbol: "RastreadorDeAncoras.registrar / handlerScroll", commit: bab1e53 }
      - { file: extension/src/content/posicionador-colisoes.ts, symbol: "calcularPosicoesJanelas", commit: bab1e53 }
  reproduction_tests:
    - "extension/test/integracao-conversa.test.ts › reprodução: sem rolagem, a janela fica visível junto ao balão em até 150 ms do clique e mostra o erro quando o ícone o indica (RF-01, RF-06 e RNF-01 da janela)"
  regression_tests:
    - "extension/test/integracao-conversa.test.ts › rolar a conversa leva a janela junto, oculta-a com o balão fora da tela e a reexibe com o mesmo texto ao voltar (RF-03 da janela)"
    - "extension/test/gerenciador-janelas.test.ts › GerenciadorDeJanelas lê a âncora da mensagem ao abrir, antes de a janela existir"

spec_verdict: spec-correta
spec_verdict_decision:
  decided_by: iago
  decided_at: "2026-10-02, registrado às 15:56 -03"
  evidence: "RF-01, RF-03, RF-06 e RNF-01 de janela-flutuante.md e RF-10 de integracao-whatsapp-web.md já definiam a abertura junto ao balão em ≤ 150 ms e o fornecimento da âncora; os adendos 003 e 006 não tratam de âncora nem de abertura. O código divergiu ao depender só das notificações de rolagem."

change_set:
  - id: CHG-001
    kind: test
    artifact: extension/test/suporte/navegador-cdp.ts
    purpose: "Pagina.trazerParaFrente(): aba em primeiro plano, sem a qual a página não dispara scroll nem resize"
    diff: fix/CHG-001.diff
  - id: CHG-002
    kind: test
    artifact: extension/test/integracao-conversa.test.ts
    purpose: "reprodução no navegador (visível sem rolagem, ≤ 150 ms, erro visível quando o ícone o indica) e regressão da rolagem (RF-03)"
    diff: fix/CHG-002.diff
  - id: CHG-003
    kind: test
    artifact: extension/test/gerenciador-janelas.test.ts
    purpose: "regressão unitária: a abertura lê a âncora antes de a janela existir; âncora explícita prevalece"
    diff: fix/CHG-003.diff
  - id: CHG-004
    kind: code
    artifact: extension/src/adaptadores/adaptador-whatsapp-web.ts
    purpose: "obterAncora(idAudio) público, delegando ao rastreador de âncoras"
    diff: fix/CHG-004.diff
  - id: CHG-005
    kind: code
    artifact: extension/src/content/gerenciador-janelas.ts
    purpose: "construtor recebe a fonte de âncoras; abrir lê a âncora antes de criar a janela quando o pedido não traz uma"
    diff: fix/CHG-005.diff
  - id: CHG-006
    kind: code
    artifact: extension/src/content/index.ts
    purpose: "liga o gerenciador a adaptador.obterAncora"
    diff: fix/CHG-006.diff

closure:
  policy: local-software
  satisfied: true
  evidence:
    - evidence/gate2-verde-suite.txt
    - evidence/gate2-typecheck.txt
    - evidence/aceitacao-whatsapp-real.md
resolution_kind: fixed
---

# Janela flutuante fica invisível até a página rolar: a âncora só chega em scroll ou resize

## Summary

Ao clicar no ícone de transcrição, a janela flutuante é criada, mas permanece invisível (opacidade 0) até que o usuário role a conversa ou redimensione a janela do navegador. O texto transcrito, os estados de espera e as mensagens de erro ficam ocultos. O usuário só descobriu a rolagem por acaso: "não sabia que precisava rolar. isso é ruim".

Como o contador do ícone para no instante em que o texto é escrito na janela, e a janela só aparece na rolagem seguinte, o defeito também faz o cronômetro parecer errado: para o usuário, o tempo que importa vai até o texto ficar visível.

## Expected Behavior

- `janela-flutuante.md` RF-01: a janela abre, quando o núcleo solicitar, ao lado do balão do áudio.
- `janela-flutuante.md` RF-06: a janela exibe o estado informado pelo núcleo (fila, transcrevendo com tempo, texto concluído ou erro com "Tentar de novo").
- `janela-flutuante.md` RNF-01: no máximo 150 ms do pedido do núcleo à janela visível.
- `integracao-whatsapp-web.md` RF-10: a integração fornece à janela a âncora de cada mensagem e a notifica quando a posição ou a visibilidade mudar.
- Adendo `006-cronometro-transcricao` (RF-05 da feature): na conclusão, o cronômetro para e a janela exibe, junto ao texto, o tempo total de espera. Isso pressupõe que o texto esteja visível quando o cronômetro para.

## Actual Behavior

- A janela nasce com a classe `whispper-janela-oculta` (opacidade 0, sem eventos de ponteiro) e sem `transform`, e continua assim enquanto a página não rola.
- No WhatsApp Web real, o contador do ícone vai de "0 s" a "5 s", o ícone fica verde (concluído) e nenhuma janela aparece durante os 60 s do vídeo. O motor registrou as duas transcrições como `ok` (30,1 s de áudio em 6,6 s; 13,3 s em 2,3 s).
- Ao rolar a conversa logo depois de o cronômetro parar, a janela aparece com o texto e o resumo ("Transcrito em 2,4 s", "6,7 s"), valores coerentes com o tempo de processamento do motor.
- O estado de erro também fica invisível: no navegador de teste, "Erro: MOTOR_INDISPONIVEL / Falhou após 0 s" ficou oculto. No WhatsApp real, isso escondeu do usuário as falhas do BUG-20261002-XDL5.

## Steps to Reproduce

1. Carregar a extensão com o build de 2026-10-02 (commits `6b4869a`, `69163fa`, `25a57bb`) e abrir uma conversa com mensagem de voz no WhatsApp Web, sem rolar a página depois do carregamento.
2. Clicar no ícone de transcrição de uma mensagem de voz.
3. Esperar o ícone indicar concluído ou erro, sem rolar nem redimensionar.
4. Observar: nenhuma janela visível. A janela existe no DOM com `whispper-janela-oculta`.
5. Rolar a conversa: a janela aparece.

Reprodução automatizada: `evidence/diagnostico-clique-navegador-de-teste.ts` (Chrome for Testing com a página falsa do WhatsApp, pelo suporte `test/suporte/navegador-cdp.ts`).

## Evidence

- `evidence/contador-ate-conclusao-sem-janela.png`: recorte do segundo vídeo do usuário, um quadro por segundo, só a região do ícone. O contador sobe de "0 s" a "5 s", o ícone fica verde e nenhuma janela aparece.
- `evidence/desempenho-motor-20261002-1222.tsv`: registro do motor; às 12:18:03 e 12:18:44 de 2026-10-02 as transcrições terminaram `ok`. O texto existia; a janela não estava visível.
- `evidence/diagnostico-clique-navegador-de-teste.ts`: script de diagnóstico. Após o clique, a janela está no DOM, oculta, sem `transform`, e segue oculta 3 s depois.
- Vídeos originais, fora do repositório por mostrarem conversas e contatos: `~/Desktop/Gravação de Tela 2026-10-02 às 11.55.29.mov` e `~/Desktop/Gravação de Tela 2026-10-02 às 12.17.53.mov`.
- Relato bruto: `../../intake/relato-20261002-1223.md`, Problema 1.

## Suspected Area

- `extension/src/content/gerenciador-janelas.ts`: `abrir(idAudio, direcao, ancora?)` registra a janela sem âncora quando ninguém a fornece.
- `extension/src/content/posicionador-colisoes.ts`: `calcularPosicoesJanelas` marca como invisível toda requisição sem âncora ou com âncora invisível.
- `extension/src/content/rastreador-ancora.ts`: `RastreadorDeAncoras` notifica só em `registrar` (quando a mensagem é detectada, antes de a janela existir) e em `scroll`/`resize`. `obterAncora` existe, mas ninguém a consulta ao abrir a janela.
- `extension/src/content/index.ts`: `janelas.atualizarAncora(ancora)` repassa a notificação, que o gerenciador ignora para janela inexistente.
- `extension/src/dominio/nucleo.ts`: `processarSolicitacao` chama `this.exibicao.abrir(idAudio)` sem direção nem âncora.

## Acceptance Criteria

1. Sem nenhuma rolagem ou redimensionamento, a janela fica visível ao lado do balão em até 150 ms do pedido do núcleo (RNF-01), medido por marcação de tempo no navegador de teste.
2. Os quatro estados (fila, transcrevendo, concluído e erro) ficam visíveis sem rolagem, inclusive o erro que acontece em menos de 1 s.
3. O contador do ícone para no mesmo instante em que o texto da transcrição fica visível na janela: não existe intervalo em que o ícone indica concluído e o texto ainda não está na tela.
4. Rolar a conversa continua acompanhando o balão, ocultando a janela fora da área visível e reexibindo-a ao voltar (RF-03 da janela, sem regressão).
5. Teste de navegador que falha no código atual e passa com a correção.

## Traceability

| Tipo | Referência |
|---|---|
| Spec | `_reversa_sdd/sdd/janela-flutuante.md#61-requisitos-principais` (RF-01, RF-06) |
| Spec | `_reversa_sdd/sdd/janela-flutuante.md#7-requisitos-não-funcionais` (RNF-01) |
| Spec | `_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais` (RF-10) |
| Adendo | `_reversa_sdd/addenda/006-cronometro-transcricao.md` (RF-05 da feature) |
| Código | `extension/src/content/gerenciador-janelas.ts`, `rastreador-ancora.ts`, `posicionador-colisoes.ts`, `index.ts`; `extension/src/dominio/nucleo.ts` |
| Testes existentes | `extension/test/gerenciador-janelas.test.ts` e `posicionador-colisoes.test.ts` cobrem a janela e o posicionador com âncora fornecida; nenhum cobre a abertura sem rolagem |

## Resolution

**Encerrado em 2026-10-02 16:05 -03 · `resolution_kind: fixed` · closure `local-software` satisfeita.**

### Causa raiz (`confirmed`)

A janela nascia sem âncora, e nada a entregava depois do clique. `GerenciadorDeJanelas.abrir` gravava
o registro com `ancora: undefined`, e `calcularPosicoesJanelas` marca como invisível toda janela sem
âncora. O `RastreadorDeAncoras` só empurra a âncora no registro da mensagem, antes de a janela existir
(o gerenciador a descartava), e em `scroll`/`resize`; `obterAncora` existia, mas ninguém o consultava.
Sem rolagem, a janela ficava oculta em todos os estados. Nascida em `bab1e53`; a feature 006 não tocou
o caminho, e o `git bisect` não se aplicava.

A prova fechou o caminho causal com a aba de teste em primeiro plano (`evidence/reproduction.md`): a
janela segue oculta após o clique, e um `resize` real, sem nenhuma outra mudança, a exibe. A aba aberta
pelo protocolo DevTools nasce em segundo plano e não dispara `scroll` nem `resize`, o que tornava
ambíguo o diagnóstico do registro.

### Estratégia

Correção direta, escolhida pelo usuário; escopo restrito ao IXWO, com a ordem IXWO → A4MZ → K3DY
registrada no plano (`fix/plan.html`). O gerenciador lê a âncora corrente ao abrir, por uma função
injetada no construtor e ligada ao rastreador em `index.ts`. A leitura vem antes de a janela entrar na
página: depois, a medição do balão calcularia o estilo da janela ainda sem posição, e a transição do
`transform` a faria deslizar do canto da tela. Porta `ExibicaoDeTranscricao`, núcleo, rastreador e
posicionador ficaram intactos.

### Correction Change Set

| CHG | Tipo | Artefato | Propósito | Diff |
|---|---|---|---|---|
| CHG-001 | test | `extension/test/suporte/navegador-cdp.ts` | `Pagina.trazerParaFrente()`: aba em primeiro plano, sem a qual a página não dispara `scroll` nem `resize` | [CHG-001](fix/CHG-001.diff) |
| CHG-002 | test | `extension/test/integracao-conversa.test.ts` | Reprodução no navegador e regressão da rolagem (RF-03) | [CHG-002](fix/CHG-002.diff) |
| CHG-003 | test | `extension/test/gerenciador-janelas.test.ts` | Regressão unitária: a abertura lê a âncora antes de a janela existir | [CHG-003](fix/CHG-003.diff) |
| CHG-004 | code | `extension/src/adaptadores/adaptador-whatsapp-web.ts` | `obterAncora(idAudio)` público, delegando ao rastreador | [CHG-004](fix/CHG-004.diff) |
| CHG-005 | code | `extension/src/content/gerenciador-janelas.ts` | Fonte de âncoras no construtor; `abrir` a consulta antes de criar a janela | [CHG-005](fix/CHG-005.diff) |
| CHG-006 | code | `extension/src/content/index.ts` | Liga o gerenciador a `adaptador.obterAncora` | [CHG-006](fix/CHG-006.diff) |

Sem reparo de dados: a janela vive só na aba, e o defeito não gravou estado.

### Diff do código e da spec

Spec: **sem alteração** (veredito `spec-correta`). Código (núcleo dos CHG-004 a CHG-006):

```diff
--- a/extension/src/adaptadores/adaptador-whatsapp-web.ts
+++ b/extension/src/adaptadores/adaptador-whatsapp-web.ts
+  /**
+   * Retângulo e visibilidade atuais do balão da mensagem, ou null se ela não foi detectada.
+   */
+  obterAncora(idAudio: string): CoordenadasAncora | null {
+    return this.rastreadorAncoras.obterAncora(idAudio);
+  }
--- a/extension/src/content/gerenciador-janelas.ts
+++ b/extension/src/content/gerenciador-janelas.ts
-  constructor(cronometro: CronometroDeEspera = new CronometroDeEspera()) {
+  private readonly obterAncora: (idAudio: string) => CoordenadasAncora | null;
+
+  // A âncora só é notificada na rolagem e no redimensionamento; a abertura a lê de obterAncora, senão
+  // a janela nasce oculta até a primeira rolagem (BUG-20261002-IXWO).
+  constructor(
+    cronometro: CronometroDeEspera = new CronometroDeEspera(),
+    obterAncora: (idAudio: string) => CoordenadasAncora | null = () => null
+  ) {
     this.cronometro = cronometro;
+    this.obterAncora = obterAncora;
@@ abrir
+    // Lida antes de a janela entrar na página: depois, a medição do balão calcularia o estilo da
+    // janela ainda sem posição, e a transição do transform a faria deslizar do canto da tela
+    const ancoraAtual = ancora ?? this.obterAncora(idAudio) ?? undefined;
@@
-      ancora
+      ancora: ancoraAtual
--- a/extension/src/content/index.ts
+++ b/extension/src/content/index.ts
-export const janelas = new GerenciadorDeJanelas(cronometro);
+// A janela lê a âncora do balão ao abrir; daí em diante, a rolagem a atualiza pelo aoMudarAncora
+export const janelas = new GerenciadorDeJanelas(cronometro, (idAudio) => adaptador.obterAncora(idAudio));
```

### Testes: vermelho → verde

- Gate 1 (aprovado às 15:45; saída em `evidence/gate1-vermelho.txt`): nos dois arquivos, 13 testes, 10
  ok e 2 falhas pelo defeito, mais o teste-pai do navegador. A reprodução falhou com "a janela não
  ficou visível sem rolagem", com `visivel: false` de 1 ms ao erro; o unitário, sem nenhuma leitura de
  âncora. A regressão da rolagem passou, como guarda.
- Gate 2 (aprovado às 15:48): `npm test` com 149 testes, **147 ok, 0 falhas**, 2 pulados por opção
  (`WHISPPER_E2E=1`, `MOTOR_REAL=1`); `npm run typecheck` limpo; `npm run build` ok. Saídas em
  `evidence/gate2-verde-suite.txt`, `evidence/gate2-typecheck.txt` e `evidence/build-aceitacao.txt`.
- Mutação, numa cópia isolada: forçar o cálculo de estilo com a janela já inserida faz a reprodução
  falhar com `junto: null` (a janela desliza do canto). O teste protege também a ordem da leitura.

### Aceitação no WhatsApp Web real (`evidence/aceitacao-whatsapp-real.md`)

Às 16:03, no build das 15:56: sem rolar, a janela apareceu na hora com o contador (a); o texto surgiu
no instante em que o ícone ficou verde (b); a rolagem levou a janela junto, ocultou-a e a reexibiu
com o mesmo texto (c). Cobre o estado concluído, que o navegador de teste não alcança.

### Veredito de spec: `spec-correta`

RF-01, RF-03, RF-06 e RNF-01 de `janela-flutuante.md` e RF-10 de `integracao-whatsapp-web.md` já
definiam a abertura junto ao balão em até 150 ms e o fornecimento da âncora; os adendos vigentes não
tratam do assunto. Veredito escolhido por iago, registrado às 15:56.

### Fora desta correção

- BUG-20261002-A4MZ (posição longe do balão) e BUG-20261002-K3DY (sobreposição): relações promovidas a
  `supported`; a janela agora aparece na hora, ainda sujeita a esses dois defeitos.
- Âncora defasada por mudança de layout sem `scroll` (reação, mensagem expandida acima): a janela fica
  visível, talvez deslocada, até a próxima rolagem. Não relatado.

## Agent Notes

- A medição do cronômetro está correta e não deve ser alterada como se fosse o defeito: os tempos exibidos batem com o processamento do motor. A queixa "o cronômetro deveria contar até a transcrição aparecer na tela" é consequência deste bug e fica coberta pelo critério 3.
- O teste `extension/test/integracao-conversa.test.ts` da feature 006 verifica o ícone, mas não a visibilidade da janela; por isso o defeito passou pelo coding e pelo sync.
- A causa provável é a mesma do posicionamento errado (BUG-20261002-A4MZ) e da sobreposição (BUG-20261002-K3DY): os três vivem no par gerenciador e posicionador. O corretor deve avaliar se tratá-los juntos reduz risco, sem misturar os registros.
- Taxonomia vazia (`taxonomy.yaml` sem termos): proposta de termos `area: extensao`, `module: janela-flutuante`.
- Vídeos e print originais contêm conversas reais: não copiar para o repositório; usar só recortes ou versões desfocadas.
