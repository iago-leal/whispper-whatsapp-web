# Investigation: Motor de transcrição no navegador

> Identificador: `007-motor-whisper-navegador`
> Data: `2026-10-04`
> Fontes consultadas em 2026-10-04. Chrome estável na data: 154.0.8037.98.
> Confidência: 🟢 CONFIRMADO (verificado no código-fonte, por curl ou na listagem do Hub), 🟡 INFERIDO, 🔴 LACUNA

## 1. Ponto de partida no legado

- 🟢 O motor atual vive no service worker: `extension/src/background.ts` instancia `AdaptadorMotorLocal` sobre `CanalChrome`, que abre a porta de Native Messaging. O script de conteúdo fala com ele por `chrome.runtime.sendMessage`, com o áudio em base64 (`extension/src/adaptadores/motor-cliente-content.ts`, mensagens `verificar_motor` e `transcrever_audio`). O painel e a página de boas-vindas usam as mesmas mensagens.
- 🟢 O núcleo consulta `verificar()` antes de cada pedido e só desiste em "indisponível"; em "iniciando", segue para `transcrever()` (`extension/src/dominio/nucleo.ts`, `executarTranscricao`). Não há estado de exibição para "preparando" (`extension/src/dominio/exibicao-de-transcricao.ts`).
- 🟢 O prazo da fila é `max(60 s, 30 s por minuto de áudio)`, contado desde a saída da fila (`extension/src/dominio/fila-transcricao.ts`, `calcularTimeoutMs`). No tempo-limite, a fila segue para o próximo pedido, mas o motor não é avisado: a porta não tem cancelamento.
- 🟢 A bateria de contrato `extension/test/contrato-motor.ts` já é parametrizada pela implementação (fala em português, em inglês, sem fala, ilegível, motor indisponível) e serve ao novo adaptador sem mudança de estrutura.
- 🟢 Três defeitos do legado que a feature corrige de passagem:
  - `VerificadorCompatibilidade.extrairInfoDoNavegador` presume `arm64` em todo Mac, aprovando Mac Intel, e lê `navigator.deviceMemory`, que até o Chrome 146 parava em 8, com 8 como valor quando ausente;
  - `onboarding.ts` informa falhas por `alert()`;
  - o painel lê a URL da aba ativa, o que hoje depende da permissão `tabs`.
- 🟢 `npm run build` chama `build:instalador`, que no macOS embute o .pkg em `dist/instaladores`. Esse arquivo não pode ir ao pacote da loja (orientação do Chromium contra código nativo no pacote, `options.md`).
- 🟢 `auxiliar/whispper_motor/instalacao.py` deriva o ID da extensão do `key` do manifesto para escrever o `allowed_origins` do host.
- 🟢 `amostras/reais/` está vazia e fora do controle de versão. As amostras sintéticas (`amostras/sinteticas/`) são fala lida, úteis para o contrato e inúteis para medir o português informal.

## 2. Contexto de execução na extensão MV3

| Contexto | WebGPU | Web Audio (decodificação) | Vida | Veredito |
|----------|--------|---------------------------|------|----------|
| Service worker | 🟢 desde o Chrome 124 | 🟢 ausente (`[Exposed=Window]`) | 🟢 morre após 30 s ocioso, com evento acima de 5 min ou com `fetch` acima de 30 s | descartado para a inferência; fica como roteador |
| Script de conteúdo | 🟡 sim, mas no processo da página | 🟢 sim | vida da aba | descartado: disputa a thread do WhatsApp Web |
| Documento offscreen | 🟡 provável, sem fonte oficial | 🟢 sim (o guia oficial de captura cria `AudioContext` nele) | 🟢 sem limite, exceto o motivo `AUDIO_PLAYBACK` | escolhido para decodificar e coordenar |
| Worker dedicado criado pelo documento offscreen | 🟡 provável (WebGPU em worker dedicado desde o Chrome 113), sem teste publicado nesse arranjo | 🟢 ausente | vida do documento | escolhido para a inferência |

- 🟢 Documento offscreen: um por extensão; só a API `runtime`; Chrome 109 ou superior. Fonte: https://developer.chrome.com/docs/extensions/reference/api/offscreen (atualizada em 2026-09-21).
- 🟢 Ciclo do service worker: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle. Mensagens vindas do documento offscreen reiniciam o contador de ociosidade.
- 🟡 O pedido mais longo que o núcleo admite é de 150 s, para 5 min de áudio, abaixo do limite de 5 min por evento do service worker, que aguarda a resposta do documento offscreen.
- 🟢 O exemplo oficial da Hugging Face roda a inferência no service worker, com `device: 'webgpu'` e `dtype: 'q4'`, sem documento offscreen: https://github.com/huggingface/transformers.js-examples/tree/main/browser-extension (Transformers.js 3.7.1, 2025-08-02). Serve para modelos que recarregam rápido; aqui o RF-12 pede o modelo carregado durante a sessão.

## 3. Biblioteca de inferência

**Transformers.js 4.3.0** (npm `latest`, 2026-09-16, com `onnxruntime-web` 1.31.0-dev.20260914). Fontes: https://github.com/huggingface/transformers.js/releases/tag/4.3.0 e o código em https://unpkg.com/@huggingface/transformers@4.3.0/src/.

- 🟢 **Dispositivo e precisão.** `device` aceita `'webgpu'` e `'wasm'`, e o padrão no navegador é `'wasm'`. `dtype` aceita valor por submodelo, por exemplo `{ encoder_model: 'fp32', decoder_model_merged: 'q4' }`. Sem `shader-f16`, o fp16 é recusado; o q4f16 não passa por essa checagem.
- 🟢 **Código remoto por omissão.** Fora de service worker e sem `wasmPaths`, a biblioteca aponta o runtime para `https://cdn.jsdelivr.net/npm/onnxruntime-web@<versão>/dist/`. Fonte: `src/backends/onnx.js`. Arquivos a empacotar: `ort-wasm-simd-threaded.asyncify.wasm` (26.861.777 bytes) e `ort-wasm-simd-threaded.asyncify.mjs` (53.057 bytes), na mesma versão do JavaScript do runtime.
- 🟢 **Cache.** `allowRemoteModels`, `allowLocalModels`, `useBrowserCache`, `useWasmCache` e `useCustomCache`/`customCache` (interface `match`/`put`). A consulta ao cache precede a rede, com chave igual à URL `…/resolve/<revisão>/<arquivo>`. Fonte: `src/env.js` e `src/utils/hub.js`.
- 🟢 **Idioma.** Sem `language`, o modelo multilíngue recebe `<|en|>` e o aviso "No language specified - defaulting to English (en)"; o código traz "TODO: Implement language detection". Pedido aberto: https://github.com/huggingface/transformers.js/issues/302. Proposta aberta, com o método adotado no D-03: https://github.com/huggingface/transformers.js/pull/1541.
- 🟢 **Áudio longo.** Com `chunk_length_s`, o padrão de `stride_length_s` é `chunk/6`. Com 30 e 5, as janelas avançam 20 s: 60 s de áudio geram 3 passes do encoder, e 300 s geram 15. Fonte: `src/pipelines/automatic-speech-recognition.js`.
- 🟢 **Interrupção.** A biblioteca oferece critério de parada interrompível para a geração; a interrupção do encoder não é possível no meio de um passe.

**Alternativas avaliadas.**

| Alternativa | Por que não | Fonte |
|-------------|-------------|-------|
| whisper.cpp em WebAssembly | O exemplo oficial não usa WebGPU; declara 2 a 3 vezes o tempo real em tiny e base, isto é, 20 a 30 s por minuto; exige `SharedArrayBuffer` (isolamento de origem); limita o exemplo a 120 s e ao modelo small | https://github.com/ggml-org/whisper.cpp/tree/master/examples/whisper.wasm (v1.9.4, 2026-09-11) |
| `onnxruntime-web` puro | Reescrever o extrator de features, o tokenizador e o laço de decodificação, que o Transformers.js já mantém | n/a |
| Modelo destilado pt-BR (`freds0/distil-whisper-large-v3-ptbr`) | Existe só em PyTorch, CTranslate2, GGML e OpenVINO; sem ONNX pronto; ajustado só ao português, o que tende a prejudicar a detecção do inglês | https://hf.co/freds0/distil-whisper-large-v3-ptbr |

## 4. Modelos

Tamanhos verificados na listagem do Hub (MB = 10^6 bytes), somando o encoder e o `decoder_model_merged`; tokenizador e configurações acrescentam cerca de 2,8 MB.

| Repositório e combinação | Total | Observação |
|--------------------------|-------|------------|
| `onnx-community/whisper-base`, fp32 + q4 | 206,1 MB | configuração do exemplo oficial em WebGPU |
| `onnx-community/whisper-base`, q8 + q8 | 76,9 MB | reserva em WASM |
| `onnx-community/whisper-small`, q4 + q4 | 299,3 MB | candidato de qualidade |
| `onnx-community/whisper-small`, fp32 + q4 | 586,0 MB | candidato de qualidade |
| `onnx-community/whisper-small`, q8 + q8 | 249,1 MB | só em WASM |
| `onnx-community/whisper-large-v3-turbo`, q4 + q4 | 759,1 MB | medição no Mac |
| `onnx-community/whisper-large-v3-turbo`, fp16 + q4 | 1.608,5 MB | configuração do demonstrativo oficial; fora |

- 🟢 Commits atuais: base `1846881b6b3a…` e small `36050c46d777…` (2025-06-19); turbo `360ebcde2559…` (2025-03-06). O catálogo fixa o hash completo.
- 🟢 Licenças: os repositórios da onnx-community não declaram licença; os modelos de origem são Apache-2.0 (openai/whisper-tiny, base e small) e MIT (openai/whisper-large-v3-turbo). A política de privacidade e a ficha citam a origem.
- 🟢 Erro por palavra em português, segundo o artigo do Whisper (https://arxiv.org/abs/2212.04356, tabelas 10, 11 e 13):

| Conjunto | tiny | base | small | medium | large-v2 |
|----------|------|------|-------|--------|----------|
| FLEURS | 20,1 | 13,0 | 7,3 | 5,0 | 4,3 |
| Common Voice 9 | 35,2 | 23,7 | 12,5 | 8,1 | 6,3 |

  O large-v3-turbo marca 3,77 no FLEURS e 5,48 no MLS no Open ASR Leaderboard (`hf-audio/multilingual_evals`, português). Todos os conjuntos são de fala lida; não há referência pública para mensagem de voz informal, o que justifica a Fase 0.

## 5. Desempenho público e defeitos conhecidos

| Configuração | Áudio | Tempo | Fonte |
|--------------|-------|-------|-------|
| Mac mini M2, base fp32+q4, Transformers.js 3.0-alpha | 60 s | WebGPU 9,5 s; WASM 5,9 s | https://github.com/huggingface/transformers.js/issues/894 (2024-08) |
| Intel UHD 630, mesma configuração, primeira chamada | 13 s | WebGPU 5,9 s; WASM 10,7 s | idem (2024-08-27) |
| Apple Silicon, Chrome 150, small fp32+q4, com carimbo por palavra | 300 s | 134 s (26,8 s por minuto) | https://github.com/huggingface/transformers.js/issues/1739 (2026-08) |
| WASM, tiny.en q8, Edge, Intel Core | por segundo | 0,21 a 0,27 s (12,5 a 16 s por minuto) | https://github.com/nickwebt800/browser-whisper-benchmark |

- 🟢 Vazamento de memória de GPU de cerca de 650 MB por janela de 30 s na série 4.x (#1739); correção na PR #1755, aberta. Relato de perda do dispositivo e queda silenciosa para WASM numa Iris Xe: https://github.com/hyperaudio/hyperaudio-lite-editor/issues/462.
- 🟢 Precisão: q4f16 do small transcreve errado em WebGPU por estouro de fp16 (ORT #31626, aberta); encoder fp16 do turbo com problemas (#1590, aberta); q8 em WebGPU produz texto sem sentido (#1317); corrupção numérica determinística em Iris Xe mesmo em fp32 num modelo de voz sintetizada (ORT #29807).
- 🟡 Não há medição recente de Transformers.js 4.x com Whisper em Iris Xe, UHD ou Radeon integrada. A meta de 10 s por minuto no Windows não pode ser estimada com segurança; o modo WASM com o base provavelmente a ultrapassa.

## 6. Decodificação do áudio

- 🟢 O Chrome decodifica Ogg/Opus, MP3 e, nas versões com marca (Windows e macOS), MP4/AAC, sem programa externo. Fonte: https://www.chromium.org/audio-video/.
- 🟢 `decodeAudioData` reamostra para a taxa do contexto; `OfflineAudioContext` aceita 16 000 Hz e 1 canal. Só existe em janela. Fonte: https://webaudio.github.io/web-audio-api/ (rascunho de 2026-09-09).
- 🟢 Alternativa: `AudioDecoder` (WebCodecs) existe em worker, mas não desmultiplexa Ogg; a extensão teria de extrair os pacotes Opus das páginas Ogg. Descartada por custo.
- 🟡 As mensagens de voz do WhatsApp são Ogg/Opus mono (documentação da Meta para envio de mídia); a taxa de amostragem de entrada não foi confirmada, o que não importa, porque a decodificação reamostra.

## 7. Download, integridade e armazenamento

- 🟢 Verificado com curl: `huggingface.co/<repo>/resolve/<rev>/<arquivo>` responde 302 com `access-control-allow-origin` igual à origem `chrome-extension://…`, `accept-ranges: bytes` e pré-requisição liberando `range`. O destino atual, `us.aws.cdn.hf.co/xet-bridge-us/…`, é assinado e vale 1 h; com `Range`, respondeu 206 e `access-control-allow-origin: *`. Por isso não há `host_permissions`.
- 🟢 `X-Linked-Etag` é o SHA-256 do arquivo; a API `GET /api/models/<repo>/tree/<sha>/onnx` devolve `lfs.oid`, `size` e `xetHash`. No navegador, os cabeçalhos do 302 ficam opacos; por isso o hash vai embutido no catálogo, levantado uma vez, na Fase 1.
- 🟢 Limites sem autenticação: 3 000 resoluções e 500 chamadas de API a cada 300 s.
- 🟢 A Cache API rejeita respostas 206 e esquemas fora de http(s) (https://w3c.github.io/ServiceWorker/). OPFS: `createWritable` em janela e `createSyncAccessHandle` só em worker dedicado.
- 🟢 `unlimitedStorage` dá cota ilimitada a `chrome.storage.local`, IndexedDB, Cache Storage e OPFS e não gera aviso (https://developer.chrome.com/docs/extensions/reference/permissions-list, 2026-09-09). O armazenamento da extensão é comum ao service worker, às páginas e ao documento offscreen, e não é apagado com os dados de navegação.
- 🟡 A especificação Fetch preserva o cabeçalho `Range` ao seguir o redirecionamento; não foi testado no Chrome. A Fase 1 cobre isso no teste de retomada.

## 8. Detecção de hardware

- 🟢 `navigator.deviceMemory`: até o Chrome 146 o máximo era 8; desde o 147, no desktop, os valores vão de 2 a 32.
- 🟢 `chrome.system.memory.getInfo()` devolve `capacity` em bytes; a permissão `system.memory` não gera aviso; a API não existe no documento offscreen, só nas páginas da extensão. Fonte: https://developer.chrome.com/docs/extensions/reference/api/system/memory.
- 🟢 `navigator.gpu.requestAdapter()` devolve `null` com a aceleração desligada, a GPU bloqueada ou o processo de GPU caído; `adapter.info` desde o Chrome 127; `adapter.features.has('shader-f16')`; limites reais em `adapter.limits`. Fonte: https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips.
- 🟡 `navigator.userAgentData.getHighEntropyValues(['architecture', 'bitness', 'platformVersion'])` distingue Apple Silicon de Intel e o Windows de 64 bits; a Fase 3 confere o valor devolvido nas duas máquinas.

## 9. Loja de extensões

- 🟢 Item não listado passa pela mesma revisão e exige a mesma ficha de um item público: ícone de 128 px no pacote, ao menos uma captura de 1280x800 ou 640x400, promo pequeno de 440x280, descrição, categoria. Fontes: https://developer.chrome.com/docs/webstore/cws-dashboard-distribution e https://developer.chrome.com/docs/webstore/images. O manifesto atual não tem `icons`.
- 🟢 Conta: taxa única, e-mail de contato verificado, verificação em duas etapas, declaração de não comerciante, duas vagas de extensão por conta. Prazo de revisão oficial: "within a few days, but it can take up to a few weeks".
- 🟢 Pesos de modelo são dados: o FAQ de código remoto exclui "data or things like JSON or CSS" (https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code). Precedente publicado que baixa modelos em tempo de execução: https://huggingface.co/blog/transformersjs-chrome-extension (2026-04-23).
- 🟢 A CSP mínima para WebAssembly é exatamente `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';`.
- 🟢 O tratamento só local também se declara (FAQ de dados do usuário, perguntas 3, 4 e 14), e "Personal communications" é tipo de dado. A política de privacidade é obrigatória, por URL pública.
- 🟢 Avisos na instalação: `nativeMessaging` ("Comunicar-se com aplicativos nativos de colaboração"); `tabs` ("Ler seu histórico de navegação"); `content_scripts` em web.whatsapp.com ("Ler e alterar seus dados em web.whatsapp.com"). `offscreen`, `storage`, `unlimitedStorage` e `system.memory` não geram aviso.
- 🟡 Campo `key`: a documentação oficial manda copiar a chave pública do painel para o manifesto local depois do primeiro upload (https://developer.chrome.com/docs/extensions/reference/manifest/key). A recusa do `key` num item novo vem de relato da comunidade (https://github.com/testomatio/browser-extension/issues/391, 2026-09-25).
- 🟢 O `allowed_origins` do host nativo aceita vários IDs. No Chrome for Testing a partir do 146, os hosts ficam em `~/Library/Application Support/Google/ChromeForTesting/NativeMessagingHosts/`, o que afeta o teste com o motor real (https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging).
- 🟢 Edge e Brave instalam a partir da loja do Chrome, com o mesmo ID.

## 10. Padrões aplicados

- **Porta e adaptador com canal abstrato.** O adaptador do motor no navegador repete a forma de `AdaptadorMotorLocal` sobre `CanalNativo`: um canal injetável com o documento offscreen, simulável no Node. Assim, a bateria de contrato roda sem navegador.
- **Composição com reserva e quarentena.** O motor composto é um disjuntor simples: a falha do auxiliar desvia os pedidos para o navegador por um intervalo fixo, sem sondar o host a cada pedido.
- **Armazenamento endereçado por conteúdo.** Cada arquivo de pesos é identificado pela revisão e pelo SHA-256 embutidos; atualizar o modelo é publicar outra versão da extensão.
- **Download retomável.** `Range` a partir do tamanho já gravado, com hash incremental e repetição limitada, conforme o EC-02 e o EC-03 de `compatibilidade-instalacao.md`.
- **Cancelamento cooperativo.** `AbortSignal` atravessa a porta e vira mensagem nos limites entre contextos; o encerramento do worker fica como último recurso.

## 11. Incertezas que a Fase 0 ou a Fase 1 resolvem

- WebGPU em worker criado por documento offscreen (Fase 0, primeira hora).
- Desempenho e memória de GPU do Transformers.js 4.3.0 com Whisper no notebook de referência (Fase 0).
- Eficácia da reciclagem do worker contra o vazamento da issue #1739 sem carimbos de tempo (Fase 0).
- Preservação do `Range` no redirecionamento pelo Chrome (Fase 1).
- `chrome.tabs.query({ url })` sem a permissão `tabs`, só com o acesso dado pelos `content_scripts` (Fase 2).
- Valores de `userAgentData` no Mac Apple Silicon e no Windows (Fase 3).
- Recusa do `key` no upload e prazo real de revisão (Fase 0, rascunho; Fase 4, envio).
