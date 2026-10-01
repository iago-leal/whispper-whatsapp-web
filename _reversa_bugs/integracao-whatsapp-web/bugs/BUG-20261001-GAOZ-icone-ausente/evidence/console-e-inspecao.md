# Console e inspeção estrutural (2026-10-01 13:56, aba da automação do Chrome, perfil do usuário com a extensão recarregada)

## Console da aba web.whatsapp.com (filtro: whispper)

```text
[13:56:44] [WARNING] (chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/dist/content/index.js:1346:14)
[Whispper] Adaptador em estado degradado. Estruturas ausentes: Array(1)
```

O aviso é emitido no carregamento da página, antes de qualquer conversa aberta.

## Estrutura com a conversa aberta (seletores de src/content/configuracao-estruturas.ts contados dentro de #main)

```json
{
  "temMain": true,
  "seletoresDoProjeto": {
    "containerMensagens": 1, "balaoMensagem": 2, "elementoMensagemVoz": 1,
    "tagAudio": 0, "botaoPlayNativo": 1, "pontoDeInjecaoBotao": 2
  },
  "whispperInjetados": 0,
  "botoesWhispper": 0,
  "dataIcons": ["ic-sync", "tail-in", "ptt-status", "plus-rounded"],
  "ariaLabelsBotoes": ["Dados do perfil", "Ligação de vídeo", "Ligação de voz", "Pesquisar", "Mais opções",
    "Reproduzir mensagem de voz", "Mudar velocidade de reprodução, no momento 1×", "Anexar",
    "Emojis, GIFs, figurinhas", "Mensagem de voz"],
  "dataTestids": ["conversation-background-default_chat_wallpaper", "conversation-header", "conversation-info-header",
    "conversation-info-header-chat-title", "chat-subtitle", "selectable-text", "conversation-panel-body",
    "conversation-panel-messages", "ic-sync", "conv-msg-<id mascarado>", "msg-container", "tail-in", "ptt-status",
    "msg-meta", "addon-bubble-container", "compose-box", "plus-rounded", "conversation-compose-box-input"]
}
```

Leitura: o detector casaria o balão de voz (1 botão "Reproduzir mensagem de voz"), mas nenhum botão foi injetado: a inicialização abortou no carregamento.
