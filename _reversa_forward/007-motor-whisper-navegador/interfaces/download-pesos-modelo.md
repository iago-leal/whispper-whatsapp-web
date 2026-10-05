# Interface: Download dos pesos do modelo na Hugging Face

> Identificador da feature: `007-motor-whisper-navegador`
> Tipo: HTTP, externo, só leitura
> Cliente: gerenciador de modelo, no worker do documento offscreen (`extension/src/offscreen/gerenciador-modelo.ts`)
> Base: RN-03, RF-06 a RF-10; `_reversa_sdd/sdd/compatibilidade-instalacao.md`, EC-02 a EC-04
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

É a única comunicação de rede do motor. Nenhum pedido leva áudio, texto, identificador do usuário ou cookie; a origem é fixa e declarada na política de privacidade.

## 1. Requisição

```
GET https://huggingface.co/<repositorio>/resolve/<revisao>/<caminho>
Range: bytes=<bytesJaGravados>-          // só na retomada; ausente no início
credentials: omit
cache: no-store
redirect: follow
```

- 🟢 `repositorio`, `revisao` (hash completo do commit) e `caminho` vêm do `CatalogoDeModelos`; nunca `main`.
- 🟢 Os arquivos são baixados um de cada vez, na ordem do catálogo, com os de configuração e o tokenizador antes dos pesos.
- 🟡 Nenhum cabeçalho além de `Range`. A extensão não envia `Authorization` nem identificador de cliente.

## 2. Respostas

| Situação | Resposta | Tratamento |
|----------|----------|------------|
| Primeiro pedido | 🟢 302 de `huggingface.co` para `https://us.aws.cdn.hf.co/xet-bridge-us/…` (URL assinada, válida por 1 h), depois 200 com o corpo inteiro | Grava em `.parcial`, alimentando o hash incremental |
| Retomada | 🟢 302, depois 206 com `content-range: bytes <inicio>-<fim>/<total>` | Confere que `<inicio>` é igual ao tamanho do `.parcial` e que `<total>` é igual a `bytes` do catálogo; senão, apaga o `.parcial` e recomeça do zero |
| Retomada respondida com 200 | 🟡 servidor ignorou o `Range` | Apaga o `.parcial` e grava do início |
| 404, 410 | Revisão ou arquivo retirado | Falha definitiva: "O modelo de fala não está mais disponível. Atualize a extensão." Sem nova tentativa automática |
| 403 com URL do CDN expirada | 🟡 assinatura vencida em download longo ou retomado depois de 1 h | Novo pedido a `huggingface.co`, que devolve outra URL assinada |
| 429 | 🟢 limite sem autenticação (3 000 resoluções a cada 300 s) | Espera o `retry-after`, ou 60 s sem ele; conta como uma das retomadas automáticas |
| 5xx, erro de rede, 30 s sem bytes | Falha transitória | Até 3 retomadas automáticas, com 10 s de intervalo; depois, "Não foi possível baixar o modelo; verifique a conexão" e o botão "Tentar de novo" (RF-08) |
| `QuotaExceededError` ao gravar | Disco cheio | Para o download, apaga o `.parcial` do arquivo atual e informa quanto espaço falta (EC-04 da spec) |

- 🟢 CORS: `huggingface.co` ecoa a origem `chrome-extension://…`, inclusive no 302; o CDN responde `access-control-allow-origin: *` e libera `range` na pré-requisição. Não há `host_permissions`.
- 🟡 O `fetch` segue o redirecionamento e preserva o `Range`, pela especificação Fetch; a Fase 1 confirma no Chrome.

## 3. Integridade

- 🟢 Cada arquivo tem `bytes` e `sha256` no catálogo, levantados uma vez da API `GET /api/models/<repositorio>/tree/<revisao>` (campo `lfs.oid`) na construção do catálogo, nunca em tempo de execução.
- 🟡 O hash é incremental durante o download. Na retomada, o prefixo já gravado é relido para reconstruir o estado do hash antes de continuar.
- Concluído o arquivo: tamanho e SHA-256 iguais ao catálogo renomeiam o `.parcial` para o nome final; divergência apaga o arquivo e baixa de novo. Duas divergências seguidas no mesmo arquivo levam ao botão "Tentar de novo" (EC-03 da spec).
- Todos os arquivos conferidos: grava `verificacao.json` (`data-delta.md`, seção 1.2).

## 4. Idempotência e concorrência

- Baixar de novo um arquivo já verificado não acontece: o gerenciador consulta o OPFS antes de cada pedido.
- Um único download por vez, no worker do documento offscreen. Um segundo `preparar_modelo` durante o download recebe o progresso corrente, sem abrir outro fluxo.
- O download continua com a página de boas-vindas fechada, enquanto o documento offscreen existir (D-09). Se o documento for fechado, a retomada parte do `.parcial` na próxima abertura da página.

## 5. Prazos e progresso

- Sem bytes por 30 s: o pedido é abortado e conta como falha transitória.
- Progresso emitido no máximo a cada 500 ms: bytes gravados, total do modelo, velocidade média dos últimos 10 s e tempo restante estimado.
- 🟡 Tempo de referência para o G-01 da spec (≤ 15 min com 50 Mbps): 586 MB levam cerca de 94 s e 759 MB, cerca de 2 min, sem contar a conferência.
