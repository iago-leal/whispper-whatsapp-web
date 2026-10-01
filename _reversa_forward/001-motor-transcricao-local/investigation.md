# Investigation: Motor de transcrição local

> Identificador: `001-motor-transcricao-local`
> Data: `2026-09-30`
> Confidência: 🟢 verificado nesta sessão (documentação lida ou código inspecionado); 🟡 conhecimento prévio não reconferido

## 1. Ambiente do usuário técnico

Levantado nesta sessão, na máquina de desenvolvimento, que é também a de uso. 🟢

| Item | Valor |
|------|-------|
| Processador e memória | Apple M1, 16 GiB |
| Node | 24.13.0 (`/usr/local/bin/node`), com npm e npx |
| Python com mlx-whisper | 3.14, do python.org (`/Library/Frameworks/Python.framework/Versions/3.14/bin/python3`), com pytest |
| Primeiro `python3` do PATH | 3.14.7 do Homebrew (`/opt/homebrew/bin/python3`), **sem** mlx-whisper |
| Bibliotecas | mlx-whisper 0.4.3, mlx 0.31.2, numpy 1.26.4 |
| ffmpeg | `/opt/homebrew/bin/ffmpeg` |
| Outras ferramentas | uv, openssl (Homebrew), `say` com vozes pt_BR (Eddy, Flo e outras), `lsof` |
| Modelos no cache | `~/.cache/huggingface/hub`: tiny, base, small, medium, large-v3, turbo e large-v3-turbo (1,5 GB, dois snapshots; `refs/main` aponta para `a4aaeec0…`) |
| Fluxo manual atual | Skill de transcrição do usuário com `whisper-medium-mlx` e idioma fixo em português |

Consequências para o plano: o instalador precisa escolher o interpretador certo (DT-07), e o modelo é resolvido por `refs/main` (DT-06).

## 2. Native Messaging no Chrome

Fonte: [Native messaging, Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging), lida nesta sessão. 🟢

- Manifesto do host, nível de usuário, no macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/<nome>.json`.
- O campo `name` aceita apenas letras minúsculas, dígitos, sublinhado e ponto; não começa nem termina com ponto, nem tem dois pontos seguidos. Daí `whispper_whatsapp_web.motor`.
- `path` precisa ser absoluto no macOS.
- `allowed_origins` não aceita curingas: cada extensão autorizada é listada como `chrome-extension://<id>/`.
- Cada mensagem é JSON em UTF-8, precedido do tamanho em 32 bits na ordem de bytes nativa (little-endian no Apple Silicon).
- Tamanho máximo: 1 MB do host para a extensão; 64 MiB da extensão para o host.
- O Chrome passa a origem da extensão como primeiro argumento do host.
- `connectNative` inicia o processo do host e o mantém vivo até a porta ser destruída.
- A saída padrão é exclusiva do protocolo; depuração vai para a saída de erro.
- Mensagens de erro expostas em `chrome.runtime.lastError`: "Specified native messaging host not found", "Access to the specified native messaging host is forbidden", "Native host has exited", "Failed to start native messaging host", "Invalid native messaging host name specified", "Error when communicating with the native messaging host". O adaptador as traduz para MOTOR_INDISPONIVEL com motivo em português.

Fonte: [Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), lida nesta sessão. 🟢

- Desde o Chrome 105, conectar-se a um host com `connectNative` mantém o service worker vivo; se o host cair, a porta fecha e o service worker termina após os temporizadores.
- Sem isso, o service worker é encerrado após 30 s de inatividade ou quando uma única chamada passa de 5 min.

Consequência: a conexão aberta pela primeira verificação sustenta o service worker e o host enquanto o WhatsApp Web estiver em uso; a queda de qualquer lado é tratada pela reconexão única do RF-10.

## 3. mlx-whisper 0.4.3

Código inspecionado nesta sessão na instalação local. 🟢

- `transcribe(audio, *, path_or_hf_repo, verbose=None, temperature, compression_ratio_threshold=2.4, logprob_threshold=-1.0, no_speech_threshold=0.6, condition_on_previous_text=True, initial_prompt, word_timestamps=False, …, hallucination_silence_threshold=None, **decode_options)`. `audio` aceita caminho, `np.ndarray` ou `mx.array`. Com `language` ausente em `decode_options`, o idioma é detectado.
- `verbose=True` imprime o texto transcrito; `verbose=False` mostra barra de progresso; `verbose=None` não imprime nada. O plano usa `None` (DT-04, RNF de privacidade).
- `ModelHolder` guarda o modelo em atributo de classe e só recarrega se o caminho mudar: no mesmo processo, o modelo fica na memória entre chamadas (RF-05).
- `load_model(path_or_hf_repo)` usa o caminho diretamente se ele existir; caso contrário, chama `snapshot_download`, que acessa a rede. O plano passa o caminho local do snapshot (DT-06).
- `load_audio` executa `ffmpeg` pelo nome, exigindo-o no PATH, e aceita arquivo ou entrada padrão. O plano não o usa (DT-03).
- O pulo de segmento sem fala exige as duas condições: `no_speech_prob` acima de `no_speech_threshold` **e** `avg_logprob` abaixo de `logprob_threshold`. Por isso a DT-14 acrescenta a porta de energia e o filtro por segmento.
- `fp16` vem ligado por padrão: o modelo é carregado em `float16`.
- `mlx.core` expõe `clear_cache`, `get_active_memory` e `get_peak_memory`, úteis para medir a memória na prova de conceito.

## 4. Cache de modelos do Hugging Face

🟡 Fontes: [Manage huggingface_hub cache-system](https://huggingface.co/docs/huggingface_hub/guides/manage-cache) e [Environment variables](https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables).

- Estrutura: `models--<org>--<nome>/refs/<ramo>` contém o hash do commit; `snapshots/<hash>/` contém os arquivos, como ligações para `blobs/`. Confirmada no cache local. 🟢
- `HF_HUB_OFFLINE=1` impede chamadas HTTP do cliente; `HF_HUB_DISABLE_TELEMETRY=1` desliga a telemetria.

## 5. Identificador estável de extensão sem empacotamento

🟡 Fonte: [Manifest key](https://developer.chrome.com/docs/extensions/reference/manifest/key).

- Com o campo `key` (chave pública em base64, formato DER) no `manifest.json`, o identificador deixa de depender do caminho da pasta.
- O identificador é derivado dos primeiros 128 bits do SHA-256 da chave pública em DER, escritos em hexadecimal e com cada dígito de 0 a f trocado pela letra de a a p. O instalador reproduz esse cálculo (DT-12).

## 6. TypeScript sem empacotador

🟡 Fontes: [Node.js, Modules: TypeScript](https://nodejs.org/api/typescript.html); notas de versão do TypeScript 5.7 (`rewriteRelativeImportExtensions`) e 5.8 (`erasableSyntaxOnly`).

- O Node 23.6 em diante remove anotações de tipo nativamente; o Node 24 local roda `node --test` sobre arquivos `.ts` com sintaxe apagável, sem enums, namespaces nem propriedades de parâmetro.
- Com `rewriteRelativeImportExtensions`, o código importa `./x.ts`, e o `tsc` emite `./x.js`, o que serve aos dois ambientes: testes no Node e service worker no Chrome.
- `erasableSyntaxOnly` faz o compilador recusar a sintaxe que o Node não sabe remover.

## 7. Alternativas avaliadas

| Tema | Escolhida | Descartadas e motivo |
|------|-----------|----------------------|
| Caminho até o Whisper | Aplicativo auxiliar via Native Messaging | Whisper no navegador: decisão do usuário registrada na spec; fica como adaptador futuro. |
| Linguagem do auxiliar | Python | Swift ou Go: exigiriam outro motor de inferência e perderiam o mlx-whisper já instalado. |
| Modelo de processos | Principal e trabalhador | Processo único: não interrompe cálculo na GPU nem devolve toda a memória; interrupção cooperativa não cobre travamento dentro de um segmento. |
| Decodificação | ffmpeg com caminho absoluto, por pipe | `load_audio`: depende do PATH e de arquivo em disco. |
| Ambiente de execução | Interpretador existente | Ambiente virtual próprio: instalação com rede, contrária à RN-01. |
| Formato da configuração | TOML | JSON: sem comentários, pior para edição manual; o Python lê TOML na biblioteca padrão desde a 3.11. |
| Registro de desempenho | TSV | JSON Lines: menos legível na revisão manual prevista no RNF de observabilidade. |
| Linguagem da extensão | TypeScript com sintaxe apagável | JavaScript: sem tipos para as portas, que são o centro da arquitetura. |
| Build e testes da extensão | `tsc` e `node --test` | esbuild, Vite, Vitest: dependências sem ganho neste tamanho. |
| Silêncio | Porta de energia e filtro por segmento | `hallucination_silence_threshold`: exige carimbo por palavra; lista de frases: frágil. |
| Interrupção por prazo | Encerrar o trabalhador | Cancelamento cooperativo: o mlx-whisper não oferece ponto de cancelamento dentro de um segmento. |

## 8. Padrões aplicáveis

- **Portas e adaptadores:** a porta é o tipo consumido pelo núcleo; o adaptador depende de uma abstração de canal; o canal do Chrome é o único trecho que toca a API do navegador, coerente com a porta Navegador da spec do núcleo.
- **Testes de contrato:** uma bateria única, parametrizada pela implementação, roda contra o adaptador simulado e contra o real.
- **Supervisor e trabalhador:** o principal supervisiona um trabalhador descartável; falha, prazo e ociosidade se resolvem encerrando e recriando o trabalhador.
- **Enquadramento por tamanho:** leitura exata de 4 bytes e do corpo, com recusa de tamanho acima do limite antes de alocar memória.
