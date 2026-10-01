# Whispper: Módulo de Content Script (WhatsApp Web)

Este diretório contém a implementação do content script injetado em `https://web.whatsapp.com/*`, responsável por integrar a interface do Whispper ao WhatsApp Web.

## Arquitetura

O módulo segue uma arquitetura orientada a isolamento de responsabilidades e resiliência:

```
src/content/
├── configuracao-estruturas.ts # 100% dos seletores de DOM e classes do WhatsApp Web
├── detector-mensagens.ts       # MutationObserver otimizado para identificar áudios
├── botao-transcricao.ts        # Renderização do botão acessível e estados de UI
├── extrator-audio.ts           # Obtenção do blob decifrado em memória sem reprodução sonora
├── rastreador-ancora.ts        # Cálculo geométrico de posição e visibilidade no viewport
├── monitor-degradacao.ts       # Validação de saúde dos seletores essenciais
├── estilos.css                 # CSS enxuto e não invasivo para os botões do Whispper
└── index.ts                    # Ponto de entrada do content script
```

## Manutenção de Seletores

Se o WhatsApp Web atualizar sua interface e o botão de transcrição deixar de aparecer:
1. Abra `configuracao-estruturas.ts`.
2. Inspecione o DOM da mensagem de voz no Chrome DevTools (`Cmd + Option + C`).
3. Atualize o seletor correspondente (ex: `elementoMensagemVoz`, `tagAudio` ou `balaoMensagem`).
4. Incremente o campo `versao` e atualize `verificadoEm`.
5. Execute `npm test` e `npm run build`.

## Garantias de Desempenho e Segurança
- **Zero tarefas longas:** O `MutationObserver` é filtrado e focado exclusivamente nas bolhas de conversa, evitando recálculos pesados durante o scroll rápido.
- **Privacidade total:** O content script nunca lê textos de mensagens, imagens ou contatos. Apenas captura o stream de áudio do nó clicado pelo usuário para envio ao motor local.
