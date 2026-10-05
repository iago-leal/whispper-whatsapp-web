# Roadmap: Motor de transcrição no navegador

> Identificador: `007-motor-whisper-navegador`
> Data: `2026-10-04`
> Requirements: `_reversa_forward/007-motor-whisper-navegador/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O Whisper passa a rodar num segundo adaptador da porta `MotorDeTranscricao`, hospedado fora do service worker. O service worker cria sob demanda um documento offscreen único (motivo `WORKERS`), que decodifica o áudio com a Web Audio API em 16 kHz mono e entrega as amostras a um worker dedicado; nele, o Transformers.js 4.3.0, empacotado com os arquivos do ONNX Runtime, executa o modelo por WebGPU, ou por WebAssembly quando a medição o admitir. Os pesos vêm uma única vez da Hugging Face, numa revisão fixada por commit, por download retomável gravado no armazenamento privado da origem (OPFS), e são conferidos pelo SHA-256 que a própria extensão traz no catálogo de modelos. No service worker, um motor composto entrega o pedido ao aplicativo auxiliar quando ele responde "pronto" e ao motor no navegador nos demais casos, e registra cada pedido num registro local sem conteúdo. A porta ganha um sinal de cancelamento, para que o tempo-limite do núcleo libere de fato o motor, e o núcleo passa a aguardar o motor pronto exibindo "preparando". A página de boas-vindas perde a etapa do instalador e ganha a do download do modelo, e a extensão vai à loja como "Silente", item não listado. Tudo o que depende de número (modelo padrão, precisão, modo sem aceleração, requisitos mínimos, reciclagem do worker) se fixa na Fase 0, o teste da premissa, que serve de portão para as demais.

## 2. Princípios aplicados

Não há `.reversa/principles.md` neste projeto. Ficam registradas as convenções das specs e do PRD que a feature precisa respeitar ou que ela altera por decisão já tomada nos requirements.

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Portas sem tipo de navegador (`extension/src/dominio/motor-de-transcricao.ts`, cabeçalho "Nenhuma dependência do Chrome") | O sinal de cancelamento é `AbortSignal`, padrão da plataforma web disponível também no Node; o catálogo de modelos e os requisitos mínimos são dados puros; `chrome.*` fica nos adaptadores e no service worker | respeita |
| Arquitetura hexagonal; núcleo, fila, janela e integração não são redesenhados (PRD, seção 6; `pre-spec.md`, restrições) | O motor entra como adaptador novo. O núcleo recebe dois ajustes pontuais: repassa o sinal de cancelamento e aguarda o motor pronto antes de pedir o áudio (D-10, D-11) | respeita, com ajuste aditivo de contrato |
| Transcrição local, sem rede durante a transcrição (`_reversa_sdd/sdd/motor-transcricao-local.md`, G-03, RF-12 e NG-07) | O download dos pesos acontece só na página de boas-vindas, nunca durante um pedido; com o modelo baixado, a transcrição dispensa a rede (RF-09). A única conexão nova é a da RN-03 | respeita, com a exceção aprovada na RN-03 |
| Whisper no navegador fora do escopo (`motor-transcricao-local.md`, NG-01) | A feature implementa exatamente o que a NG-01 adiava | conflita: revogada pela RN-01; o `/reversa-sync` registra o adendo, sem reescrever a spec |
| Instalador do aplicativo auxiliar para o leigo, assinado e notarizado (`_reversa_sdd/sdd/compatibilidade-instalacao.md`, RF-06 a RF-09 e RNF-03) | A página de boas-vindas deixa de oferecer instalador; o auxiliar continua só para o usuário técnico, instalado pelo terminal | conflita: substituído pela RN-02 |
| Nada de conteúdo persistido (`_reversa_sdd/sdd/janela-flutuante.md`, seção 12; `motor-transcricao-local.md`, RF-13) | Áudio e texto ficam só na memória do pedido; o OPFS guarda apenas os pesos; o registro de desempenho guarda números e o nome do modelo | respeita |
| Um pedido por vez, na ordem de chegada (`motor-transcricao-local.md`, RF-07) | O servidor no documento offscreen tem fila própria de um pedido ativo (RF-13) | respeita |
| Sem código remoto no Manifest V3 (`pre-spec.md`, restrições) | Todo o JavaScript e o WebAssembly vão no pacote; um teste de build reprova URL de CDN no código empacotado (D-02) | respeita |
| Seletores da página só no módulo de configuração (`_reversa_sdd/sdd/integracao-whatsapp-web.md`, RF-13) | Nenhum seletor novo; a integração com a página não muda | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Documento offscreen único, motivo `WORKERS`, criado pelo service worker; nele, a decodificação do áudio (`OfflineAudioContext` de 1 canal a 16 kHz) e um worker dedicado de módulo para a inferência, que recebe as amostras como `Float32Array` transferível | O service worker morre após 30 s ocioso e não tem `AudioContext`; o documento offscreen com motivo diferente de `AUDIO_PLAYBACK` não tem limite de vida; o worker mantém o documento livre para responder ao service worker durante a inferência; o processamento fica no processo da extensão, e não no da página do WhatsApp Web (RNF de responsividade) | Inferência no service worker, como no exemplo oficial da Hugging Face (perde o modelo a cada encerramento, contra o RF-12); no script de conteúdo (disputa a thread da página); no documento offscreen sem worker (reserva, se o WebGPU falhar no worker) | 🟡 WebGPU em documento offscreen e em worker criado por ele não tem confirmação oficial; a Fase 0 confere isso primeiro |
| D-02 | `@huggingface/transformers` 4.3.0 em versão exata, com `ort-wasm-simd-threaded.asyncify.wasm` e `.mjs` do `onnxruntime-web` da mesma versão no pacote; `wasmPaths` como prefixo local, `useWasmCache=false`, `allowRemoteModels=false`, `useBrowserCache=false` e cache próprio (`useCustomCache`); CSP `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';`; teste de build que reprova `cdn.jsdelivr.net` e código em base64 no `dist/` | Sem `wasmPaths`, a 4.3.0 aponta o runtime para o jsDelivr, o que a loja rejeita como código remoto ("Blue Argon"); a CSP padrão do MV3 desliga o WebAssembly | whisper.cpp em WebAssembly (sem WebGPU no exemplo oficial, 2 a 3 vezes o tempo real no base, isto é, 20 a 30 s por minuto, e exige isolamento de origem); `onnxruntime-web` sem Transformers.js (reescrever extrator de features, tokenizador e decodificação) | 🟡 |
| D-03 | Detecção de idioma própria: um passe do encoder sobre os primeiros 30 s e um passo do decodificador só com `<\|startoftranscript\|>`, escolhendo o token de idioma de maior probabilidade; o código vai em `language` na transcrição | A pipeline 4.3.0 não detecta o idioma: sem `language`, força `<\|en\|>` ("TODO: Implement language detection"); a PR #1541, que faz o mesmo cálculo, segue aberta | Esperar a PR; fixar "pt" (viola o RF-04); transcrever duas vezes e comparar | 🟡 a necessidade está verificada no código; o método segue a PR #1541 |
| D-04 | Áudio acima de 30 s em janelas de 30 s com sobreposição de 5 s (`chunk_length_s: 30`, `stride_length_s: 5`), sem carimbos de tempo | Padrão da pipeline; o custo é de cerca de 1,5 vez o do encoder, e os carimbos por palavra agravam o vazamento de memória da issue #1739 | Janelas sem sobreposição cortadas por silêncio (exige detecção de voz); laço sequencial do `generate` com carimbos | 🟡 |
| D-05 | Catálogo de modelos embutido na extensão, com o padrão fixado pela Fase 0. Precisões: encoder fp32 e decoder q4 em WebGPU; q8 só em WASM; nenhum fp16, q4f16 ou q8 em WebGPU. Candidatos medidos: base fp32+q4 (206,1 MB), small q4+q4 (299,3 MB), small fp32+q4 (586,0 MB), large-v3-turbo q4+q4 (759,1 MB, só no Mac) e, na reserva sem aceleração, base q8+q8 (76,9 MB) | O RF-05 manda escolher pela medição no notebook de referência; fp16 e q4f16 têm defeitos numéricos abertos em GPU Intel (ORT #31626, transformers.js #1590) e o q8 em WebGPU produz texto sem sentido (#1317) | Um modelo por máquina; o large-v3-turbo no Windows (1,6 GB na configuração do demonstrativo oficial) | 🟡 depende da Fase 0 |
| D-06 | Pesos no OPFS, gravados pelo worker com `createSyncAccessHandle`; download retomável por `Range` a partir do tamanho já gravado, na URL `resolve/<commit>/<arquivo>`; nova resolução quando a URL assinada do CDN expira (1 h); 30 s sem bytes contam como falha; até 3 retomadas automáticas a cada 10 s, depois o botão "Tentar de novo" (EC-02 de `compatibilidade-instalacao.md`); permissão `unlimitedStorage` | A Cache API rejeita respostas 206, o que impede a retomada do RF-08; o OPFS é compartilhado por todas as páginas da extensão e não é apagado com os dados de navegação; `unlimitedStorage` evita o despejo do modelo e não gera aviso | Cache API; IndexedDB em blocos; o cache padrão do Transformers.js | 🟡 a preservação do `Range` no redirecionamento só foi testada com curl |
| D-07 | Integridade: tamanho e SHA-256 (`lfs.oid` da revisão fixada) de cada arquivo no catálogo; hash incremental durante o download, por biblioteca empacotada; nova conferência a cada carga, sobre os mesmos bytes entregues ao runtime; divergência apaga o arquivo e reinicia o download, e duas falhas seguidas levam ao botão "Tentar de novo" | O RF-07 exige que nenhum arquivo adulterado seja usado; conferir os bytes que vão ao runtime fecha a janela entre a verificação e o uso. Se a Fase 0 medir mais de 3 s nessa conferência, vale a alternativa de marca de verificação com tamanho e data de modificação | Conferir só no fim do download; ler o hash do cabeçalho `X-Linked-Etag` em tempo de execução (a resposta 302 é opaca no navegador) | 🟡 |
| D-08 | Motor composto no service worker: o aplicativo auxiliar atende quando `verificar` devolve "pronto"; nos demais casos atende o motor no navegador. `MOTOR_INDISPONIVEL` ou `VERSAO_INCOMPATIVEL` vindo do auxiliar reencaminha o mesmo pedido, uma vez, ao motor no navegador e põe o auxiliar em quarentena de 5 min. O motor no navegador só é preparado quando o auxiliar não está pronto. Estado e resultado informam a `origem` | RF-19: o auxiliar é modo de desempenho no Mac e sua queda não exige ação do usuário; a quarentena evita esperar 10 s de prazo de verificação a cada pedido quando o host trava; preparar os dois motores no Mac ocuparia memória sem uso | Sempre o motor no navegador; auxiliar obrigatório no Mac; escolha manual no painel | 🟡 política inferida do RF-19 |
| D-09 | Ciclo de vida do documento offscreen: criação sob demanda (`verificar`, `preparar_modelo`, `transcrever`), com trava contra criação dupla por `chrome.runtime.getContexts`; fechamento 2 min depois de não restar aba do WhatsApp Web nem download em curso; recriação transparente se o documento tiver sumido | Mantém o modelo carregado enquanto houver aba aberta (RF-12) e devolve a memória da GPU depois; a permanência por horas não está documentada, por isso o motor tolera o sumiço | Documento permanente enquanto o navegador estiver aberto; fechar a cada pedido | 🟡 |
| D-10 | Cancelamento na porta: `transcrever(audio, tipoDeMidia, opcoes?: { sinal?: AbortSignal })`. O núcleo aborta o sinal no `TEMPO_ESGOTADO` e quando descarta o pedido; o cliente do script de conteúdo envia `cancelar_transcricao` com o `idPedido`; o motor no navegador retira o pedido da fila interna ou interrompe a geração, conferindo o sinal entre as janelas; sem confirmação em 10 s, encerra o worker e cria outro. O motor local aceita e ignora o sinal | RF-22: sem cancelamento, o pedido seguinte fica atrás do anterior dentro do motor e também esgota o prazo; o protocolo 1 do auxiliar não tem cancelamento, e o host já tem prazo próprio | Prazo próprio no adaptador (duplicaria a regra do RNF-02 do núcleo); nenhum cancelamento | 🟡 |
| D-11 | "Preparando": ao receber "iniciando" de `verificar`, o núcleo exibe `transcrevendo` com `preparando: true` e consulta o motor a cada 1 s, por até 120 s, antes de pedir o áudio; o prazo do RF-11 do núcleo passa a contar do envio ao motor (`fila.reiniciarPrazo`). Esgotados os 120 s, o pedido termina em `MOTOR_INDISPONIVEL`, com o motivo "o motor demorou demais para ficar pronto". O painel mostra "Preparando o motor…" | RF-16; a carga do modelo e a compilação dos shaders em GPU integrada podem levar dezenas de segundos e consumiriam o prazo mínimo de 60 s de um áudio curto | Estado de exibição novo; manter o prazo contado desde a saída da fila | 🟡 |
| D-12 | Erros do RF-14: sem modelo, `MOTOR_INDISPONIVEL` com o motivo "modelo de fala não baixado" e a instrução "Abra o painel do Silente e conclua a preparação"; falha de carga ou perda do dispositivo de GPU sem reserva em WASM, `MOTOR_INDISPONIVEL` com o motivo "o computador não tem recursos para carregar o modelo"; decodificação impossível, `FALHA_NA_TRANSCRICAO` com o motivo "áudio ilegível". Nunca há download fora da página de boas-vindas | RF-14 e NG-07 de `motor-transcricao-local.md` | Baixar o modelo no primeiro clique | 🟢 |
| D-13 | Reciclagem do worker depois de N janelas de 30 s processadas ou de X min ocioso, com N e X fixados na Fase 0 pela medição do crescimento da memória de GPU | Issue #1739: vazamento de cerca de 650 MB por janela na série 4.x, com a correção (PR #1755) ainda fora da 4.3.0 | Esperar a correção; recarregar o modelo a cada pedido | 🔴 sem medição; mitigação inferida |
| D-14 | Registro de desempenho gravado pelo service worker em `chrome.storage.local` (chave `whispper_registro_desempenho`, até 1 000 linhas, descarte das mais antigas): instante, duração do áudio, processamento, carregamento, modelo, origem e resultado, sem texto. O painel exporta CSV | RF-20, com a coluna de carregamento, que torna verificável o RF-12; só o service worker sabe qual motor atendeu | Registro no script de conteúdo; no OPFS pelo documento offscreen, que não tem `chrome.storage` | 🟡 |
| D-15 | Compatibilidade pelos requisitos do navegador: sistema e arquitetura por `navigator.userAgentData.getHighEntropyValues` (o `userAgent` do Mac declara Intel mesmo no Apple Silicon, e o código atual presume arm64); memória total por `chrome.system.memory` (permissão sem aviso), com `navigator.deviceMemory` como reserva; espaço por `navigator.storage.estimate()`; aceleração por `navigator.gpu.requestAdapter()`. Sem adaptador, vale a resposta do RF-15 lida em `permitidoSemAceleracao` no catálogo. Os limites saem da Fase 0 | RF-18, RF-15 e RN-04; corrige o Mac Intel hoje aprovado por engano em `extension/src/dominio/compatibilidade.ts` | Verificação só pelo `userAgent`; testar com um modelo de verdade antes do aviso (exigiria download, contra a RN-04) | 🟡 |
| D-16 | Página de boas-vindas em 5 etapas: privacidade, com divulgação do download do modelo e consentimento afirmativo; compatibilidade; preparo do modelo, com percentual, tempo estimado, retomada e nova tentativa, pulado quando o modelo já está verificado; teste com a amostra sintética, forçando o motor no navegador; pronto. Os `alert()` dão lugar a mensagens na própria página, e a etapa salva é remapeada de 6 para 5 etapas | RF-17; a política da loja em vigor desde 2026-08-01 pede divulgação e consentimento na interface | Manter a etapa do aplicativo como opcional (a decisão da RN-02 a dispensa) | 🟡 |
| D-17 | Teste de sanidade: a transcrição de teste confere o trecho esperado da amostra sintética; se o WebGPU devolver texto sem ele, a extensão marca o WebGPU como não confiável no computador e passa ao WASM quando o catálogo o permite, ou declara a incompatibilidade | Defeitos numéricos determinísticos no WebGPU em GPU Intel (ORT #29807, #31626) produzem texto errado sem erro aparente | Confiar no primeiro resultado | 🟡 |
| D-18 | Manifesto: nome "Silente"; descrição com menção referencial ao WhatsApp Web e aviso de não afiliação na ficha; ícones de 16, 32, 48 e 128 px; permissões `nativeMessaging`, `storage`, `offscreen`, `unlimitedStorage` e `system.memory`; `tabs` retirada se `chrome.tabs.query({ url })` funcionar com o acesso dado pelos `content_scripts`; CSP de D-02; `minimum_chrome_version` 127; nenhuma `host_permissions` | RN-06 e RF-21; `tabs` exibe "Ler seu histórico de navegação", ruim para um produto vendido pela privacidade; a Hugging Face e o CDN respondem com CORS à origem da extensão; `adapter.info` exige o Chrome 127 | Declarar `huggingface.co` em `host_permissions` (gera aviso e não cobre o CDN); manter `tabs` sem conferir | 🟡 |
| D-19 | Identidade e pacote: rascunho enviado à loja no primeiro dia, para obter o ID; a chave pública mostrada pela loja substitui o `key` do manifesto local, e o ID local passa a coincidir com o da loja, de modo que `auxiliar/whispper_motor/instalacao.py`, que deriva o ID do `key`, siga sem alteração; `npm run empacotar` gera o .zip da loja sem `key`, sem `dist/instaladores` e depois do teste de código remoto; `npm run build` deixa de chamar `build:instalador` | A loja recusa item novo com `key` ("key field is not allowed in manifest", relato de 2026-09-25); o ID nasce no primeiro upload; o instalador .pkg deixa de ser oferecido (RN-02) | Manter a chave atual e acrescentar o ID da loja ao `allowed_origins` (exigiria alterar o instalador do auxiliar) | 🟡 a recusa do `key` vem de relato da comunidade |
| D-20 | Textos visíveis ao usuário passam de "Whispper" a "Silente"; identificadores internos (classes `whispper-*`, chaves `whispper_*`, nome do host nativo) ficam como estão | RN-06 e RF-21 tratam do nome público; renomear chaves e o host exigiria migração sem ganho para o usuário | Renomear tudo | 🟢 |
| D-21 | Publicação: textos em `publicacao/` no repositório (`politica-de-privacidade.html` e `ficha-da-loja.md`); política hospedada em serviço estático gratuito, a escolher no to-do entre Cloudflare Pages e GitHub Pages; na aba de privacidade da loja, "Personal communications" para a funcionalidade central, código remoto "não", as três certificações e a frase de uso limitado; instruções ao revisor com vídeo, porque a revisão exige uma conta do WhatsApp | RF-21; o FAQ de dados da loja manda declarar mesmo o tratamento só local; a rejeição "Yellow Magnesium" alcança funcionalidade que o revisor não consegue testar | Não declarar categoria, como faz uma extensão publicada (declaração e comportamento ficariam inconsistentes) | 🟡 |
| D-22 | Testes: a bateria de contrato `extension/test/contrato-motor.ts` roda contra o adaptador no navegador com canal simulado no Node e contra o motor real no Chrome for Testing com `MOTOR_NAVEGADOR=1`, sobre as amostras sintéticas, em WASM se o WebGPU faltar no modo sem janela; medições de desempenho só na Fase 0 e na aceitação manual | RF-01 exige o mesmo contrato com os testes do núcleo verdes; desempenho em GPU real não cabe em teste automatizado | Medir desempenho no E2E | 🟡 |

## 4. Premissas

Não há `[DÚVIDA]` aberta no `requirements.md`. Restam premissas técnicas e operacionais que a Fase 0 confirma ou derruba.

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|----------|----------------------------------|-----------------|
| O RF-05 pede o modelo padrão e a medição registrados "antes do plano"; o teste da premissa ainda não foi feito. Este plano o trata como Fase 0 e portão, e mantém como parâmetro tudo o que depende dele | Seção 5, RF-05; seção 7, cenário "Modelo padrão justificado por medição" | Se nenhum modelo atender ao notebook de referência, valem as condições de revisão de `decision.md`, e as Fases 1 a 4 não começam |
| Há um notebook Windows de referência disponível na Fase 0 e no piloto | Seção 6, RNF de desempenho; seção 3, persona leiga | Sem ele, a escolha do modelo e o RF-15 ficam sem base |
| O autor reúne em `amostras/reais/` (não versionado) dez mensagens de voz informais em português, sem dado de paciente, de 5 s a 5 min, além de um áudio em inglês | Seção 5, RF-02 e RF-05; `decision.md`, teste da premissa | As amostras sintéticas são fala lida e não medem o português informal; a pasta está vazia hoje |
| WebGPU funciona em worker criado por documento offscreen no Chrome estável do Windows e do Mac | Seção 5, RF-01 | Reserva: inferência no próprio documento offscreen (D-01) |
| A Hugging Face mantém o repositório e a revisão fixada acessíveis, com CORS e `Range` | Seção 4, RN-03 | O download falha para todos; a extensão informa a falha (RF-08), e um espelho próprio fica para outra feature |
| A loja aprova o item em poucos dias | Seção 5, RF-21 | O piloto atrasa além de 2026-10-18 |

## 5. Delta arquitetural

O projeto nasceu greenfield: os componentes vêm das specs em `_reversa_sdd/sdd/` e dos adendos, não de `architecture.md`.

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| Porta MotorDeTranscricao | `_reversa_sdd/addenda/001-motor-transcricao-local.md` (`extension/src/dominio/motor-de-transcricao.ts`) | contrato-alterado | `opcoes.sinal` em `transcrever`; `origem` nos estados ativos; `origem`, `modelo` e `carregamentoMs` no resultado de sucesso, todos opcionais |
| Adaptador do motor no navegador | `extension/src/adaptadores/motor-navegador/` | componente-novo | Cliente no service worker: canal com o documento offscreen, correlação por `idPedido`, tradução de erros para a porta |
| Servidor do motor no documento offscreen | `extension/src/offscreen/` (página, servidor, decodificador) | componente-novo | Fila de um pedido por vez, decodificação em 16 kHz mono, gestão do worker e do download |
| Trabalhador Whisper | `extension/src/offscreen/trabalhador-whisper.ts` | componente-novo | Transformers.js, detecção de idioma, janelas de 30 s, interrupção, reciclagem |
| Gerenciador de modelo | `extension/src/offscreen/gerenciador-modelo.ts` | componente-novo | Download retomável, OPFS, hash incremental, conferência na carga, cache próprio do Transformers.js |
| Catálogo de modelos | `extension/src/dominio/catalogo-modelos.ts` | componente-novo | Dados puros: revisão, arquivos, tamanhos, SHA-256, precisões, requisitos, modelo padrão |
| Motor composto | `extension/src/adaptadores/motor-composto.ts` | componente-novo | Escolha entre auxiliar e navegador, reencaminhamento e quarentena (RF-19) |
| Service worker | `_reversa_sdd/addenda/001-motor-transcricao-local.md` (`extension/src/background.ts`) | regra-alterada | Hospeda o motor composto; cria e fecha o documento offscreen; registra o desempenho; trata `cancelar_transcricao`, `preparar_modelo` e `exportar_registro` |
| Adaptador do motor local | `_reversa_sdd/sdd/motor-transcricao-local.md#8` (`extension/src/adaptadores/motor-local/adaptador-motor-local.ts`) | regra-alterada | Aceita e ignora o sinal; informa `origem: "auxiliar"`; protocolo 1 sem mudança |
| Cliente do motor no script de conteúdo | `_reversa_sdd/addenda/004-nucleo-transcricao.md` (`extension/src/adaptadores/motor-cliente-content.ts`) | regra-alterada | Gera `idPedido`, repassa o cancelamento ao service worker |
| Núcleo e fila | `_reversa_sdd/sdd/nucleo-transcricao.md#6.1` (`extension/src/dominio/nucleo.ts`, `fila-transcricao.ts`) | regra-alterada | Espera do motor pronto com "preparando"; prazo contado do envio ao motor; aborta o sinal no tempo-limite e no descarte |
| Porta ExibicaoDeTranscricao e janela | `_reversa_sdd/sdd/janela-flutuante.md#6.1` (`extension/src/dominio/exibicao-de-transcricao.ts`, `content/janela-elemento.ts`) | contrato-alterado | `preparando?: boolean` no estado `transcrevendo`; texto "Preparando o motor…" com o mesmo cronômetro |
| Verificação de compatibilidade | `_reversa_sdd/addenda/005-compatibilidade-instalacao.md` (`extension/src/dominio/compatibilidade.ts`) | regra-alterada | Requisitos do motor no navegador; coleta assíncrona; sem instalador sugerido |
| Página de boas-vindas | `_reversa_sdd/addenda/005-compatibilidade-instalacao.md` (`extension/src/onboarding/onboarding.ts`, `extension/onboarding/index.html`, `onboarding.css`) | regra-alterada | 5 etapas; download do modelo; teste forçado no motor do navegador com conferência do trecho; sem `alert()` |
| Etapa de instalação do aplicativo auxiliar na página de boas-vindas | `_reversa_sdd/sdd/compatibilidade-instalacao.md#6.1` (RF-06 a RF-09) | componente-extinto | O leigo não instala mais nada fora do navegador (RN-02) |
| Painel da extensão | `_reversa_sdd/addenda/004-nucleo-transcricao.md` (`extension/src/popup/popup.ts`, `extension/popup/index.html`) | regra-alterada | Motor que atende e modelo; "Preparando o motor…"; exportação do registro; botão para concluir a preparação; nome |
| Manifesto | `extension/manifest.json` | contrato-alterado | Nome, ícones, permissões, CSP, versão mínima, `key` da loja (D-18, D-19) |
| Build e empacotamento | `extension/package.json` | regra-alterada | Novas entradas (offscreen e worker), cópia dos arquivos do ONNX Runtime, `empacotar`, teste de código remoto, `build` sem `build:instalador` |
| Publicação | `publicacao/` | componente-novo | Política de privacidade, textos da ficha, roteiro para o revisor |
| Registro de desempenho da extensão | `extension/src/dominio/registro-desempenho.ts` e adaptador em `extension/src/adaptadores/` | componente-novo | Linhas sem conteúdo, anel de 1 000, CSV |

## 6. Delta no modelo de dados

- Resumo das mudanças: entram o catálogo de modelos embutido, os arquivos de pesos e as marcas de verificação no OPFS, o registro de desempenho e a tabela de requisitos mínimos na versão 2. Os campos opcionais da porta do motor e da exibição se somam aos existentes, a etapa salva da página de boas-vindas passa de 6 para 5 valores, e o instalador sugerido sai do resultado da verificação. Os contadores do painel não mudam.
- Detalhe completo em: `_reversa_forward/007-motor-whisper-navegador/data-delta.md`

## 7. Delta de contratos externos

O protocolo 1 com o aplicativo auxiliar (`contratos/protocolo-1.json`) não muda. Entram um contrato HTTP externo e dois protocolos de mensagens entre contextos da extensão, e duas portas internas se alteram.

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| Download dos pesos na Hugging Face | HTTP | `_reversa_forward/007-motor-whisper-navegador/interfaces/download-pesos-modelo.md` |
| Mensagens para o service worker | mensagens `chrome.runtime` | `_reversa_forward/007-motor-whisper-navegador/interfaces/mensagens-service-worker.md` |
| Protocolo do documento offscreen e do worker | mensagens `chrome.runtime` e `postMessage` | `_reversa_forward/007-motor-whisper-navegador/interfaces/protocolo-offscreen.md` |
| MotorDeTranscricao | porta interna | `_reversa_forward/007-motor-whisper-navegador/interfaces/porta-motor-de-transcricao.md` |
| ExibicaoDeTranscricao | porta interna | `_reversa_forward/007-motor-whisper-navegador/interfaces/porta-exibicao-de-transcricao.md` |

## 8. Plano de migração

O prazo declarado é 2026-10-18. As fases seguem a ordem de dependência; a Fase 0 é portão.

**Fase 0, teste da premissa (2026-10-05 e 06).**
1. Na primeira hora, uma bancada mínima (documento offscreen com worker) confirma que o WebGPU funciona nesse contexto no Mac e no notebook Windows; se não funcionar, a inferência passa ao próprio documento offscreen (D-01).
2. A bancada mede, para cada candidato do D-05 e sobre as amostras reais: segundos de processamento por minuto de áudio com o modelo carregado; tempo de carga; tempo da conferência de integridade; crescimento da memória de GPU por janela; erros que mudam o sentido, comparados com a transcrição do mlx-whisper; e o modo WASM no notebook com a aceleração desligada.
3. O resultado vai para `_reversa_forward/007-motor-whisper-navegador/premissa.md`, com o modelo padrão, o veredito do RF-15, a meta de latência do Windows (revista se nenhum modelo alcançar 10 s por minuto), os limites de memória e de espaço e os parâmetros N e X do D-13.
4. No mesmo dia, em paralelo: conta de desenvolvedor na loja, com verificação em duas etapas; rascunho mínimo enviado para obter o ID e a chave pública; `/reversa-debugger` encerra o BUG-20261002-YUB4 como não reproduzido (RN-07).

**Fase 1, motor no navegador (2026-10-06 a 09).** Catálogo, gerenciador de modelo, documento offscreen, worker, detecção de idioma, adaptador no service worker e bateria de contrato.

**Fase 2, integração (2026-10-09 e 10).** Motor composto, cancelamento, "preparando", ciclo de vida do documento offscreen e registro de desempenho. A partir daqui, o autor começa a semana de uso sem o auxiliar no build local.

**Fase 3, instalação e painel (2026-10-10 a 12).** Compatibilidade, página de boas-vindas, painel, manifesto, ícones e nome.

**Fase 4, publicação e piloto (2026-10-12 a 18).** Empacotamento, política de privacidade publicada, ficha, aba de privacidade, envio para revisão; aprovado o item, instalação pelo link no notebook Windows e convite ao grupo piloto.

**Migração da instalação do autor.**
1. Com o `key` da loja no manifesto local, o ID da extensão muda: os contadores e a etapa da página de boas-vindas recomeçam do zero, porque o armazenamento pertence ao ID antigo.
2. O autor reinstala o auxiliar com `auxiliar/motor.sh instalar`, que lê o novo `key` e autoriza o novo ID.
3. Se voltar a gerar o .pkg, `auxiliar/ferramentas/postinstall.sh` precisa da chave nova.
4. O build local e a versão da loja ficam em perfis diferentes do Chrome, porque têm o mesmo ID.
5. Para instalações que guardem `whispper_onboarding` com 6 etapas, a leitura remapeia a etapa (data-delta, seção 4).

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Nenhum modelo cabe nas duas metas no notebook Windows: os números públicos indicam que só o base se aproxima de 10 s por minuto, com 13% de erro por palavra em português lido, e o small chegou a 26,8 s por minuto num Apple Silicon | alto | médio | Fase 0 como portão; meta do Windows revista antes da Fase 1, como prevê o RNF de desempenho; condições de revisão de `decision.md` |
| O modelo escolhido processa perto do prazo do núcleo (30 s por minuto de áudio, mínimo de 60 s) | alto | médio | Se a Fase 0 medir mais de 20 s por minuto, o prazo do RNF-02 do núcleo é revisto antes da Fase 2 |
| Vazamento de memória de GPU da issue #1739 derruba a aba ou o dispositivo em áudios longos | alto | médio | Sem carimbos de tempo (D-04); medição na Fase 0; reciclagem do worker (D-13) |
| Texto errado em GPU Intel por defeito numérico do WebGPU | alto | médio | Precisões seguras (D-05); teste de sanidade na página de boas-vindas (D-17) |
| WebGPU indisponível no worker do documento offscreen | médio | baixo | Conferência na primeira hora da Fase 0; reserva no documento offscreen (D-01) |
| Detecção de idioma própria erra em áudios curtos ou mistos | médio | médio | Amostras pt e en na bateria de contrato; idioma devolvido junto do texto; ajuste fino do limiar só se a Fase 0 mostrar erro |
| Revisão da loja demora ou rejeita (nome, código remoto, permissões, funcionalidade não testável) | alto | médio | Envio até 2026-10-12; teste de código remoto no build; `tabs` retirada; justificativas por permissão; instruções e vídeo para o revisor |
| Duas semanas não bastam para as cinco fases | alto | alto | Ordem que entrega primeiro o uso do autor; lista de corte, nesta ordem: RF-03, exportação do RF-20 e RNF de responsividade, que são Should |
| A página do WhatsApp Web perde responsividade durante a transcrição | médio | baixo | Inferência no processo da extensão (D-01); medição do INP na aceitação |
| Hugging Face fora do ar, limite de requisições (3 000 resoluções a cada 5 min sem autenticação) ou mudança do CDN | médio | baixo | Revisão fixada; retomada e novo pedido de redirecionamento; mensagem clara (RF-08) |
| O documento offscreen some depois de horas | médio | baixo | Recriação transparente (D-09); "preparando" no pedido seguinte |
| `chrome.tabs.query({ url })` não funciona sem `tabs` | baixo | médio | Reserva: presença por porta aberta pelo script de conteúdo; em último caso, manter `tabs` com justificativa |
| Laptop do piloto sem aceleração gráfica e WASM reprovado na Fase 0 | médio | médio | Aviso de incompatibilidade antes do download (RF-15, RN-04) |

## 10. Critério de pronto

- [ ] `premissa.md` registrado, com o modelo padrão e a medição que o justifica (RF-05)
- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `cross-check.md` (se executado) sem CRITICAL nem HIGH
- [ ] `regression-watch.md` gerado
- [ ] `npm run typecheck` e `npm test` verdes em `extension/`, com a bateria de contrato passando contra o motor no navegador e os testes do núcleo sem alteração de expectativa além das novas
- [ ] Bateria de contrato com o motor real no Chrome for Testing (`MOTOR_NAVEGADOR=1`) verde nas amostras sintéticas
- [ ] `npm run empacotar` gera o .zip sem `key`, sem instalador e sem URL de CDN no código
- [ ] Os 17 cenários do `requirements.md`, seção 7, conferidos conforme o `onboarding.md`
- [ ] Item aprovado pela loja e instalado pelo link num computador que nunca teve a extensão (RF-21)
- [ ] BUG-20261002-YUB4 encerrado pelo fluxo de bugs antes do convite ao piloto (RN-07)
- [ ] Critérios do `pre-spec.md`: semana de uso do autor sem o auxiliar, com ≥ 95% das transcrições compreendidas, e um colega com Windows lendo um áudio real sem ajuda
- [ ] Re-extração reversa executada e sem regressão vermelha (recomendado, não obrigatório)

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-10-04 | Versão inicial gerada por `/reversa-plan` | reversa |
