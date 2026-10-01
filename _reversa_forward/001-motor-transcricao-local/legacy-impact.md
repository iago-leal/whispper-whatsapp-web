# Impacto no legado: Motor de transcrição local

> Identificador: `001-motor-transcricao-local`
> Data: `2026-09-30`
> Feature greenfield, sem legado pré-existente. Âncora: prd.md + specs SDD.
> Política de edição no momento da execução: `.reversa/reversa-config.json` com `allowLegacyEdits: true` e `allowedPaths` vazio, isto é, liberação irrestrita do projeto (aviso dado na sessão). Nenhum arquivo foi apagado.
> Execução parcial: 43 de 45 ações concluídas; seguem abertos os portões T025 (latência com mensagens reais) e T043 (verificação manual no Chrome).

## 1. Arquivos afetados

Os componentes seguem `_reversa_sdd/sdd/motor-transcricao-local.md#8. Design e Interface` (adaptador do motor, aplicativo auxiliar, registro do aplicativo no Chrome, arquivo de configuração, registro de desempenho), `_reversa_sdd/sdd/nucleo-transcricao.md` (porta `MotorDeTranscricao`), `_reversa_sdd/sdd/compatibilidade-instalacao.md` (instalação) e `_reversa_sdd/sdd/integracao-whatsapp-web.md` (extensão hospedeira, RF-22 da feature).

### 1.1 Aplicativo auxiliar (host de Native Messaging)

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `auxiliar/whispper_motor/__init__.py` | Aplicativo auxiliar | componente-novo | LOW | Versões do aplicativo e do protocolo, nome do host. |
| `auxiliar/whispper_motor/__main__.py` | Aplicativo auxiliar | componente-novo | HIGH | Ponto de entrada: troca de descritores (DT-04), diagnóstico, conferência de origem (DT-13, RF-14), varredura de temporários órfãos. |
| `auxiliar/whispper_motor/protocolo.py` | Aplicativo auxiliar | delta-de-contrato-externo | HIGH | Protocolo 1 do Native Messaging no lado do host: enquadramento, validação, respostas (RF-08, RF-09, RF-21). |
| `auxiliar/whispper_motor/servidor.py` | Aplicativo auxiliar | componente-novo | HIGH | Estados, fila, prazos, ociosidade, porta de energia, recriação do trabalhador (RF-05 a RF-07, RF-11, RF-20, RF-23, RF-24). |
| `auxiliar/whispper_motor/trabalhador.py` | Aplicativo auxiliar | componente-novo | HIGH | Processo do modelo: mlx-whisper, memória do codificador, filtro de segmentos sem fala, vigia do principal (DT-02, DT-14). |
| `auxiliar/whispper_motor/audio.py` | Aplicativo auxiliar | componente-novo | HIGH | Decodificação pelo ffmpeg com prazo, formatos restritos e arquivo anônimo (DT-03, RF-03, RF-04, RF-13, RN-04). |
| `auxiliar/whispper_motor/configuracao.py` | Arquivo de configuração | componente-novo | MEDIUM | Leitura, validação e gravação do `config.toml` (RF-15). |
| `auxiliar/whispper_motor/modelos.py` | Aplicativo auxiliar | componente-novo | MEDIUM | Resolução do snapshot local sem rede (DT-06, RF-12). |
| `auxiliar/whispper_motor/registro.py` | Registro de desempenho | componente-novo | MEDIUM | `desempenho.tsv` com coluna `evento` e `diagnostico.log` sem conteúdo (RF-17, DT-05, DT-19). |
| `auxiliar/whispper_motor/instalacao.py` | Registro do aplicativo no Chrome | componente-novo | HIGH | Instalar, desinstalar e diagnosticar; manifesto do host com `allowed_origins` fechado (RF-16, RF-14). |
| `auxiliar/motor.sh` | Registro do aplicativo no Chrome | componente-novo | MEDIUM | Escolha do interpretador e delegação ao instalador (DT-07). |
| `auxiliar/pyproject.toml` | Aplicativo auxiliar | componente-novo | LOW | Metadados e configuração do pytest. |
| `auxiliar/ferramentas/__init__.py`, `auxiliar/ferramentas/prova_de_conceito.py` | Aplicativo auxiliar (ferramenta) | componente-novo | LOW | Medição de latência do portão T025; texto nunca gravado. |
| `auxiliar/README.md` | Aplicativo auxiliar (guia) | componente-novo | LOW | Instalação, configuração, registros, privacidade (T044). |
| `auxiliar/tests/**` (20 arquivos) | Aplicativo auxiliar (testes) | componente-novo | LOW | 127 testes, 6 com o modelo real (`MOTOR_REAL=1`). |

### 1.2 Extensão hospedeira e adaptador do motor

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `extension/manifest.json` | Extensão hospedeira | componente-novo | HIGH | MV3 com `key` fixa (identificador `femjlfnijaboogbcdionddnjcjpfmieg`) e só a permissão `nativeMessaging` (RF-22). |
| `extension/src/dominio/motor-de-transcricao.ts` | Porta `MotorDeTranscricao` | delta-de-contrato-externo | HIGH | Contrato de que o núcleo dependerá: `verificar()` e `transcrever()` (RF-01). |
| `extension/src/adaptadores/motor-local/protocolo.ts` | Adaptador do motor | delta-de-contrato-externo | HIGH | Protocolo 1 no lado da extensão, base64 em blocos, limite de 64 MiB (RF-18). |
| `extension/src/adaptadores/motor-local/adaptador-motor-local.ts` | Adaptador do motor | componente-novo | HIGH | Conexão sob demanda, correlação, prazos, tradução de erros (RF-10, RF-19). |
| `extension/src/adaptadores/motor-local/canal-nativo.ts` | Adaptador do motor | componente-novo | LOW | Abstração `CanalNativo`/`PortaNativa`. |
| `extension/src/adaptadores/motor-local/canal-chrome.ts` | Adaptador do motor | componente-novo | MEDIUM | Canal sobre `chrome.runtime.connectNative`, com `lastError`. |
| `extension/src/adaptadores/motor-simulado.ts` | Adaptador do motor (simulado) | componente-novo | LOW | Adaptador de roteiro para testes do núcleo futuro. |
| `extension/src/background.ts` | Extensão hospedeira | componente-novo | MEDIUM | Service worker com `motorDiagnostico` (RF-22). |
| `extension/package.json`, `extension/package-lock.json`, `extension/tsconfig.json`, `extension/tsconfig.test.json` | Extensão hospedeira (build) | componente-novo | LOW | TypeScript 7, build com cópia da amostra de diagnóstico. |
| `extension/README.md` | Extensão hospedeira (guia) | componente-novo | LOW | Build, testes, carregamento, `motorDiagnostico` (T045). |
| `extension/test/**` (14 arquivos) | Extensão hospedeira (testes) | componente-novo | LOW | 62 testes com `MOTOR_REAL=1`, inclusive a bateria de contrato contra o host real; extensão intrusa para o RF-14. |

### 1.3 Contrato, amostras e configuração do repositório

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `contratos/protocolo-1.json` | Protocolo 1 (compartilhado) | delta-de-contrato-externo | HIGH | Exemplos canônicos lidos pelas duas suítes (DT-17). |
| `amostras/gerar.sh`, `amostras/sinteticas/*` (8 áudios) | Amostras de teste | componente-novo | LOW | Áudios sintéticos sem dados pessoais (DT-18). |
| `.gitignore` | Configuração do repositório | componente-novo | MEDIUM | Arquivo pré-existente, só com acréscimo de linhas (nenhuma removida): `node_modules/`, `extension/dist/`, `__pycache__/`, `.pytest_cache/` e `amostras/reais/`, esta última a barreira contra versionar mensagens de voz reais num repositório público. |

## 2. Diff conceitual por componente

**Aplicativo auxiliar.** Surge um host de Native Messaging em Python com dois processos: o principal, que fala o protocolo, decodifica pelo ffmpeg com prazo e formatos restritos, controla fila, estados, prazos e ociosidade; e o trabalhador em modo spawn, que carrega o large-v3-turbo do cache local e transcreve. O host protege a saída padrão por troca de descritores, envia a saída de erro a um registro de diagnóstico sem conteúdo, confere a origem, não acessa a rede e não guarda áudio nem texto. Duas descobertas mudaram a DT-14 e o desempenho: o `no_speech_prob` do turbo é inútil (a porta de energia passou a medir a faixa da voz, também por segmento), e o mlx-whisper codificava a primeira janela duas vezes (o trabalhador reaproveita a codificação).

**Registro do aplicativo no Chrome.** O instalador verifica os pré-requisitos, copia o código para `~/Library/Application Support/whispper-motor/`, gera o lançador com `HF_HUB_OFFLINE=1` e o manifesto do host com `allowed_origins` restrito ao identificador derivado da `key`. A desinstalação remove tudo isso, encerra os hosts em execução e preserva o cache de modelos.

**Arquivo de configuração e registro de desempenho.** `config.toml` ganha `ffmpeg`, `extensao_id` e `ocioso_min` além dos campos da spec; `desempenho.tsv` ganha a coluna `evento`.

**Porta `MotorDeTranscricao` e adaptador do motor.** A extensão passa a ter a porta que o núcleo usará, um adaptador simulado e o adaptador do motor local sobre o Native Messaging, com verificação em 10 s, recusa prévia acima de 64 MiB, correlação por `idPedido` e tradução dos erros do Chrome em motivos e instruções.

**Protocolo 1.** Contrato novo entre extensão e aplicativo, com exemplos canônicos compartilhados. Acréscimos em relação à spec: `MENSAGEM_INVALIDA` com `detalhe`, `MOTOR_INDISPONIVEL` vindo do host, `protocoloApp`/`protocoloPedido` em `VERSAO_INCOMPATIVEL`.

## 3. Preservadas

Sem regras 🟢 extraídas de legado: a feature é greenfield e não há `_reversa_sdd/domain.md`. Nenhum comportamento pré-existente do projeto foi alterado; o único arquivo pré-existente tocado, `.gitignore`, recebeu apenas acréscimos.

## 4. Modificadas

Nenhuma, pelo mesmo motivo. Os desvios em relação às specs SDD e ao roadmap estão registrados em `actions.md`, seção "Notas de execução", e devem ser convergidos por `/reversa-sync`.
