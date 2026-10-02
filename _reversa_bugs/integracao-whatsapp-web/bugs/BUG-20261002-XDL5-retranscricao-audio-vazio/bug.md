---
schema_version: 1
id: BUG-20261002-XDL5
display_number: 9
title: "Transcrever de novo um áudio já transcrito falha: o motor recebe o áudio vazio"
status: resolved
phase: null
severity: high
priority: P1
created: 2026-10-02
updated: 2026-10-02T20:26-03:00

origin:
  type: manual-report
  external_ref: null

area: unclassified
module: unclassified
feature: unclassified
labels: [integracao-whatsapp-web, extracao-de-audio]

visibility: normal
security_suspected: false

reproduction:
  classification: deterministic
  rate: "3/3 no WhatsApp Web real, só leitura: o download da própria página devolve 0 bytes, em 2 ms, para os áudios cuja cópia no cache da página está vazia, e 24.574 bytes OggS para o íntegro; 31 das 283 entradas do lru-media-array-buffer-cache com 0 bytes (evidence/reproduction.md). A intermitência aparente do registro do motor era a mistura de áudios nunca obtidos pela ponte (sucesso) com os já obtidos por ela (falha)"
  suspected_triggers:
    - "qualquer pedido de um áudio que a ponte já obteve uma vez: a primeira obtenção esvazia a cópia que a página grava no cache"
    - "persiste depois de recarregar e em aba nova: o cache de mídia da página é persistente (Cache Storage)"
  capsule: evidence/reproduction.md

regression_analysis:
  last_known_good: null
  first_known_bad: c76605f
  bisect: "não necessário: a transferência do ArrayBuffer da página (postMessage com [audio.bytes]) nasceu com a ponte, no CHG-001 do BUG-20261001-2MOY (c76605f, 2026-10-01 16:59); a primeira falha deste padrão no registro do motor é de 2026-10-01 17:40, logo após o build"
  culprit_commit: c76605f

fix_session:
  started: "2026-10-02 19:51 -03"
  scope: "o clique num áudio já transcrito volta a produzir texto depois de recarregar a página ou numa aba nova; o texto anterior não reaparece sozinho (cache entre recargas é feature à parte, conflita com o RF-14 do núcleo), decisão de iago às 19:55"
  mitigation: "não aplicada: investigar direto, decisão de iago às 19:55 (sem mitigação útil no código; na mesma aba, o cache da sessão serve o texto)"
  real_page_inspection: "autorizada só em leitura às 19:55: download da própria página sem transferir o buffer; anotar bytes, assinatura e tipo de mídia; nomes e tamanhos dos caches locais; nenhum texto de mensagem"

blocking: []
relationships:
  - bug: BUG-20261001-2MOY
    type: related-to
    state: confirmed
    evidence:
      - ref: evidence/reproduction.md
        observation: "a linha que esvazia a cópia da página, porta.postMessage({...}, [audio.bytes]) em ponte-audio.ts, nasceu no CHG-001 do 2MOY (c76605f); o 2MOY está travado, e este é um defeito novo no código daquela correção, não o mesmo defeito de volta"
  - bug: BUG-20261002-YUB4
    type: related-to
    state: proposed
    evidence:
      - ref: evidence/reproduction.md
        observation: "o player do WhatsApp lê o mesmo cache de mídia; para os áudios esvaziados pela ponte, o download da página devolve 0 bytes, o que deixaria o ▶ sem o que tocar. Não medido no player; não explica áudios nunca obtidos pela ponte"

traceability:
  specs:
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#11-edge-cases-e-tratamento-de-erros"
    - "_reversa_sdd/addenda/bug-BUG-20261001-2MOY-v001.md"
  affected_code:
    - extension/src/pagina/ponte-audio.ts
    - extension/src/content/extrator-audio.ts
  root_cause:
    state: confirmed
    hypothesis: "A ponte transfere ao script de conteúdo o próprio ArrayBuffer que downloadAndMaybeDecrypt devolve. A página grava esse mesmo objeto no seu cache persistente de mídia (LruMediaStore sobre o Cache Storage lru-media-array-buffer-cache) depois de pelo menos um await; a transferência o desanexa antes, e o cache guarda 0 bytes. Daí em diante, em qualquer aba e depois de recarregar, o download da página devolve do cache um buffer de 0 bytes, a ponte o repassa, e o motor recusa por áudio ilegível em 0 a 5 ms."
    causal_path:
      - "pagina/ponte-audio.ts atender: porta.postMessage({ tipo: 'audio', pedido, ...audio }, [audio.bytes]) transfere o buffer da página"
      - "WAWebMediaStoreLruImpl.doPut enfileira a gravação e WAWebKeyValueCacheStore faz cache.put(chave, new Response(a)) depois de awaits: o buffer já está desanexado, a entrada fica com 0 bytes"
      - "WAWebMediaStoreLruImpl.doGet devolve o buffer do cache quando não é nulo (0 bytes não é nulo) e o regrava: a página não baixa de novo"
      - "content/extrator-audio.ts aceita a resposta sem conferir o tamanho; adaptadores/motor-cliente-content.ts envia base64 vazio"
      - "auxiliar/whispper_motor/audio.py decodificar: dados vazios, ErroDeAudio('áudio ilegível') antes do ffmpeg; FALHA_NA_TRANSCRICAO com duração 0,0"
    evidence:
      - ref: evidence/reproduction.md
        observation: "31 de 283 entradas do cache de mídia com 0 bytes; CC7A32 (entregue pela ponte) e 5A33F0, 6B700B (transcritos) vazios; D36320 (pedido só diretamente) íntegro; downloadAndMaybeDecrypt devolve 0 bytes em 2 ms para os vazios"
      - ref: "bundle do WhatsApp Web, módulos WAWebMediaStore, WAWebMediaStoreLruImpl, WAWebKeyValueCacheStore e WAWebMediaArrayBufferCacheStore"
        observation: "doPut enfileirado com awaits antes de new Response(a); doGet devolve e regrava o mesmo objeto"
      - ref: "~/Library/Application Support/whispper-motor/desempenho.tsv"
        observation: "toda falha com duração 0,0 e 0 a 5 ms, tempo que inclui a decodificação; nas aceitações de 19:24 a 19:32, falhas e sucessos intercalados"
    code_refs:
      - { file: extension/src/pagina/ponte-audio.ts, symbol: "atender (transferência de audio.bytes)", commit: c76605f }
      - { file: extension/src/content/extrator-audio.ts, symbol: "extrairAudio (aceita 0 bytes)", commit: c76605f }
  reproduction_tests:
    - "extension/test/extrator-audio.test.ts › reprodução (XDL5): o mesmo áudio pedido duas vezes entrega os mesmos bytes nas duas, com a página guardando no cache de mídia o buffer que devolveu"
    - "extension/test/extrator-audio.test.ts › reprodução (XDL5): a obtenção não esvazia a cópia da página: a entrada do áudio no cache de mídia segue com o tamanho dele"
    - "extension/test/extrator-audio.test.ts › reprodução (XDL5): o áudio cuja cópia no cache da página já está vazia é baixado de novo: só aquela entrada é apagada, e os bytes chegam"
  regression_tests:
    - "extension/test/extrator-audio.test.ts › regressão (XDL5): se a página devolve 0 bytes mesmo depois de apagar a entrada, a obtenção termina em AUDIO_INDISPONIVEL com motivo legível, e o núcleo não recebe áudio vazio"
    - "extension/test/extrator-audio.test.ts › regressão (XDL5): sem o módulo do cache de mídia, a cópia vazia termina em AUDIO_INDISPONIVEL, e os áudios íntegros continuam a ser entregues"
    - "extension/test/extrator-audio.test.ts › regressão (XDL5): bytes íntegros não apagam nada do cache da página nem pedem o áudio de novo"
    - "extension/test/extrator-audio.test.ts › os cinco testes do 2MOY (RF-05, RF-06, RF-07, EC-01, EC-03, EC-06)"

spec_verdict: spec-correta
spec_verdict_decision:
  decided_by: iago
  decided_at: "2026-10-02 20:22 -03"
  addendum: null
  evidence: "integracao-whatsapp-web.md RF-06 (Must) já exigia entregar os bytes decifrados, 'obtendo-o da cópia já carregada pela página ou pelo mecanismo de download da própria página', com o critério de que toquem num player externo; o código entregava 0 bytes. A cura usa o mesmo mecanismo previsto (EC-01), com o nome do módulo na configuração (Delta 3 do adendo 2MOY, RF-13), e a falha residual reusa o motivo 'Não foi possível baixar o áudio do WhatsApp Web' da seção 11. Nada muda na spec."

change_risk:
  classification: média
  reasons:
    - "a ponte é o caminho de toda transcrição"
    - "dependência nova de módulo interno da página (WAWebMediaStore.LruMediaStore.del); se mudar, a cura não roda e o vazio vira falha legível"
    - "a extensão passa a apagar entradas do cache de mídia da página, só as de 0 bytes, que a página recria"
    - "reparo de dados no navegador do usuário (até 31 entradas vazias), com dry-run e chaves guardadas"
    - "sem contrato externo nem protocolo alterado; reversível por revert"

strategy:
  chosen: correção direta
  decided_by: iago
  decided_at: "2026-10-02 20:02 -03"
  scope_decisions:
    - "a ponte entrega uma cópia do buffer e mantém o da página intacto"
    - "0 bytes da página: apagar só aquela entrada do cache de mídia e pedir de novo, uma vez; se continuar vazio, AUDIO_INDISPONIVEL legível, nunca ao motor"
    - "reparo de dados: cura no código e varredura única das entradas de 0 bytes já existentes (decisão das 20:02)"
  plan: fix/plan.html
  plan_approved: "2026-10-02 20:06 -03, por iago"

change_set:
  - id: CHG-001
    kind: test
    artifact: extension/test/extrator-audio.test.ts
    purpose: "cache de mídia na página falsa, como o LruMediaStore (grava o buffer devolvido depois, del); três testes de reprodução e três de regressão"
    diff: fix/CHG-001.diff
    applied: "2026-10-02 20:11 -03, Gate 1 aprovado (20:10)"
  - id: CHG-002
    kind: code
    artifact: extension/src/pagina/ponte-audio.ts
    purpose: "a ponte entrega uma cópia do buffer e mantém o da página intacto; 0 bytes: apagar só aquela entrada do cache de mídia (LruMediaStore.del) e pedir de novo, uma vez; vazio de novo ou sem o módulo: falha download legível"
    diff: fix/CHG-002.diff
    applied: "2026-10-02 20:16 -03, Gate 2 aprovado (20:15)"
  - id: CHG-003
    kind: configuration
    artifact: extension/src/content/configuracao-estruturas.ts
    purpose: "nome do módulo do cache de mídia da página (WAWebMediaStore) junto dos outros módulos"
    diff: fix/CHG-003.diff
    applied: "2026-10-02 20:16 -03, Gate 2 aprovado (20:15)"
  - id: CHG-004
    kind: code
    artifact: extension/src/content/extrator-audio.ts
    purpose: "retirado no Gate 2, por decisão de iago (20:15): a segunda barreira não teria teste próprio; a ponte é a única fonte de respostas de áudio, no mesmo build, e os testes de regressão provam que o núcleo não recebe vazio"
    diff: null
    applied: null
  - id: CHG-005
    kind: data-repair
    artifact: "Cache Storage lru-media-array-buffer-cache do WhatsApp Web do usuário"
    purpose: "varredura única: apagar pelo LruMediaStore as entradas de 0 bytes deixadas pela ponte antiga e conferir que não sobra nenhuma"
    diff: fix/CHG-005-reparo-cache-vazio.js
    dry_run: "evidence/reparo-dry-run.md: 284 entradas, 31 vazias, 31 reconhecidas, impressão digital 4b74ec2ee1d28360; antes da execução, 29 vazias (duas curadas pelo CHG-002 nos testes do usuário), impressão 64e85056f878da73"
    applied: "2026-10-02 20:22 -03, Gate 2 aprovado (20:15): 29 apagadas pelo LruMediaStore, 0 direto, 284 para 255 entradas, 0 vazias depois (evidence/aceitacao-whatsapp-real.md)"

closure:
  policy: local-software
  satisfied: true
  evidence:
    - evidence/gate1-vermelho.txt
    - evidence/gate2-verde-suite.txt
    - evidence/gate2-typecheck.txt
    - evidence/testes-de-mutacao.md
    - evidence/aceitacao-whatsapp-real.md
    - evidence/reparo-dry-run.md
resolution_kind: fixed
---

# Transcrever de novo um áudio já transcrito falha: o motor recebe o áudio vazio

## Summary

No WhatsApp Web real, clicar no ícone de um áudio que já foi transcrito antes faz o ícone passar a erro em menos de meio segundo. O motor registra `FALHA_NA_TRANSCRICAO` com duração 0,0 e 0 a 4 ms de processamento, sinal de que recebeu um áudio vazio. Segundo o usuário, a falha continua depois de recarregar a página. Áudios nunca transcritos continuam funcionando, intercalados com as falhas.

## Expected Behavior

- `integracao-whatsapp-web.md` RF-06: quando o núcleo pedir, a integração entrega os bytes do áudio já decifrado, o tipo de mídia e a duração, sem reprodução sonora. O critério exige que os bytes entregues toquem num player externo com a duração exibida pelo WhatsApp.
- `integracao-whatsapp-web.md` RF-05 e RF-07: obter o áudio não altera o player nem o estado da mensagem.
- `integracao-whatsapp-web.md` EC-01: áudio ainda não carregado é baixado pelo mecanismo da própria página. Nenhum caso de borda prevê entregar zero bytes ao núcleo.
- Adendo `bug-BUG-20261001-2MOY-v001.md`, Delta 3: a técnica de obtenção registrada (download decifrado da própria página, sem mudar o estado da página).
- O pedido repetido do mesmo áudio deve ter o mesmo resultado do primeiro, salvo quando a mídia expirou (EC-02), caso em que o motivo é "Este áudio não está mais disponível no WhatsApp".

## Actual Behavior

- O ícone vai de cinza a vermelho (erro) em menos de 0,5 s após o clique, sem contador visível. A janela com a mensagem de erro existe, mas fica invisível (BUG-20261002-IXWO).
- O motor registra a primeira falha deste padrão em 2026-10-01 às 17:40:21, quatro segundos depois de iniciado. Em 2026-10-02 há 28 falhas e 9 sucessos, intercalados (sucessos às 12:11:00, 12:12:30, 12:13:20, 12:13:39, 12:18:03, 12:18:44, 12:21:57, 12:25:29 e 12:28:12).
- Toda falha tem duração 0,0 e 0 a 4 ms de processamento, tempo que exclui o ffmpeg e o Whisper.

## Steps to Reproduce

Segundo o relato do usuário, ainda não reproduzido pelo agente:

1. No WhatsApp Web real, com a extensão do build de 2026-10-02, transcrever um áudio de voz (sucesso).
2. Fechar a janela, recarregar a página ou sair e entrar no WhatsApp Web.
3. Clicar de novo no ícone do mesmo áudio.
4. Observar: o ícone passa a erro quase imediatamente; o motor registra `FALHA_NA_TRANSCRICAO` com duração 0,0.

Observação: na mesma aba, sem recarregar, o segundo clique deveria ser atendido pelo cache da sessão (RF-09 da feature 006) e não chegar ao motor; o caminho que falha pede o áudio de novo à página.

## Evidence

- `evidence/icone-passa-a-erro-no-clique.png`: recorte do primeiro vídeo, dois quadros por segundo, só a região do ícone.
- `evidence/desempenho-motor-20261002-1222.tsv`: cópia do registro do motor feita no relato.
- `evidence/desempenho-motor-20261002-1233.tsv`: cópia posterior, com as falhas de 12:23:06 e 12:23:24 e os sucessos de 12:21:57, 12:25:29 e 12:28:12.
- Vídeo original, fora do repositório: `~/Desktop/Gravação de Tela 2026-10-02 às 11.55.29.mov`.
- Inspeção numa aba própria da automação, com autorização do usuário e sem ler mensagens: `WAWebCollections` e `WAWebDownloadManager` existem; `downloadAndMaybeDecrypt` devolveu 12.057, 49.055 e 24.574 bytes com assinatura `OggS`, objetos distintos a cada chamada; a ponte, exercitada pelo mesmo aperto de mão do script de conteúdo, entregou 49.055 bytes.
- Relato bruto: `../../intake/relato-20261002-1223.md`, Problema 4.

## Suspected Area

- `extension/src/pagina/ponte-audio.ts`, função `atender`: `porta.postMessage({ tipo: 'audio', pedido, ...audio }, [audio.bytes])` transfere o `ArrayBuffer` devolvido por `downloadAndMaybeDecrypt`. A transferência esvazia o buffer do lado de quem envia. Se a página guarda esse buffer para reuso, a cópia dela passa a ter 0 bytes e o pedido seguinte do mesmo áudio entrega 0 bytes ao motor. Hipótese não confirmada: na inspeção, cada chamada devolveu um objeto distinto.
- `extension/src/content/extrator-audio.ts`: aceita a resposta da ponte sem verificar se os bytes são vazios, e o erro chega ao usuário como falha do motor, não como problema na obtenção do áudio.
- `auxiliar/whispper_motor/audio.py` (`decodificar`): os únicos caminhos que falham em poucos milissegundos são mídia não aceita (`audio/ogg` é aceita) e bytes vazios ("áudio ilegível"). Somente leitura, citado para fundamentar o diagnóstico.

## Acceptance Criteria

1. Transcrever o mesmo áudio duas vezes, com recarga da página entre as duas, produz texto nas duas vezes.
2. A obtenção do áudio não deixa nenhum objeto da página vazio ou alterado: o buffer devolvido pela página continua com o mesmo tamanho depois da entrega.
3. Se a página entregar 0 bytes, a integração devolve AUDIO_INDISPONIVEL com motivo legível, sem enviar o pedido ao motor.
4. Teste que falha no código atual e passa com a correção, simulando uma página que reaproveita o buffer devolvido.

## Traceability

| Tipo | Referência |
|---|---|
| Spec | `_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais` (RF-05, RF-06, RF-07) |
| Spec | `_reversa_sdd/sdd/integracao-whatsapp-web.md#11-edge-cases-e-tratamento-de-erros` (EC-01, EC-02) |
| Adendo | `_reversa_sdd/addenda/bug-BUG-20261001-2MOY-v001.md` (Delta 3) |
| Código | `extension/src/pagina/ponte-audio.ts` (`atender`), `extension/src/content/extrator-audio.ts` |
| Testes existentes | `extension/test/extrator-audio.test.ts` cobre a obtenção com uma página simulada que devolve um buffer novo a cada pedido; nenhum teste cobre o pedido repetido do mesmo áudio |
| Relação | `related-to` BUG-20261001-2MOY (confirmed): a ponte nasceu no change set CHG-001 daquele bug |

## Resolution

**Encerrado em 2026-10-02 20:26 -03 · `resolution_kind: fixed` · closure `local-software` satisfeita.**

### Causa raiz (`confirmed`)

A ponte da extensão, no mundo da página, transferia ao script de conteúdo o próprio `ArrayBuffer` que
`downloadAndMaybeDecrypt` devolve (`porta.postMessage({...}, [audio.bytes])`, linha nascida em `c76605f`, CHG-001 do
BUG-20261001-2MOY). O WhatsApp Web grava esse mesmo objeto no seu cache persistente de mídia (`LruMediaStore` sobre o
Cache Storage `lru-media-array-buffer-cache`) depois de pelo menos um `await`; a transferência o desanexava antes, e o
cache guardava 0 bytes. Daí em diante, em qualquer aba e depois de recarregar, o download da página devolvia do cache
o buffer vazio (ela não baixa de novo enquanto a cópia não é nula), a ponte o repassava, e o motor recusava por "áudio
ilegível" antes do ffmpeg: duração 0,0 em 0 a 5 ms e "Falhou após 0 s" na janela. A intermitência aparente era a
mistura de áudios nunca obtidos pela ponte (sucesso) com os já obtidos (falha).

Provas (`evidence/reproduction.md`, WhatsApp real, só leitura): 31 de 283 entradas do cache com 0 bytes; os áudios
entregues pela ponte vazios e o pedido só diretamente íntegro; o download da página devolvendo 0 bytes em 2 ms para os
vazios; e o código do próprio WhatsApp (`WAWebMediaStoreLruImpl.doPut` enfileirado, `new Response(buffer)` depois dos
metadados, `doGet` que devolve e regrava a cópia).

### Estratégia

Correção direta, decidida por iago às 20:02, sem debate (causa confirmada, sem hipóteses concorrentes). Escopo
decidido às 19:55: o clique num áudio já transcrito volta a produzir texto depois de recarregar; o texto anterior não
reaparece sozinho (o cache de texto vive na memória da aba, RF-06; guardá-lo entre recargas é feature à parte, que
conflita com o RF-14 do núcleo). Sem mitigação, por decisão das 19:55.

1. A ponte entrega uma cópia do buffer (`bytes.slice(0)`) e transfere a cópia; o buffer da página fica intacto.
2. Se a página devolve 0 bytes, a ponte apaga só aquela entrada do cache de mídia (`LruMediaStore.del(filehash)`) e
   pede de novo, uma vez; vazio de novo, ou sem o módulo, a obtenção termina em `AUDIO_INDISPONIVEL` com "Não foi
   possível baixar o áudio do WhatsApp Web (o WhatsApp Web entregou o áudio vazio)", e o núcleo não recebe vazio.
3. Varredura única das entradas vazias que já existiam (decisão das 20:02: cura e varredura).

**Desvio do plano, aprovado no Gate 2 (20:15):** o CHG-004 (segunda barreira no extrator) foi retirado; não teria
teste que o exercitasse, porque a ponte é a única fonte de respostas de áudio e vai no mesmo build, e os testes de
regressão já provam que o núcleo não recebe vazio.

### Correction Change Set

| CHG | Tipo | Artefato | Propósito | Diff |
|---|---|---|---|---|
| CHG-001 | test | `extension/test/extrator-audio.test.ts` | Cache de mídia na página falsa, como o `LruMediaStore`; três testes de reprodução e três de regressão | [CHG-001](fix/CHG-001.diff) |
| CHG-002 | code | `extension/src/pagina/ponte-audio.ts` | Cópia em vez de transferência; cura da cópia vazia; falha legível | [CHG-002](fix/CHG-002.diff) |
| CHG-003 | configuration | `extension/src/content/configuracao-estruturas.ts` | Nome do módulo do cache de mídia (`WAWebMediaStore`), com os outros módulos (RF-13) | [CHG-003](fix/CHG-003.diff) |
| CHG-004 | code | `extension/src/content/extrator-audio.ts` | Retirado no Gate 2 | (nenhum) |
| CHG-005 | data-repair | Cache Storage `lru-media-array-buffer-cache` do WhatsApp Web do usuário | Varredura única das entradas de 0 bytes | [script](fix/CHG-005-reparo-cache-vazio.js) |

### Diff do código e da spec

Spec: **sem alteração** (veredito `spec-correta`). Código (núcleo do CHG-002; íntegra em `fix/`):

```diff
--- a/extension/src/pagina/ponte-audio.ts
+++ b/extension/src/pagina/ponte-audio.ts
+  // A página devolve do seu cache de mídia a cópia que achar lá, mesmo vazia, sem baixar de novo; apagar só a entrada
+  // vazia a faz baixar o áudio outra vez (BUG-20261002-XDL5).
+  let bytes = await baixar();
+  if (bytes.byteLength === 0 && (await apagarCopiaVazia(pagina, mensagem.filehash))) bytes = await baixar();
+  if (bytes.byteLength === 0) throw new FalhaNaPagina('download', 'o WhatsApp Web entregou o áudio vazio');
@@ atender
-    porta.postMessage({ tipo: 'audio', pedido, ...audio } satisfies RespostaDaPonte, [audio.bytes]);
+    // Só uma cópia atravessa a porta: a página grava no cache de mídia o buffer que devolveu, depois de devolvê-lo, e
+    // transferi-lo o esvaziaria antes disso (BUG-20261002-XDL5).
+    const bytes = audio.bytes.slice(0);
+    porta.postMessage({ tipo: 'audio', pedido, ...audio, bytes } satisfies RespostaDaPonte, [bytes]);
```

### Reparo de dados (CHG-005)

Dry-run antes do Gate 2 (`evidence/reparo-dry-run.md`): 284 entradas, 31 vazias, todas reconhecidas pelo
`LruMediaStore`, impressão digital `4b74ec2ee1d28360`. Backup: as entradas não têm conteúdo (0 bytes); o conjunto é
identificado pela contagem e pela impressão digital (a ferramenta da automação bloqueia a saída dos hashes de mídia, e
o filtro não foi contornado). Rollback: nada a restaurar; a mídia íntegra segue no servidor. Execução às 20:22, com a
extensão corrigida carregada: dry-run imediato com 29 vazias (duas já curadas pelo CHG-002), impressão
`64e85056f878da73`; **29 apagadas pelo `LruMediaStore`, 0 direto, 284 para 255 entradas, 0 vazias depois**
(`evidence/aceitacao-whatsapp-real.md`).

### Testes: vermelho → verde

- Gate 1 (aprovado às 20:10; `evidence/gate1-vermelho.txt`): 11 testes no extrator, 6 ok e **5 falhas**, saída 1. A
  segunda obtenção do mesmo áudio recebeu `[]`; a cópia no cache ficou com 0 bytes; o áudio de cópia vazia veio vazio,
  sem apagar; o vazio não foi rejeitado, com e sem o módulo. O teste de regressão dos bytes íntegros já passava.
- Os testes e o código foram validados antes do Gate 1 numa cópia isolada; o aplicado é idêntico byte a byte.
- Gate 2 (aprovado às 20:15): `npm test` com 185 testes, **183 ok, 0 falhas**, 2 pulados por opção;
  `npm run typecheck` limpo (`evidence/gate2-verde-suite.txt`, `evidence/gate2-typecheck.txt`); build em
  `evidence/build-aceitacao.txt`.
- Mutações (`evidence/testes-de-mutacao.md`, na cópia isolada): sem a cópia, sem a cura ou sem a falha legível,
  falham 2 testes em cada caso, e cada parte da correção é exigida por pelo menos um. Sem a cópia, o pedido repetido
  passa sozinho, porque a cura mascara o defeito; a reprodução que mede a cópia da página o apanha.

### Aceitação no WhatsApp Web real (`evidence/aceitacao-whatsapp-real.md`)

- Testes do usuário com o build corrigido: três transcrições `ok`, com 24,3 s, 7,7 s e 24,3 s; o áudio de 24 s foi
  transcrito antes e depois da recarga da aba (critério 1).
- No cache, as vazias caíram de 31 para 29 com o total parado: duas cópias vazias curadas pela ponte nova, regravadas
  com o `size` do modelo (critério 2); isso confirma também que o `del` do `LruMediaStore` apaga o buffer.
- Depois da varredura, dois áudios que estavam vazios voltaram do servidor íntegros (`OggS`, 14.499 e 62.182 bytes).
- Critério 3 (vazio vira `AUDIO_INDISPONIVEL`): provado nos testes de regressão; no WhatsApp real, não restou caso.

### Veredito de spec: `spec-correta`

`integracao-whatsapp-web.md` RF-06 (Must) já exigia entregar os bytes decifrados, "obtendo-o da cópia já carregada
pela página ou pelo mecanismo de download da própria página", com o critério de que toquem num player externo; o
código entregava 0 bytes. A cura usa o mesmo mecanismo previsto (EC-01), com o nome do módulo na configuração (Delta 3
do adendo 2MOY, RF-13), e a falha residual reusa o motivo de download da seção 11. Veredito escolhido por iago às 20:22.

### Fora desta correção

- O texto anterior não reaparece sozinho depois de recarregar: cache entre recargas é feature à parte (RF-14 do
  núcleo), por decisão do usuário.
- BUG-20261002-YUB4 (▶ do WhatsApp não toca): relação `proposed`. O player lê o mesmo cache; com a varredura, os
  áudios esvaziados voltam a ter bytes. Falta conferir se o ▶ volta a tocar e por que falharia em áudios nunca obtidos.

## Agent Notes

- O BUG-20261001-2MOY está travado com `DONE.md`: não editar a pasta dele. Este é um defeito novo no código que aquela correção introduziu, não o mesmo defeito de volta, por isso a relação proposta é `related-to`, e não `regression-of`.
- Ponto contra a hipótese, a verificar: o registro mostra um áudio de 37,7 s transcrito às 16:18:53 e um de 37,8 s às 17:35:37 de 2026-10-01, ambos com sucesso. Se for o mesmo áudio, a segunda transcrição nem sempre falha. A persistência depois de recarregar também não se explica só pela transferência do buffer, a menos que a página grave a cópia esvaziada num armazenamento local.
- Em 2026-10-02, o usuário recusou a execução de um cliente de Native Messaging contra o host instalado. Não repetir sem perguntar.
- A falha ficou invisível ao usuário por causa do BUG-20261002-IXWO; corrigir aquele primeiro torna a mensagem de erro observável.
- Taxonomia vazia: proposta de termos `area: extensao`, `module: integracao-whatsapp-web`.
- Fechamento (2026-10-02): o ponto contra a hipótese, acima, ficou explicado. O pedido de 37,7 s das 16:18:53 é anterior à ponte (`c76605f`, 16:59) e usou o caminho antigo; o de 37,8 s das 17:35:37 é a primeira obtenção pela ponte, que sempre funciona e é justamente a que esvazia a cópia. A persistência depois de recarregar vem do Cache Storage da página (`lru-media-array-buffer-cache`).
- Lição: buffer devolvido pela página continua sendo dela. Nunca pôr na lista de transferíveis do `postMessage` um objeto que a página devolveu; transferir só cópias.
- A cura depende de `WAWebMediaStore.LruMediaStore.del`. Se o módulo mudar, a cura não roda e o vazio vira `AUDIO_INDISPONIVEL` com "o WhatsApp Web entregou o áudio vazio": essa mensagem no WhatsApp real é o sinal para rever o nome em `configuracao-estruturas.ts`.
- Com o CHG-004 retirado, `extrator-audio.ts` ainda aceita 0 bytes de qualquer fonte. Se surgir outra fonte de áudio além da ponte, a barreira ali volta a fazer sentido.
- A aba do WhatsApp Web aberta pela automação, no grupo de abas dela, ficou aberta; o usuário pode fechá-la.
- Próximo passo no BUG-20261002-YUB4: conferir se o ▶ volta a tocar nos áudios que estavam vazios (curados ou varridos) e testar áudios nunca obtidos pela ponte, que esta causa não explica.
