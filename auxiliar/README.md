# Aplicativo auxiliar (whispper-motor)

O aplicativo auxiliar é o host de Native Messaging que transcreve, nesta máquina, as mensagens de voz enviadas pela extensão. O Chrome o lança quando a extensão se conecta; o host decodifica o áudio com o ffmpeg e o transcreve com o mlx-whisper num processo trabalhador, que mantém o modelo na memória entre um pedido e outro. Os comandos abaixo partem da raiz do repositório.

## Instalação

O instalador confere, antes de gravar qualquer arquivo:

- Mac com Apple Silicon;
- Python 3.11 ou superior que importe o mlx-whisper;
- ffmpeg;
- o modelo configurado, por padrão `mlx-community/whisper-large-v3-turbo`, presente na pasta de modelos.

```bash
auxiliar/motor.sh instalar
```

O `motor.sh` usa o Python da variável `WHISPPER_PYTHON`, se definida; senão, o primeiro que importa o mlx-whisper entre o interpretador da primeira linha do executável `mlx_whisper` do PATH e o `python3` do PATH. Com mais de um Python na máquina, indique o certo:

```bash
WHISPPER_PYTHON=/caminho/do/python3 auxiliar/motor.sh instalar
```

Faltando um pré-requisito, o comando lista cada falta, termina com código 1 e não grava nada. Se o que falta é o modelo, a mensagem traz o comando que o baixa, já com o interpretador escolhido. Na pasta de modelos padrão, ele tem esta forma:

```bash
'<python>' -c "from huggingface_hub import snapshot_download; snapshot_download('mlx-community/whisper-large-v3-turbo')"
```

Com outra pasta de modelos, o comando vem precedido de `HF_HUB_CACHE='<pasta>'`. O download é a única etapa com rede e fica fora do aplicativo, pois o instalador não o executa. A pasta de modelos é, na primeira instalação, a indicada por `HF_HUB_CACHE`, senão `$HF_HOME/hub`, senão `~/.cache/huggingface/hub`; numa reinstalação, a que já consta do `config.toml`.

Com tudo presente, a instalação grava:

| Caminho | Conteúdo |
|---------|----------|
| `~/Library/Application Support/whispper-motor/` | cópia do código (`whispper_motor/`), `config.toml`, o lançador `whispper-motor` e, depois, os registros do host |
| `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/whispper_whatsapp_web.motor.json` | manifesto do host, com `allowed_origins` restrito a `chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/` |

O identificador da extensão é calculado a partir da `key` de `extension/manifest.json`, de modo que a extensão não precisa estar carregada no Chrome. O host roda da cópia, e não do repositório: depois de alterar `auxiliar/whispper_motor/`, instale de novo. A reinstalação regrava o `config.toml` preservando o modelo, a pasta de modelos e a ociosidade; mantém o ffmpeg configurado enquanto ele for executável, recalcula o `extensao_id` e descarta comentários acrescentados à mão.

## Desinstalação

```bash
auxiliar/motor.sh desinstalar
```

Remove primeiro o manifesto do host, para que o Chrome deixe de lançá-lo, e depois a pasta `~/Library/Application Support/whispper-motor/`, com a configuração e os registros. Entre um passo e outro, encerra os hosts desta instalação em execução, como o que o Chrome mantém para a extensão conectada, e informa o PID de cada um: sem isso, a extensão seguiria vendo o motor pronto, com o modelo na memória, até reconectar. Para ser encontrado, cada host se anota na subpasta `hosts/` da pasta do aplicativo enquanto roda. O cache de modelos fica intacto. A extensão se remove à parte, em `chrome://extensions`.

## Diagnóstico

```bash
auxiliar/motor.sh diagnosticar
```

Confere o que o Chrome encontrará: o manifesto do host, o lançador, o `allowed_origins`, o `config.toml` e, por fim, o próprio host. Para este último, lança o host pelo caminho do manifesto, com a origem autorizada e o PATH mínimo com que o Chrome lança aplicativos, pede o estado pelo protocolo 1 até o modelo sair de `carregando` e fecha a entrada, esperando que ele encerre com código 0. Cada item sai como `ok` ou `falha`, com o detalhe, e o comando termina com 0 só quando todos passam. O último item esperado é semelhante a:

```text
  ok     host: respondeu carregando, depois pronto em 4.0 s (versão 1.0.0, modelo mlx-community/whisper-large-v3-turbo)
```

Esse host é um segundo processo, independente do que o Chrome mantém para a extensão, e carrega o modelo de novo: ocupa cerca de 2,3 GiB de memória por alguns segundos, somados aos do host do Chrome quando este está com o modelo carregado. Ele também deixa uma linha de carregamento no `desempenho.tsv` e as linhas de início e de fim no `diagnostico.log`.

Motivos que a extensão pode receber com o motor indisponível:

| Motivo | O que fazer |
|--------|-------------|
| `aplicativo auxiliar não instalado` | `auxiliar/motor.sh instalar` |
| `extensão não autorizada no aplicativo auxiliar` | reinstalar, para que o manifesto autorize o identificador atual |
| `aplicativo auxiliar encerrou` | `auxiliar/motor.sh diagnosticar`; uma origem recusada aparece como `origem recusada` no `diagnostico.log` |
| `modelo não encontrado` | baixar o modelo com o comando que `motor.sh instalar` mostra |
| `ffmpeg ausente` | instalar o ffmpeg, por exemplo com `brew install ffmpeg`, e reinstalar |
| `configuração inválida: <campo>` | corrigir o campo no `config.toml` |
| `memória insuficiente para o modelo` | liberar memória ou escolher um modelo menor no `config.toml` |

Se o ffmpeg some com o host em execução, o pedido seguinte já recebe o motor indisponível com o motivo `ffmpeg ausente`, e não uma falha daquele áudio.

## Limites da decodificação

O ffmpeg tem 60 s para decodificar cada áudio, que pode durar até 2 h. Acima disso, o pedido recebe `FALHA_NA_TRANSCRICAO`, com o motivo `prazo excedido` ou `áudio maior que o limite`. O ffmpeg roda ainda com limite de 120 s de CPU, que o derruba mesmo se o host for morto à força.

## Configuração

O arquivo `~/Library/Application Support/whispper-motor/config.toml` é gravado pelo instalador e lido pelo host ao iniciar:

```toml
# whispper-motor: configuração do aplicativo auxiliar
modelo = "mlx-community/whisper-large-v3-turbo"
pasta_de_modelos = "/Users/<usuario>/.cache/huggingface/hub"
ffmpeg = "/opt/homebrew/bin/ffmpeg"
extensao_id = "femjlfnijaboogbcdionddnjcjpfmieg"
ocioso_min = 30
```

| Campo | Padrão | Significado |
|-------|--------|-------------|
| `modelo` | `mlx-community/whisper-large-v3-turbo` | identificador do repositório, resolvido na pasta de modelos pela referência `refs/main`, ou caminho absoluto de uma pasta de modelo MLX com `config.json` e `weights.safetensors` ou `weights.npz` |
| `pasta_de_modelos` | `~/.cache/huggingface/hub` | cache do huggingface_hub em que o identificador é procurado |
| `ffmpeg` | detectado | caminho absoluto, porque o Chrome lança o host com PATH mínimo |
| `extensao_id` | calculado da `key` | extensão autorizada; não o edite à mão, reinstale |
| `ocioso_min` | `30` | minutos sem pedido de transcrição até o modelo ser descarregado; inteiro de 1 a 10080 (uma semana) |

Campo ausente assume o padrão, exceto o `extensao_id`, sem o qual o host recusa qualquer origem. Valor inválido deixa o host em `erro`, com o motivo `configuração inválida: <campo>`. Como o arquivo só é lido ao iniciar, a mudança vale na conexão seguinte: recarregue a extensão em `chrome://extensions`, e a próxima verificação lança um host novo. Para trocar de modelo, edite `modelo` e rode `auxiliar/motor.sh instalar`: a reinstalação preserva a escolha e, se o repositório indicado não estiver na pasta de modelos, recusa mostrando o comando que o baixa.

## Registros

Ambos ficam em `~/Library/Application Support/whispper-motor/` e são gravados pelo host.

**`desempenho.tsv`**: uma linha por evento, com colunas separadas por tabulação.

```tsv
instante	evento	duracao_audio_seg	processamento_ms	resultado
2026-09-30T17:07:13-03:00	carregamento		2970	ok
2026-09-30T17:09:40-03:00	pedido	13.0	2050	ok
2026-09-30T17:10:02-03:00	pedido	0.0	12	FALHA_NA_TRANSCRICAO
2026-09-30T17:40:02-03:00	descarregamento			ok
```

| Coluna | Conteúdo |
|--------|----------|
| `instante` | data e hora ISO 8601 com fuso |
| `evento` | `pedido`, `carregamento` ou `descarregamento` |
| `duracao_audio_seg` | duração do áudio, com uma casa decimal; só em `pedido` |
| `processamento_ms` | em `pedido`, do início do atendimento ao resultado, incluída a decodificação pelo ffmpeg e excluída a espera na fila, como o `processamentoMs` devolvido à extensão; em `carregamento`, a duração do carregamento com o aquecimento do modelo; vazio em `descarregamento` |
| `resultado` | `ok` ou o código de erro do pedido; em `carregamento`, `ok` ou o motivo da falha |

Passando de 1 000 linhas de dados, o arquivo é reescrito com as 1 000 mais recentes.

**`diagnostico.log`**: uma linha por evento, com instante, nível (`info`, `aviso` ou `erro`) e mensagem.

```text
2026-09-30T17:07:10-03:00 info host iniciado, versão 1.0.0
2026-09-30T17:20:31-03:00 aviso trabalhador encerrado por prazo
2026-09-30T17:25:02-03:00 info host encerrado
```

De uma exceção entra apenas o nome do tipo. O arquivo tem permissão 0600 e, ao iniciar o host, se passar de 1 MiB, é podado para os últimos 512 KiB. Como a saída padrão e a de erro do host apontam para ele, avisos de bibliotecas também aparecem ali.

## Garantias de privacidade

- **Sem rede.** O `motor.sh` e o lançador definem `HF_HUB_OFFLINE=1` e `HF_HUB_DISABLE_TELEMETRY=1`, e o host entrega ao mlx-whisper apenas o caminho local do modelo, nunca o identificador do repositório. Nem a instalação acessa a rede.
- **Sem retenção.** O áudio chega na mensagem do protocolo, pela entrada padrão, e segue ao ffmpeg por pipe. Só o MP4 passa por arquivo temporário, com permissão 0600, numa pasta privada `whispper-motor-<PID>-*` criada em `$TMPDIR` a cada execução do host. O arquivo é anônimo: desvinculado antes de receber o primeiro byte, o áudio nunca tem nome no disco, nem se o host for derrubado. A pasta sai quando o host encerra; se ele for morto à força, o host seguinte a apaga ao iniciar, porque o processo dono já não existe. O texto transcrito existe apenas na resposta à extensão.
- **Registros sem conteúdo.** O `desempenho.tsv` guarda só instante, evento, números e resultado; o `diagnostico.log`, só mensagens fixas do código. Nenhum dos dois guarda texto transcrito, trecho de áudio, nome de arquivo ou conteúdo de mensagem do protocolo.
- **Só a extensão autorizada.** O Chrome só permite a conexão da extensão listada em `allowed_origins`. O host ainda confere a origem recebida contra o `extensao_id` e, se não coincidirem, registra `origem recusada` e encerra com código 2, sem carregar nada. A extensão de teste em `extension/test/extensao-intrusa/` serve para verificar a recusa.
- **Só o protocolo.** O host executa apenas `verificar` e `transcrever`; qualquer outra mensagem recebe o erro `mensagem inválida`, sem outra ação. Ele não executa comandos nem lê arquivos indicados na mensagem: o ffmpeg só abre os formatos aceitos (Ogg, MP3, MP4 e AAC) e só o protocolo da própria entrada, de modo que um manifesto de streaming disfarçado de áudio não o leva a ler arquivos locais.

O roteiro de verificação manual dessas garantias está na seção 6 de `_reversa_forward/001-motor-transcricao-local/onboarding.md`.

## Desenvolvimento

Os testes rodam de `auxiliar/`, com o Python que tem o mlx-whisper; com `MOTOR_REAL=1`, incluem os que usam o modelo real do cache local:

```bash
cd auxiliar
<python> -m pytest -q
MOTOR_REAL=1 <python> -m pytest -q
```

A prova de conceito de latência transcreve uma pasta de áudios pelo mesmo caminho do host e compara cada tempo com o limite de desempenho. O texto só aparece no terminal com `--mostrar-texto` e nunca é gravado; `--relatorio <arquivo.md>` grava um relatório que identifica os áudios por número:

```bash
<python> auxiliar/ferramentas/prova_de_conceito.py amostras/reais --mostrar-texto
```
