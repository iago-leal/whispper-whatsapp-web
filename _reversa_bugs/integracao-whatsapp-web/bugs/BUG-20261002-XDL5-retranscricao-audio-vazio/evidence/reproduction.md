# Cápsula de reprodução: BUG-20261002-XDL5

| Campo | Valor |
|---|---|
| Data | 2026-10-02, 19:58 a 20:05 -03 |
| Commit base | `4d892ea` (main), extensão do build da aceitação do HVT4/OW7G |
| Ambiente | macOS 27.0.1; Chrome do usuário com a extensão carregada; Node 26.10.0 |
| Onde | WhatsApp Web real, aba própria do grupo da automação, conta do usuário |
| Autorização | iago, 2026-10-02 19:55: inspeção **só em leitura**; download da própria página sem transferir o buffer; anotar bytes, assinatura e tipo de mídia; nomes e tamanhos dos caches; nenhum texto de mensagem lido |
| Classificação | **determinística** para o áudio cuja cópia no cache da página está vazia (3/3 pedidos devolveram 0 bytes); o que parecia intermitente no registro do motor era a mistura de áudios nunca obtidos pela ponte (sucesso) com áudios já obtidos por ela (falha) |

Os identificadores abaixo são os 6 últimos caracteres do `id.id` da mensagem. Nenhum conteúdo de mensagem foi lido; os
scripts leram só `type`, `mimetype` (sem parâmetros), `duration`, `size`, os hashes de mídia para casar com o cache, e
tamanhos de buffers.

## 1. Armazenamento local da página

Nomes dos caches (`caches.keys()`) e quantidade de entradas:

| Cache | Entradas |
|---|---|
| `lru-media-array-buffer-cache` | 283 |
| `wa-stickers` | 114 |
| `wa_web_user_prefs_cache_store` | 4 |
| `aura-ringtones-v1` | 1 |

Bancos IndexedDB relevantes: `lru-media-storage-idb` (metadados do cache de mídia), entre 14 bancos.

**31 das 283 entradas do `lru-media-array-buffer-cache` têm 0 bytes.**

## 2. Mensagens de voz carregadas × cache

Das 16 mensagens de voz carregadas na aba, 4 têm entrada no cache (casadas pelo `filehash` na chave):

| Mensagem | Tamanho no modelo | Bytes no cache | Histórico conhecido |
|---|---|---|---|
| CC7A32 | 49.055 | **0** | Entregue pela ponte da extensão na inspeção do registro (49.055 bytes transferidos) |
| 5A33F0 | 33.221 | **0** | Transcrito pela extensão |
| 6B700B | 176.240 | **0** | Transcrito pela extensão |
| D36320 | 24.574 | 24.574 (`OggS`) | Pedido só diretamente ao download da página, sem a ponte, na inspeção do registro |

O áudio que só passou pelo download direto, sem transferência, está íntegro; os que passaram pela ponte estão vazios.

## 3. O que o download da própria página devolve (sem transferir o buffer)

`require('WAWebDownloadManager').downloadManager.downloadAndMaybeDecrypt(...)` com os campos do modelo, como em
`obterAudioDaPagina`, mas lendo o resultado sem `postMessage`:

| Mensagem | Tipo devolvido | Bytes | Assinatura | Tempo |
|---|---|---|---|---|
| CC7A32 | `ArrayBuffer` | **0** | (vazia) | 2 ms |
| 5A33F0 | `ArrayBuffer` | **0** | (vazia) | 2 ms |
| D36320 | `ArrayBuffer` | 24.574 | `OggS` | 3 ms |

A ponte entrega esse buffer vazio ao script de conteúdo, que o envia ao motor; `decodificar` em
`auxiliar/whispper_motor/audio.py` recusa `dados` vazios com "áudio ilegível" antes do ffmpeg. Daí a duração 0,0 e os 0
a 5 ms do registro do motor (o tempo medido inclui a decodificação), e o "Falhou após 0 s" da janela.

## 4. Como a cópia da página fica vazia (código do próprio WhatsApp Web, lido no bundle carregado)

- `WAWebMediaStore` monta o `LruMediaStore` sobre `WAWebMediaArrayBufferCacheStore("lru-media-array-buffer-cache")`
  (Cache Storage), com metadados em IndexedDB.
- `WAWebMediaStoreLruImpl.doPut(t, a)` **enfileira** a gravação (`_queueMap.enqueue(t, async () => ...)`): lê
  `a.byteLength`, grava os metadados (`yield _metaInfoStore.putObject(...)`) e só então `_bufferStore.put(t, a)`.
- `WAWebKeyValueCacheStore` grava com `cache.put(chave, new Response(a))`, depois de `yield this.doOpen()`.
- `doGet(e)` devolve o buffer do cache **e o regrava** (`t != null && this.put(e, t)`), com o mesmo objeto.

Ou seja, o `ArrayBuffer` que `downloadAndMaybeDecrypt` devolve é o mesmo objeto que a página vai gravar no cache
depois de pelo menos um `await`. A ponte (`extension/src/pagina/ponte-audio.ts`, `atender`) faz
`porta.postMessage({...}, [audio.bytes])` logo após receber o buffer: a transferência o **desanexa** (0 bytes) antes de
`new Response(a)`, e o cache guarda 0 bytes. Como o cache é persistente (Cache Storage), a cópia vazia sobrevive à
recarga e a abas novas; como `doGet` devolve um buffer não nulo, a página não baixa de novo, e todo pedido seguinte
daquele áudio recebe 0 bytes.

## 5. Reprodução causal

Não executada no WhatsApp real: transferir o buffer de um áudio íntegro o esvaziaria de vez no cache do usuário, e a
autorização foi só de leitura. A cadeia está fechada pela leitura do código da página (item 4) e pelo experimento
natural do item 2 (mesma sessão do registro: o áudio entregue pela ponte ficou vazio; o pedido só diretamente, não).
O teste de reprodução do Gate 1 reproduz o mecanismo numa página simulada que grava o buffer devolvido depois de um
`await`, como o `LruMediaStore`.

## Comandos

Executados com a ferramenta de JavaScript da automação na aba `web.whatsapp.com`; os scripts estão resumidos acima
(listagem de `caches`, `indexedDB.databases()`, `WAWebCollections.Msg.getModelsArray()` filtrado por `ptt`/`audio`,
`caches.open(...).match(...).arrayBuffer().byteLength`, e `downloadAndMaybeDecrypt` sem `postMessage`). Saída integral
anotada nas tabelas; nenhum dado de mensagem além dos listados.
