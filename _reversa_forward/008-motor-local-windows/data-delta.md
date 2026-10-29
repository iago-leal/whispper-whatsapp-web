# Data delta: Motor local no Windows

> Identificador: `008-motor-local-windows`
> Data: `2026-10-29`
> Base: `_reversa_sdd/sdd/motor-transcricao-local.md#9-modelo-de-dados` e `auxiliar/README.md#configuração`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

A feature não cria entidade nova no domínio. Muda onde os dados do aplicativo auxiliar ficam no Windows, os valores padrão da configuração nessa plataforma e o formato do modelo aceito. No Mac, nada muda.

## 1. `ConfiguracaoDoAuxiliar` (`config.toml`)

| Campo | Mac (inalterado) | Windows (novo) | Tipo de delta | Confidência |
|-------|------------------|----------------|---------------|-------------|
| `modelo` | `mlx-community/whisper-large-v3-turbo` | `mobiuslabsgmbh/faster-whisper-large-v3-turbo`, o repositório que o próprio faster-whisper associa ao nome `large-v3-turbo` | padrão por plataforma | 🟢 |
| `pasta_de_modelos` | `~/.cache/huggingface/hub` | `%USERPROFILE%\.cache\huggingface\hub`, a mesma regra do huggingface_hub (`HF_HUB_CACHE`, senão `HF_HOME\hub`, senão a pasta do perfil) | mesmo cálculo, outro caminho | 🟢 |
| `ffmpeg` | `/opt/homebrew/bin/ffmpeg` | caminho absoluto com barras invertidas; no desktop, `%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe`, atalho do winget que sobrevive às atualizações do pacote | mesmo campo, outro valor | 🟡 |
| `extensao_id` | calculado da `key` | idem | sem mudança | 🟢 |
| `ocioso_min` | `30` | `30` | sem mudança | 🟢 |

- 🟢 Nenhum campo novo. A escolha entre placa de vídeo e processador é automática (RF-19, RF-20) e não ganha campo de configuração nesta feature.
- 🟢 O TOML guarda os caminhos do Windows com as barras invertidas escapadas; `_texto_toml` em `configuracao.py` já escapa `\`.
- 🟡 A validação de `ffmpeg` continua exigindo caminho absoluto; no Windows, `C:\...` conta como absoluto, e um caminho só com letra de unidade e sem barra (`C:ffmpeg.exe`) não conta.

## 2. Modelo no disco

| Aspecto | Mac | Windows | Confidência |
|---------|-----|---------|-------------|
| Formato | MLX: `config.json` mais `weights.safetensors` ou `weights.npz` | CTranslate2: `config.json`, `model.bin`, `tokenizer.json`, `vocabulary.json`, `preprocessor_config.json` | 🟢 |
| Resolução | `models--<org>--<nome>/refs/main` aponta para a pasta em `snapshots/` | idem | 🟢 |
| Conferência em `modelos.resolver` | exige `config.json` e um dos arquivos de pesos do MLX | passa a aceitar também `model.bin` como arquivo de pesos | 🟢 |
| Revisão usada no desktop | n/a | `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf`, baixada em 2026-10-29 | 🟢 |
| Tamanho | cerca de 1,6 GB | cerca de 1,6 GB em disco | 🟡 |

## 3. Pasta do aplicativo

| Item | Mac | Windows | Confidência |
|------|-----|---------|-------------|
| Pasta | `~/Library/Application Support/whispper-motor/` | `%LOCALAPPDATA%\whispper-motor\` | 🟢 |
| Código copiado | `whispper_motor/` | idem | 🟢 |
| Lançador | `whispper-motor` (script `sh`, modo 0755) | `whispper-motor.bat` | 🟢 |
| Manifesto do host | fora da pasta, em `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/` | dentro da pasta, `whispper_whatsapp_web.motor.json`, apontado pelas entradas de registro | 🟢 |
| `hosts/` | um arquivo vazio por host vivo, com o PID por nome | idem | 🟢 |
| `desempenho.tsv` | formato da seção Registros do README | idem, sem coluna nova | 🟢 |
| `diagnostico.log` | permissão 0600 | permissões herdadas de `%LOCALAPPDATA%` (o usuário, o SYSTEM e o grupo Administradores), equivalentes ao 0600 mais o root do Mac | 🟡 |

## 4. Registro do Windows

Duas entradas novas em `HKEY_CURRENT_USER`, detalhadas em `interfaces/registro-native-messaging-windows.md`:

- `Software\Google\Chrome\NativeMessagingHosts\whispper_whatsapp_web.motor`
- `Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\whispper_whatsapp_web.motor`

Ambas com o valor padrão igual ao caminho do manifesto. São criadas por último na instalação e removidas primeiro na desinstalação.

## 5. Linhas novas no `diagnostico.log`

Só mensagens fixas do código, como as atuais (`auxiliar/README.md#registros`):

| Mensagem | Nível | Quando |
|----------|-------|--------|
| `modelo carregado na placa de vídeo` | info | o trabalhador carregou o modelo na placa NVIDIA |
| `modelo carregado no processador: <motivo>` | aviso | a placa não pôde ser usada; o motivo vem de uma lista fixa: `sem placa NVIDIA`, `bibliotecas da placa ausentes`, `memória da placa insuficiente`, `falha da placa` |

- 🟢 Nenhuma das mensagens leva texto de exceção, nome de arquivo ou trecho de áudio; da exceção entra, no máximo, o nome do tipo, como hoje.
- 🟢 O `desempenho.tsv` não ganha coluna: a mesma leitura serve às duas plataformas (RNF de observabilidade).

## 6. Arquivos temporários

| Aspecto | Mac | Windows | Confidência |
|---------|-----|---------|-------------|
| Pasta | `$TMPDIR/whispper-motor-<PID>-*` | `%TEMP%\whispper-motor-<PID>-*` | 🟢 |
| Arquivo do MP4 | anônimo: desvinculado antes do primeiro byte | criado com apagamento no fechamento (`O_TEMPORARY`), entregue ao ffmpeg como entrada padrão; o sistema o apaga quando o último identificador fecha, inclusive na morte do host | 🟡, confirmar na sonda |
| Varredura de pastas órfãs | confere PID morto e dono igual ao usuário | confere PID morto; o dono não é conferido, porque `%TEMP%` já fica no perfil do usuário | 🟢 |

## 7. Ambiente Python

- 🟡 Pré-requisito externo, como no Mac: um ambiente virtual em `%USERPROFILE%\.venvs\whispper-motor`, com o faster-whisper e as bibliotecas da NVIDIA da geração 12 (`nvidia-cublas-cu12`, `nvidia-cudnn-cu12` da série 9). Fica fora da pasta do aplicativo, e a desinstalação não o remove, assim como não remove o Python do Mac.

## 8. Migrações

- 🟢 Nenhuma migração de dados. No Mac, a cópia instalada só recebe o código novo ao rodar `auxiliar/motor.sh instalar` de novo; a configuração existente é preservada pela reinstalação.
