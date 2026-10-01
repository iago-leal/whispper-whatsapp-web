# Interface: Protocolo 1 entre extensão e aplicativo auxiliar

> Identificador da feature: `001-motor-transcricao-local`
> Tipo: mensagens JSON sobre Native Messaging do Chrome (entrada e saída padrão do host)
> Base: `_reversa_sdd/sdd/motor-transcricao-local.md#8. Design e Interface` (contrato de mensagens, protocolo 1)
> Exemplos canônicos: `contratos/protocolo-1.json`, lido pelas suítes de Python e de TypeScript (DT-17)

## 1. Transporte

- 🟢 Nome do host: `whispper_whatsapp_web.motor`.
- 🟢 Cada mensagem é um objeto JSON em UTF-8, precedido do tamanho em bytes num inteiro de 32 bits na ordem nativa (little-endian no Apple Silicon).
- 🟢 Tamanho máximo: 64 MiB da extensão para o host; 1 MB do host para a extensão.
- 🟢 A saída padrão do host transporta só mensagens do protocolo (DT-04).
- 🟡 O host lê o prefixo de tamanho e recusa, encerrando o processo, um valor acima de 64 MiB, porque não há como ressincronizar o fluxo; o Chrome entrega isso à extensão como "Native host has exited".

## 2. Ciclo de vida

1. A extensão chama `chrome.runtime.connectNative("whispper_whatsapp_web.motor")` na primeira verificação.
2. O Chrome inicia o lançador com a origem `chrome-extension://<id>/` como primeiro argumento. O host confere a origem contra `extensao_id` da configuração e encerra se não coincidir (DT-13).
3. O host inicia o trabalhador e o carregamento do modelo imediatamente (RF-06) e passa a responder "carregando".
4. O fim da entrada padrão (porta fechada pela extensão ou pelo Chrome) encerra o trabalhador, apaga a pasta temporária e termina o host com código 0.

## 3. Mensagens da extensão para o host

### 3.1 `verificar`

```json
{ "tipo": "verificar", "protocolo": 1 }
```

### 3.2 `transcrever`

```json
{ "tipo": "transcrever", "protocolo": 1, "idPedido": "p-17",
  "midia": "audio/ogg; codecs=opus", "audioBase64": "<bytes em base64>" }
```

| Campo | Regra |
|-------|-------|
| `idPedido` | 1 a 64 caracteres entre `A-Z`, `a-z`, `0-9`, `_` e `-`; único entre os pedidos pendentes da conexão. O adaptador gera `p-<contador>`. |
| `midia` | Tipo de mídia; parâmetros após `;` são ignorados. Aceitos: `audio/ogg`, `audio/opus`, `audio/mpeg`, `audio/mp3`, `audio/mp4`, `audio/x-m4a`, `audio/aac`. |
| `audioBase64` | Base64 padrão, com preenchimento. Vazio é aceito e resulta em "áudio ilegível". |

## 4. Mensagens do host para a extensão

### 4.1 `estado`, resposta a cada `verificar`

```json
{ "tipo": "estado", "protocolo": 1, "versaoApp": "1.0.0",
  "modelo": "mlx-community/whisper-large-v3-turbo", "estado": "pronto", "motivo": null }
```

| `estado` | Quando | `motivo` |
|----------|--------|----------|
| `carregando` | Trabalhador iniciando ou modelo carregando, inclusive após interrupção por prazo e após ociosidade | `null` |
| `pronto` | Modelo carregado | `null` |
| `erro` | Falha que impede transcrever | um dos motivos da seção 5.2 |

🟡 Os campos `tipo` e `protocolo` desta mensagem são estáveis entre versões do protocolo, para que a extensão sempre reconheça a incompatibilidade.

### 4.2 `resultado`, resposta a `transcrever` bem-sucedido

```json
{ "tipo": "resultado", "idPedido": "p-17", "texto": "…", "idioma": "pt",
  "duracaoAudioSeg": 42.0, "processamentoMs": 3100 }
```

`texto` pode ser vazio quando não há fala (RF-20). `idioma` é o código de duas letras detectado pelo Whisper.

### 4.3 `erro`

```json
{ "tipo": "erro", "idPedido": "p-17", "codigo": "FALHA_NA_TRANSCRICAO", "motivo": "áudio ilegível" }
```

```json
{ "tipo": "erro", "idPedido": "p-18", "codigo": "VERSAO_INCOMPATIVEL",
  "motivo": "versão de protocolo incompatível", "protocoloApp": 2, "protocoloPedido": 1 }
```

`idPedido` é `null` quando a mensagem de origem não tem identificador válido.

## 5. Códigos e motivos

### 5.1 Códigos de `erro`

| Código | Quando | Novo em relação à spec |
|--------|--------|------------------------|
| `FALHA_NA_TRANSCRICAO` | Falha de um áudio específico | não |
| `VERSAO_INCOMPATIVEL` | `protocolo` do pedido diferente do host; traz `protocoloApp` e `protocoloPedido` | campos novos |
| `MOTOR_INDISPONIVEL` | `transcrever` recebido com o host em `erro` (RN-06); `motivo` repete o motivo do estado | sim, no protocolo |
| `MENSAGEM_INVALIDA` | JSON inválido, `tipo` ausente ou desconhecido, campo obrigatório ausente ou malformado, `idPedido` duplicado; `motivo` é sempre "mensagem inválida", e o campo opcional `detalhe` diz qual regra falhou (RF-21) | sim |

### 5.2 Motivos normalizados

| Contexto | Motivos |
|----------|---------|
| `estado: "erro"` | "modelo não encontrado"; "memória insuficiente para o modelo"; "mlx-whisper ausente"; "ffmpeg ausente"; "configuração inválida: <campo>"; "falha ao carregar o modelo" |
| `FALHA_NA_TRANSCRICAO` | "áudio ilegível"; "formato não suportado"; "prazo excedido"; "falha do Whisper"; "texto maior que o limite" |

## 6. Ordem, concorrência e idempotência

- 🟡 `verificar` é respondido de imediato, mesmo com transcrição em curso, e as respostas `estado` saem na ordem das verificações recebidas. A extensão correlaciona cada `estado` com a verificação pendente mais antiga.
- 🟢 Pedidos `transcrever` são atendidos um por vez, na ordem de chegada (RF-07); pedidos recebidos com o modelo carregando aguardam o fim do carregamento (RF-06).
- 🟡 Respostas `resultado` e `erro` são correlacionadas por `idPedido`; podem vir intercaladas com respostas `estado`.
- 🟡 Não há idempotência: repetir o mesmo áudio com outro `idPedido` gera nova transcrição. Evitar retrabalho é papel do núcleo (RF-06 do núcleo).

## 7. Prazos

| Prazo | Valor | Lado | Efeito |
|-------|-------|------|--------|
| Resposta a `verificar` | 10 s | extensão | Estado "indisponível" com o motivo "sem resposta"; a extensão fecha a porta e reconecta na chamada seguinte (RF-19). |
| Transcrição | o maior entre 60 s e 30 s por minuto de áudio, desde a entrega ao trabalhador | host | `erro` FALHA_NA_TRANSCRICAO "prazo excedido"; o trabalhador é recriado (RF-24, DT-15). |
| Ociosidade | `ocioso_min` da configuração, padrão 30 min sem `transcrever` | host | O trabalhador é encerrado; a próxima mensagem reinicia o carregamento (RF-23, DT-16). |

## 8. Limites

- 🟢 A extensão não envia pedido cuja mensagem serializada passe de 64 MiB; com base64, isso corresponde a cerca de 48 MiB de áudio (RF-18).
- 🟡 O host não envia `resultado` serializado acima de 1 MB; nesse caso responde FALHA_NA_TRANSCRICAO "texto maior que o limite". O limite só seria atingido por áudio de muitas horas.

## 9. Versionamento

🟢 `protocolo` é inteiro, começa em 1 e é incrementado a cada mudança incompatível (RN-05). Acréscimo de campo opcional em resposta não muda a versão; mudança de significado, remoção de campo ou novo campo obrigatório em pedido mudam.
