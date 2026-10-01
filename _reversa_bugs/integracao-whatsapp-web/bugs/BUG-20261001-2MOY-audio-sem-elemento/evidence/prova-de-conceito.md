# Prova de conceito no WhatsApp Web real (2026-10-01 15:36–15:45 -03)

Aba do grupo da automação do Chrome, no perfil do usuário, com a extensão do commit `9eee588`
carregada. O áudio de teste (6 s, `ptt`) foi enviado pelo usuário de um segundo aparelho e não foi
tocado. As outras duas linhas de voz da conversa eram áudios enviados pelo próprio usuário havia
cerca de três dias e não foram usadas. Só se leram nomes de módulos, contagens, tipos, tamanhos,
os 4 primeiros bytes e durações; nenhum `data-id` foi registrado, e os bytes do áudio ficaram no
escopo da função de sondagem, sem reprodução nem gravação.

## 1. Reprodução de ponta a ponta (antes da prova)

| Momento | `<audio>` no documento | Rótulo do player | Janela do Whispper |
|---|---|---|---|
| Antes do clique no ícone | 0 | "Reproduzir mensagem de voz" | nenhuma |
| 4 s após o clique | 0 | "Reproduzir mensagem de voz" | corpo "Erro: AUDIO_INDISPONIVEL", rodapé "Tentar de novo" |

- O ícone estava presente nas 3 linhas de voz (1 por linha), com o GAOZ corrigido.
- O erro chegou à janela, logo o motor estava disponível: `executarTranscricao` só pede o áudio
  depois de verificar o motor.
- A janela mostra só o código, sem o motivo legível do EC-02/EC-03; fica anotado para o plano.

## 2. O mecanismo interno da página existe

| Sonda | Resultado |
|---|---|
| `typeof window.require` | `function` (carregador de módulos da própria página) |
| `require('WAWebCollections').Msg` | coleção presente, com `get` e `getModelsArray` |
| `require('WAWebDownloadManager').downloadManager.downloadAndMaybeDecrypt` | função de 1 parâmetro (objeto) |
| `data-id` da linha → modelo | 20 caracteres, igual a `msg.id.id`; 1 modelo casado por linha |

Campos do modelo do áudio de teste: `type: ptt`, `id.fromMe: false`, `duration: "6"`,
`mimetype` de base `audio/ogg`, `mediaData.mediaStage: RESOLVED`, `ack: 1`; `directPath`,
`mediaKey`, `encFilehash` e `filehash` presentes.

## 3. A página não guarda cópia decifrada do áudio nunca tocado

`mediaData.mediaBlob` ausente, apesar de `mediaStage: RESOLVED`. A "cópia já carregada pela página"
do RF-06 não existe para este caso; resta o mecanismo de download (EC-01).

## 4. Download decifrado pela própria página, sem som

Chamada: `downloadAndMaybeDecrypt({ directPath, encFilehash, filehash, mediaKey, mediaKeyTimestamp,
type, mimetype, signal, downloadQpl })`, com os campos do modelo e um `downloadQpl` inerte.

| Tentativa | Resultado |
|---|---|
| sem `mimetype` | recusa em 4 ms: `InvalidMediaFileType: Unexpected mimetype application/octet-stream for media type ptt` |
| com `mimetype` | `ArrayBuffer` de 14.771 bytes em 12 ms, iniciado por `OggS` |

- Duração lida do próprio Ogg (granule position da última página, 48 kHz): 6,21 s; o modelo diz
  "6". Dentro da tolerância de 1 s do RF-06.
- Depois da chamada: `ack: 1`, `mediaStage: RESOLVED`, `mediaBlob` ausente, 0 `<audio>`, player
  "Reproduzir mensagem de voz". Nenhum estado da página mudou.
- 12 ms está abaixo do RNF-02 (≤ 1 s); a rapidez sugere cache da mídia cifrada pela página, e o
  tempo de rede de um áudio nunca baixado pode ser maior (EC-03 fixa 30 s).

## 5. RF-07 (estado de reprodução visto pelo remetente)

- Observação do usuário às 15:45: no aparelho remetente, o microfone do áudio de teste não ficou azul.
- Ressalva: o usuário desligou as confirmações de leitura na véspera. As fontes divergem sobre se o
  recibo de reprodução de áudio continua sendo enviado nesse caso; a maioria afirma que sim. Sem
  controle positivo, a observação não distingue "não houve recibo" de "o recibo foi suprimido".
- Controle positivo pendente: tocar o áudio de teste e conferir se o microfone fica azul no
  remetente. Se ficar, o instrumento é sensível e a observação acima vale como prova do RF-07.
