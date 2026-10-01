# Data delta: Motor de transcrição local

> Identificador: `001-motor-transcricao-local`
> Data: `2026-09-30`
> Base de comparação: `_reversa_sdd/sdd/motor-transcricao-local.md#9. Modelo de Dados` (não há modelo extraído de legado)

## 1. Resumo

🟢 Não há banco de dados nem migração. Todos os dados são arquivos locais na máquina do usuário, criados pelo instalador ou pelo aplicativo auxiliar e removidos pela desinstalação, exceto o cache de modelos, que pertence ao uso atual do mlx-whisper e não é tocado.

| Arquivo | Local | Criado por | Removido pela desinstalação |
|---------|-------|------------|-----------------------------|
| `config.toml` | `~/Library/Application Support/whispper-motor/` | instalador | sim |
| `desempenho.tsv` | `~/Library/Application Support/whispper-motor/` | aplicativo auxiliar | sim |
| `diagnostico.log` | `~/Library/Application Support/whispper-motor/` | aplicativo auxiliar | sim |
| Código e lançador `whispper-motor` | `~/Library/Application Support/whispper-motor/` | instalador | sim |
| `whispper_whatsapp_web.motor.json` | `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/` | instalador | sim |
| Temporários de MP4 | pasta privada criada em `$TMPDIR` a cada execução do host, permissão 0700 | aplicativo auxiliar | apagados ao fim de cada pedido e ao encerrar |
| Modelos | `~/.cache/huggingface/hub/` | uso atual do mlx-whisper | não |

## 2. ConfiguracaoDoAuxiliar (`config.toml`)

Diff sobre a entidade da spec:

| Campo | Situação | Tipo | Padrão | Observação |
|-------|----------|------|--------|------------|
| `modelo` | mantido | texto | `"mlx-community/whisper-large-v3-turbo"` | Identificador do repositório no cache ou caminho absoluto de pasta de modelo MLX. Padrão definido no esclarecimento de 2026-09-30 (RF-15). |
| `pasta_de_modelos` | mantido | caminho | `"~/.cache/huggingface/hub"` | Onde o identificador é resolvido por `refs/main` (DT-06). |
| `ffmpeg` | novo | caminho absoluto | detectado na instalação | O host não depende do PATH (DT-03). |
| `extensao_id` | novo | texto de 32 letras de a a p | calculado da `key` do manifesto | Conferido contra o primeiro argumento do host (DT-13). |
| `ocioso_min` | novo | inteiro | `30` | Minutos sem pedido até descarregar o modelo (RF-23). Mínimo 1. |

Exemplo:

```toml
# whispper-motor: configuração do aplicativo auxiliar
modelo = "mlx-community/whisper-large-v3-turbo"
pasta_de_modelos = "~/.cache/huggingface/hub"
ffmpeg = "/opt/homebrew/bin/ffmpeg"
extensao_id = "abcdefghijklmnopabcdefghijklmnop"
ocioso_min = 30
```

Regras: campo ausente assume o padrão; valor inválido deixa o motor em "erro" com o motivo "configuração inválida: <campo>"; a configuração é lida quando o host inicia, de modo que a troca de modelo vale na conexão seguinte (critério do RF-15).

## 3. RegistroDeDesempenho (`desempenho.tsv`)

Diff sobre a entidade da spec:

| Coluna | Situação | Tipo | Observação |
|--------|----------|------|------------|
| `instante` | mantida | data e hora ISO 8601 com fuso | |
| `evento` | nova | `pedido`, `carregamento` ou `descarregamento` | Torna aferível o objetivo G-02 do motor (RF-05, RF-17, RF-23). |
| `duracao_audio_seg` | mantida | decimal com uma casa | Vazia fora de `pedido`. |
| `processamento_ms` | mantida | inteiro | Em `pedido`, da entrega ao trabalhador até o resultado; em `carregamento`, duração do carregamento; vazia em `descarregamento`. |
| `resultado` | mantida | `ok` ou código de erro | Em `carregamento`, `ok` ou o motivo normalizado do erro. |

Exemplo:

```tsv
instante	evento	duracao_audio_seg	processamento_ms	resultado
2026-10-01T09:12:03-03:00	carregamento		3140	ok
2026-10-01T09:14:40-03:00	pedido	42.0	3100	ok
2026-10-01T09:15:02-03:00	pedido	0.0	12	FALHA_NA_TRANSCRICAO
2026-10-01T09:45:02-03:00	descarregamento			ok
```

Regras: nenhuma coluna guarda texto transcrito, nome de arquivo, remetente ou trecho de áudio; ao passar de 1 000 linhas de dados, o arquivo é reescrito com as 1 000 mais recentes, preservando o cabeçalho.

## 4. Registro de diagnóstico (`diagnostico.log`)

Novo, sem correspondente na spec (DT-05). Uma linha por evento: instante, nível e mensagem fixa do código (por exemplo, "trabalhador encerrado por prazo", "falha ao carregar o modelo: MemoryError"). Nunca registra texto transcrito nem conteúdo de mensagem do protocolo. Ao iniciar, se o arquivo passar de 1 MiB, é truncado para os últimos 512 KiB.

## 5. Manifesto do host (formato do Chrome)

Novo, sem correspondente na spec:

```json
{
  "name": "whispper_whatsapp_web.motor",
  "description": "Motor de transcrição local do whispper-whatsapp-web",
  "path": "/Users/<usuario>/Library/Application Support/whispper-motor/whispper-motor",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://<extensao_id>/"]
}
```

## 6. Lançador (`whispper-motor`)

Script de shell gerado pelo instalador, com permissão de execução, que define `HF_HUB_OFFLINE=1`, `HF_HUB_DISABLE_TELEMETRY=1` e `PYTHONPATH` apontando para a pasta do aplicativo, e executa o interpretador escolhido na instalação, por caminho absoluto, com `-m whispper_motor "$@"`.

## 7. Dados em memória

- Na extensão: estado da conexão, pedidos pendentes indexados por `idPedido` e a fila de verificações aguardando resposta. Nada é persistido.
- No host: fila de pedidos, estado interno (`carregando`, `pronto`, `erro`, `ocioso`) e relógio de ociosidade. O áudio decodificado vive só durante o pedido.

## 8. Migrações

🟢 Nenhuma. Primeira versão.
