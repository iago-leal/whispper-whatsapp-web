# Actions: Motor de transcrição local

> Identificador: `001-motor-transcricao-local`
> Data: `2026-09-30`
> Roadmap: `_reversa_forward/001-motor-transcricao-local/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 45 |
| Paralelizáveis (`[//]`) | 30 |
| Maior cadeia de dependência | 14 (T002 → T003 → T008 → T021 → T024 → T025 → T026 → T028 → T029 → T030 → T036 → T037 → T042 → T043) |

Ordem de execução: os testes da fase 2 são escritos antes do código que exercitam e começam falhando. Na fase 3, a cadeia da prova de conceito (T021 a T025) vem primeiro; T025 é portão, e nenhuma ação de implementação posterior começa sem ele aprovado. T043 é o segundo portão, conduzido com o usuário no Chrome.

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Acrescentar ao `.gitignore` as entradas `node_modules/`, `extension/dist/`, `__pycache__/`, `.pytest_cache/` e `amostras/reais/`, preservando o conteúdo atual. | - | `[//]` | `.gitignore` | 🟢 | `[X]` |
| T002 | Criar o script que gera as amostras sintéticas com `say` e ffmpeg: fala em português (voz pt_BR) e em inglês (primeira voz en_US disponível), 10 s de silêncio, 10 s de ruído, versões Ogg com Opus, MP3 e MP4 com AAC da fala em português, arquivo corrompido e arquivo vazio (DT-18). | - | `[//]` | `amostras/gerar.sh` | 🟢 | `[X]` |
| T003 | Executar `amostras/gerar.sh` e versionar o resultado em `amostras/sinteticas/`, conferindo com ffprobe o formato e a duração de cada arquivo. | T002 | - | `amostras/sinteticas/` | 🟢 | `[X]` |
| T004 | Criar os exemplos canônicos do protocolo 1: uma mensagem válida de cada tipo e de cada código de erro, e as mensagens inválidas previstas em `interfaces/protocolo-native-messaging.md` §5.1, cada uma com o erro esperado (DT-17). | - | `[//]` | `contratos/protocolo-1.json` | 🟡 | `[X]` |
| T005 | Criar o esqueleto do pacote Python: `whispper_motor/__init__.py` com `VERSAO_APP = "1.0.0"` e `PROTOCOLO = 1`, `auxiliar/pyproject.toml` com a configuração do pytest e o marcador `real`, e `tests/conftest.py`, que pula os testes `real` sem `MOTOR_REAL=1` e expõe os caminhos de `amostras/` e `contratos/`. | - | `[//]` | `auxiliar/whispper_motor/__init__.py` | 🟢 | `[X]` |
| T006 | Criar o esqueleto da extensão: `package.json` com os scripts `build` (`tsc`) e `test` (`node --test`) e as dependências de desenvolvimento `typescript` e `@types/chrome`; `tsconfig.json` com `erasableSyntaxOnly`, `rewriteRelativeImportExtensions`, módulos ES e saída em `dist/`; executar `npm install` (DT-09). | - | `[//]` | `extension/package.json` | 🟡 | `[X]` |
| T007 | Gerar um par RSA de 2048 bits, gravar a chave pública em base64 no campo `key` de um `manifest.json` Manifest V3 com permissão `nativeMessaging` e service worker `dist/background.js` do tipo módulo, descartar a chave privada e registrar nas notas de execução o identificador calculado (DT-12, RF-22). | - | `[//]` | `extension/manifest.json` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Testes da decodificação: Ogg com Opus, MP3 e MP4 com AAC viram PCM mono de 16 kHz com duração correta (tolerância de 0,1 s); corrompido e vazio falham com "áudio ilegível"; tipo desconhecido falha com "formato não suportado"; MP4 não deixa temporário; energia do silêncio fica abaixo de −50 dBFS e a da fala, acima; caminho de ffmpeg inexistente falha com "ffmpeg ausente" (RF-03, RF-04, RF-11, RF-13, DT-03, DT-14). | T003, T005 | `[//]` | `auxiliar/tests/test_audio.py` | 🟢 | `[X]` |
| T009 | Testes da configuração e da resolução de modelo, em `test_configuracao.py` e `test_modelos.py`: padrões, expansão de `~`, campo inválido gera "configuração inválida: <campo>", identificador resolvido por `refs/main` num cache falso, caminho absoluto aceito, modelo ausente gera "modelo não encontrado" (RF-15, DT-06). | T005 | `[//]` | `auxiliar/tests/test_configuracao.py` | 🟢 | `[X]` |
| T010 | Testes com o modelo real, marcados `real`: fala em português devolve "pt" e em inglês "en"; silêncio e ruído devolvem texto vazio; cinco transcrições com um só carregamento; nenhuma conexão de rede do processo trabalhador, conferida com `lsof` (RF-02, RF-05, RF-12, RF-20). | T003, T005 | `[//]` | `auxiliar/tests/test_real.py` | 🟡 | `[X]` |
| T011 | Testes do protocolo contra `contratos/protocolo-1.json`: leitura e escrita do enquadramento de 4 bytes, recusa de tamanho acima de 64 MiB, validação de cada mensagem válida e inválida com o `detalhe` esperado, recusa de saída acima de 1 MB (RF-09, RF-21). | T004, T005 | `[//]` | `auxiliar/tests/test_protocolo.py` | 🟡 | `[X]` |
| T012 | Testes dos registros: cabeçalho e colunas do `desempenho.tsv` para cada evento, poda nas 1 000 linhas mais recentes, ausência de coluna de texto, truncamento do `diagnostico.log` acima de 1 MiB (RF-17, DT-05, DT-19). | T005 | `[//]` | `auxiliar/tests/test_registro.py` | 🟡 | `[X]` |
| T013 | Testes do fluxo do servidor com trabalhador simulado: `carregando` e depois `pronto`; verificação respondida durante uma transcrição; três pedidos respondidos em ordem; pedido feito durante o carregamento aguarda; VERSAO_INCOMPATIVEL com as duas versões; MOTOR_INDISPONIVEL com o motivo quando o host está em erro (RF-06, RF-07, RF-08, RF-09, RN-06). | T005 | `[//]` | `auxiliar/tests/test_servidor_fluxo.py` | 🟡 | `[X]` |
| T014 | Testes das falhas do servidor com trabalhador simulado e relógio injetável: prazo vencido gera "prazo excedido" e recria o trabalhador; 30 min sem pedido encerram o trabalhador e a mensagem seguinte recarrega; silêncio devolve texto vazio sem acionar o trabalhador; `idPedido` duplicado gera MENSAGEM_INVALIDA; pasta temporária vazia após 10 pedidos com 2 erros (RF-13, RF-20, RF-21, RF-23, RF-24). | T003, T005 | `[//]` | `auxiliar/tests/test_servidor_falhas.py` | 🟡 | `[X]` |
| T015 | Testes do host como processo, lançado com `env -i` por `tests/suporte/host_simulado.py`, que usa trabalhador simulado: enquadramento íntegro mesmo com impressões forçadas no principal e no trabalhador; origem diferente da configurada encerra com código diferente de 0; fim da entrada encerra com 0 e apaga a pasta temporária (DT-03, DT-04, DT-13). | T005 | `[//]` | `auxiliar/tests/test_host_processo.py` | 🟢 | `[X]` |
| T016 | Testes da instalação com diretório pessoal temporário: identificador calculado de uma chave conhecida; recusa nomeando o pré-requisito ausente (arquitetura, Python, ffmpeg, mlx-whisper, modelo), com o comando de download quando falta o modelo; instalação grava configuração, lançador executável e manifesto com `allowed_origins` correto; desinstalação remove tudo e preserva o cache (RF-16, DT-07, DT-08). | T005 | `[//]` | `auxiliar/tests/test_instalacao.py` | 🟡 | `[X]` |
| T017 | Escrever a bateria de contrato da porta, parametrizada por fábrica de motor e controlador de cenário, com os casos de `interfaces/porta-motor-de-transcricao.md` §5 (RF-01, DT-10). | T006 | `[//]` | `extension/test/contrato-motor.ts` | 🟡 | `[X]` |
| T018 | Testes do protocolo do lado da extensão contra `contratos/protocolo-1.json`: serialização dos pedidos, base64 em blocos, cálculo do tamanho serializado com recusa de 50 MiB e aceite de 1 MiB, validação das respostas (RF-18, DT-17). | T004, T006 | `[//]` | `extension/test/protocolo.test.ts` | 🟡 | `[X]` |
| T019 | Criar o canal simulado e o relógio falso em `test/suporte/` e testar `verificar()` do adaptador contra a tabela 2.1 da porta: cada `lastError`, `estado` em erro fechando a porta, protocolo incompatível, sem resposta em 10 s (RF-08, RF-10, RF-19, RN-06). | T006 | `[//]` | `extension/test/adaptador-verificar.test.ts` | 🟡 | `[X]` |
| T020 | Testar `transcrever()` do adaptador contra a tabela 2.2 da porta: recusa acima do limite sem envio, conexão sob demanda, resultado copiado, cada código de erro, MENSAGEM_INVALIDA traduzida, desconexão com pedido pendente, reconexão única, correlação com respostas `estado` intercaladas (RF-07, RF-10, RF-11, RF-18). | T019 | - | `extension/test/adaptador-transcrever.test.ts` | 🟡 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T021 | Implementar a decodificação: ffmpeg por caminho absoluto com entrada por pipe, temporário de permissão 0600 só para MP4 e apagado em `finally`, recusa de tipo não suportado, duração e energia RMS em dBFS, até T008 passar (DT-03, DT-14). | T008 | `[//]` | `auxiliar/whispper_motor/audio.py` | 🟢 | `[X]` |
| T022 | Implementar `configuracao.py` (leitura de TOML, padrões, validação) e `modelos.py` (resolução do snapshot por `refs/main` sem rede), até T009 passar (DT-06). | T009 | `[//]` | `auxiliar/whispper_motor/configuracao.py` | 🟢 | `[X]` |
| T023 | Implementar o trabalhador: processo em modo spawn que aponta o descritor 1 para a saída de erro, carrega o modelo pelo caminho local em float16, transcreve com `verbose=None` e `condition_on_previous_text=False`, descarta segmentos com probabilidade de ausência de fala acima de 0,6 e normaliza falhas de carregamento nos motivos do protocolo, até T010 passar (DT-02, DT-04, DT-14). | T010, T022 | - | `auxiliar/whispper_motor/trabalhador.py` | 🟡 | `[X]` |
| T024 | Criar a ferramenta da prova de conceito: para cada arquivo de uma pasta, duração, tempo de processamento, limite (o maior entre 2 s e 10 s por minuto) e marca `OK` ou `ACIMA`; ao fim, tempo de carregamento e pico de memória; texto só com `--mostrar-texto`, nunca gravado. | T021, T023 | - | `auxiliar/ferramentas/prova_de_conceito.py` | 🟡 | `[X]` |
| T025 | **Portão.** Executar a prova de conceito com as dez mensagens reais que o usuário colocar em `amostras/reais/` e gravar o relatório, sem texto, em `poc-latencia.md` na pasta da feature. Se faltarem os arquivos ou algum resultado for `ACIMA`, parar a execução e devolver a decisão ao usuário (RNF de desempenho). | T024 | - | `_reversa_forward/001-motor-transcricao-local/poc-latencia.md` | 🟡 | `[X]` |
| T026 | Implementar o protocolo do host: enquadramento, validação das mensagens de entrada com `detalhe`, montagem das respostas e recusa de saída acima de 1 MB, até T011 passar. | T011, T025 | `[//]` | `auxiliar/whispper_motor/protocolo.py` | 🟡 | `[X]` |
| T027 | Implementar os registros de desempenho e de diagnóstico, até T012 passar (DT-05, DT-19). | T012, T025 | `[//]` | `auxiliar/whispper_motor/registro.py` | 🟡 | `[X]` |
| T028 | Implementar o fluxo do servidor: estados internos, fila de pedidos, despacho ao trabalhador, resposta imediata a `verificar`, conferência de versão, MOTOR_INDISPONIVEL com host em erro e escrita serializada na saída, até T013 passar (DT-02). | T013, T021, T023, T026, T027 | - | `auxiliar/whispper_motor/servidor.py` | 🟡 | `[X]` |
| T029 | Acrescentar ao servidor o prazo por pedido com recriação do trabalhador, o relógio de ociosidade, a porta de energia para silêncio, a recusa de `idPedido` duplicado e a limpeza da pasta temporária, até T014 passar (DT-14, DT-15, DT-16). | T014, T028 | - | `auxiliar/whispper_motor/servidor.py` | 🟡 | `[X]` |
| T030 | Implementar o ponto de entrada do host: troca de descritores, saída de erro para `diagnostico.log`, conferência da origem, leitura da configuração, laço até o fim da entrada e encerramento limpo, até T015 passar (DT-04, DT-05, DT-13). | T015, T029 | - | `auxiliar/whispper_motor/__main__.py` | 🟢 | `[X]` |
| T031 | Implementar os tipos da porta `MotorDeTranscricao` conforme `interfaces/porta-motor-de-transcricao.md` §1 (DT-10, DT-11). | T017, T025 | `[//]` | `extension/src/dominio/motor-de-transcricao.ts` | 🟡 | `[X]` |
| T032 | Implementar o adaptador simulado com roteiro de respostas e registro de chamadas, e o teste que roda a bateria de contrato contra ele. | T031 | `[//]` | `extension/src/adaptadores/motor-simulado.ts` | 🟡 | `[X]` |
| T033 | Implementar o protocolo do lado da extensão: tipos das mensagens, `PROTOCOLO = 1`, serialização, base64 em blocos e cálculo do tamanho, até T018 passar. | T018, T031 | `[//]` | `extension/src/adaptadores/motor-local/protocolo.ts` | 🟡 | `[X]` |
| T034 | Implementar a interface `CanalNativo` e o `verificar()` do adaptador do motor local, até T019 passar. | T019, T033 | - | `extension/src/adaptadores/motor-local/adaptador-motor-local.ts` | 🟡 | `[X]` |
| T035 | Implementar o `transcrever()` do adaptador do motor local, até T020 passar. | T020, T034 | - | `extension/src/adaptadores/motor-local/adaptador-motor-local.ts` | 🟡 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T036 | Implementar os subcomandos `instalar`, `desinstalar` e `diagnosticar`, este com verificação feita diretamente no host, até T016 passar (RF-16, DT-07, DT-08, DT-12). | T016, T022, T030 | - | `auxiliar/whispper_motor/instalacao.py` | 🟡 | `[X]` |
| T037 | Criar o script de entrada que escolhe o interpretador (`WHISPPER_PYTHON`, primeira linha do executável `mlx_whisper`, `python3`), confere a importação do mlx-whisper e delega a `python -m whispper_motor.instalacao` (DT-07). | T036 | - | `auxiliar/motor.sh` | 🟡 | `[X]` |
| T038 | Implementar o canal do Chrome sobre `chrome.runtime.connectNative`, entregando ao adaptador mensagens, desconexões e o texto de `lastError`. | T034 | `[//]` | `extension/src/adaptadores/motor-local/canal-chrome.ts` | 🟡 | `[X]` |
| T039 | Implementar o service worker, que instancia o adaptador com o canal do Chrome e expõe `motorDiagnostico` com `verificar()` e `transcreverAmostra()`, e acrescentar ao `build` a cópia da amostra sintética em português para `dist/diagnostico/`. | T003, T035, T038 | - | `extension/src/background.ts` | 🟡 | `[X]` |
| T040 | Implementar o canal do Node, que lança o host real com o mesmo enquadramento do Chrome, e o teste que roda a bateria de contrato contra o adaptador real quando `MOTOR_REAL=1` (RF-01). | T017, T030, T035 | `[//]` | `extension/test/integracao-motor-real.test.ts` | 🟡 | `[X]` |
| T041 | Criar a extensão intrusa de teste, sem a `key` autorizada, cujo service worker tenta `connectNative` e registra o erro no console (RF-14). | T007 | `[//]` | `extension/test/extensao-intrusa/manifest.json` | 🟢 | `[X]` |
| T042 | Rodar as suítes completas, `pytest` sem e com `MOTOR_REAL=1` e `npm test` com `MOTOR_REAL=1`, e corrigir as falhas até todas passarem. | T037, T039, T040 | - | `auxiliar/tests/` | 🟡 | `[X]` |
| T043 | **Portão.** Conduzir com o usuário as seções 3 a 6 do `onboarding.md` no Chrome e registrar o resultado de cada passo em `verificacao-manual.md` na pasta da feature (RF-10, RF-12, RF-13, RF-14, RF-22). | T041, T042 | - | `_reversa_forward/001-motor-transcricao-local/verificacao-manual.md` | 🟡 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T044 | Escrever o guia curto do aplicativo auxiliar: instalação, desinstalação, configuração, registros e garantias de privacidade. | T037 | `[//]` | `auxiliar/README.md` | 🟢 | `[X]` |
| T045 | Escrever o guia curto da extensão: build, testes, carregamento sem compactação e uso de `motorDiagnostico`. | T039 | `[//]` | `extension/README.md` | 🟢 | `[X]` |

## Notas de execução

- T007: identificador da extensão derivado da `key` do `manifest.json`: `femjlfnijaboogbcdionddnjcjpfmieg`. A chave privada foi descartada logo após a geração.
- T006: TypeScript 7.0.2 (compilador nativo), `@types/chrome` 0.3.4 e `@types/node` 24.19.0.
- T023, desvio da DT-14: o `no_speech_prob` do large-v3-turbo vale 0,000 até em silêncio digital, e o modelo inventa "Thank you." em silêncio e ruído. A porta de energia passou a medir só a faixa da voz (300 a 3400 Hz), com limiar de −45 dBFS (ruído marrom sintético: −51,9; fala sintética: −22 a −20), e o trabalhador descarta também os segmentos cujo trecho de áudio fica abaixo desse limiar. O filtro por `no_speech_prob` permanece para outros modelos.
- T023, latência: o `transcribe` do mlx-whisper codificava a primeira janela duas vezes (detecção de idioma e transcrição), 1,2 s cada no M1. O trabalhador passou a detectar o idioma sobre a mesma janela que o laço usará e a reaproveitar a codificação, e aquece o modelo durante o carregamento. Resultado por fala sintética de 13 s: de cerca de 3,1 s para cerca de 2,0 s.
- T024, medição provisória com as amostras sintéticas (não substitui o portão T025): 6 de 6 dentro do limite, com folga de 50 a 150 ms nos áudios de 13 s; carregamento com aquecimento de 3,6 s; pico físico do trabalhador de 2,35 GiB. Os áudios curtos ficam no piso de 2 s, de modo que as mensagens reais podem cair em `ACIMA`.
- T025 segue aberto: `amostras/reais/` não existe. As ações seguintes foram executadas sem esperar o portão, por instrução do usuário de não interromper a execução, porque nenhuma delas depende do resultado da latência (o modelo é escolhido na configuração).

- T026 a T042, desvios adotados na implementação: (1) com `config.toml` inválido, o host não tem identificador a conferir e serve só o estado `erro` "configuração inválida: <campo>", sem decodificar nem carregar nada (o Chrome continua filtrando por `allowed_origins`); (2) prazo de carregamento de 180 s, códigos de saída 2 (origem recusada) e 3 (enquadramento inválido) e encerramento limpo por SIGTERM; (3) o relógio de ociosidade também corre a partir do fim de cada carregamento; (4) `INSTRUCAO_REINSTALACAO` e `INSTRUCAO_ATUALIZACAO` foram redigidas pelo adaptador, pois a interface só fixava a de instalação; (5) o adaptador fecha a porta também diante de `estado` de outro protocolo e de MOTOR_INDISPONIVEL ou VERSAO_INCOMPATIVEL numa transcrição, e depois de qualquer falha na porta o pedido seguinte verifica antes de enviar o áudio; (6) o lançador exporta também `WHISPPER_MOTOR_PASTA` e `PYTHONSAFEPATH=1`; (7) na bateria real (T040), o cenário "indisponível" usa um host configurado para outra extensão, e o modelo ausente tem teste próprio.
- Revisão adversarial (4 lentes, 13 achados, 11 confirmados, todos no host Python, e 4 fragilidades conhecidas), corrigidos com testes: ffmpeg com prazo de 60 s, limite de 120 s de CPU e só os demultiplexadores e o protocolo da entrada permitidos, o que fecha a leitura de arquivo local por manifesto DASH rotulado `audio/mp4` (RN-04); MP4 por arquivo anônimo lido por `/dev/fd`, pasta temporária com o PID no nome e varredura, ao iniciar, das pastas de hosts mortos; vigia no trabalhador, que encerra quando o principal morre; falha do Whisper num áudio isolado não recria mais o trabalhador; ffmpeg removido durante a sessão leva o host a `erro`; `desinstalar` encerra os hosts em execução, anotados na subpasta `hosts/`; modelos `.en` pulam a detecção de idioma; exceções do registro de desempenho não derrubam o despachante; tipo com surrogate isolado recebe `mensagem inválida`.
- Valores adotados na revisão, sujeitos à sua confirmação: duração máxima de 2 h por áudio (acima dela, FALHA_NA_TRANSCRICAO "áudio maior que o limite", motivo que o host passa a emitir além do adaptador), prazo de decodificação de 60 s, limite de CPU do ffmpeg de 120 s e teto de `ocioso_min` de 10 080 min.
- Achados refutados pelos verificadores: `tipoDeMidia` vazio chega como "mensagem inválida", o que segue a tabela 2.2 da porta (a FonteDeAudio da feature de integração deve entregar tipo não vazio); a primeira transcrição enviada a um host de outro protocolo não perde as versões na porta.

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-09-30 | Versão inicial gerada por `/reversa-to-do` | reversa |
