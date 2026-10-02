---
schema_version: 1
id: BUG-20261002-XDL5
display_number: 9
title: "Transcrever de novo um áudio já transcrito falha: o motor recebe o áudio vazio"
status: open
phase: triaging
severity: high
priority: P1
created: 2026-10-02
updated: 2026-10-02

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
  classification: intermittent
  rate: "28/37 pedidos ao motor em 2026-10-02 terminaram em falha (registro do motor, não reprodução controlada)"
  suspected_triggers:
    - "segunda transcrição do mesmo áudio (relato do usuário)"
    - "persiste depois de recarregar a página (relato do usuário)"

blocking: []
relationships:
  - bug: BUG-20261001-2MOY
    type: related-to
    state: proposed
    evidence: []

traceability:
  specs:
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#61-requisitos-principais"
    - "_reversa_sdd/sdd/integracao-whatsapp-web.md#11-edge-cases-e-tratamento-de-erros"
    - "_reversa_sdd/addenda/bug-BUG-20261001-2MOY-v001.md"
  affected_code:
    - extension/src/pagina/ponte-audio.ts
    - extension/src/content/extrator-audio.ts
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
| Relação | `related-to` BUG-20261001-2MOY (proposed): a ponte nasceu no change set CHG-001 daquele bug |

## Resolution

## Agent Notes

- O BUG-20261001-2MOY está travado com `DONE.md`: não editar a pasta dele. Este é um defeito novo no código que aquela correção introduziu, não o mesmo defeito de volta, por isso a relação proposta é `related-to`, e não `regression-of`.
- Ponto contra a hipótese, a verificar: o registro mostra um áudio de 37,7 s transcrito às 16:18:53 e um de 37,8 s às 17:35:37 de 2026-10-01, ambos com sucesso. Se for o mesmo áudio, a segunda transcrição nem sempre falha. A persistência depois de recarregar também não se explica só pela transferência do buffer, a menos que a página grave a cópia esvaziada num armazenamento local.
- Em 2026-10-02, o usuário recusou a execução de um cliente de Native Messaging contra o host instalado. Não repetir sem perguntar.
- A falha ficou invisível ao usuário por causa do BUG-20261002-IXWO; corrigir aquele primeiro torna a mensagem de erro observável.
- Taxonomia vazia: proposta de termos `area: extensao`, `module: integracao-whatsapp-web`.
