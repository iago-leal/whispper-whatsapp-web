# Conferência no WhatsApp Web real (2026-10-02 16:20–16:24 -03)

Aba do grupo da automação do Chrome, no perfil do usuário, com a extensão do build de 2026-10-02
15:56 (correção do BUG-20261002-IXWO). A conversa foi aberta pelo próprio usuário. Só se leram
geometria, tags, nomes de atributos, `data-testid` (com o identificador mascarado), classes de direção
e nomes de ícones; os valores de `data-id` foram reduzidos ao comprimento, e nenhum texto de mensagem
foi lido ou registrado. Nada foi clicado.

## 1. Geometria

| Elemento | x (esquerda a direita) | Largura |
|---|---|---|
| Tela (`innerWidth`) | 0 a 1624 | 1624 |
| Lista de conversas (`#side`) | 65 a 551 | 486 |
| Área da conversa (`#main`) | 551 a 1624 | 1073 |

Cinco mensagens de voz visíveis: uma enviada e quatro recebidas.

## 2. Do balão até a linha, em cada mensagem de voz

```text
enviada (#0)
  DIV[data-testid=msg-container]          x 1231 a 1567  336 px   (fundo do balão num filho de mesmo retângulo)
  DIV.focusable-list-item                 x  551 a 1624  1073 px  flex coluna, align-items: flex-end
  DIV                                     x  551 a 1624  1073 px
  DIV[data-virtualized]                   x  551 a 1624  1073 px
  DIV[data-testid=conv-msg-<id>][data-id] x  551 a 1624  1073 px  <- âncora atual (elementoBalao)
  DIV[role=row]                           x  551 a 1624  1073 px

recebida (#1 a #4, mesma cadeia)
  DIV[data-testid=msg-container]          x  613 a  949  336 px
  DIV.focusable-list-item                 x  551 a 1624  1073 px  flex coluna, align-items: flex-start
  DIV, DIV[data-virtualized], DIV[data-testid=conv-msg-<id>][data-id], DIV[role=row]: x 551 a 1624
```

- O `conv-msg[data-id]`, que `voz.closest(balaoMensagem)` devolve e o rastreador mede, ocupa toda a
  largura da área da conversa, nas duas direções.
- O balão visível é o `[data-testid="msg-container"]`, com 336 px, colado à esquerda (recebido, 62 px
  da borda do `#main`) ou à direita (enviado, 57 px da borda).
- O ícone do Whispper está dentro do `conv-msg`, em todas as cinco mensagens.

## 3. Sinais de direção

| Sinal procurado por `identificarMensagemDeAudio` | Presente no DOM real? |
|---|---|
| Classe `message-out` no `conv-msg` ou em qualquer ancestral do balão | não; nem `message-in` |
| Ícone `[data-icon="msg-dblcheck"]` na enviada | não; o estado de entrega é um `SPAN[aria-label="Entregue"]` em `msg-meta`, sem `data-icon` |

- A enviada tem `data-icon="tail-out"`, mas a cauda só aparece na primeira mensagem de um grupo.
- Os `data-id` têm 20 e 32 caracteres, sem o prefixo `true_` ou `false_` de versões antigas.
- O único sinal estrutural comum às cinco é o alinhamento do pai do balão (`flex-end` na enviada,
  `flex-start` nas recebidas), que vem de classes atômicas ofuscadas (`xuk3077` e `x1cy8zhl`).

Conclusão: no DOM atual, o detector classifica toda mensagem como `recebido`.

## 4. Conta do sintoma com a geometria real

Com a âncora atual (x 551 a 1624), não há espaço à direita (1624 − 1624 − 8 < 320). O ramo do espaço à
esquerda, medido na tela, põe a janela em 551 − 320 − 8 = **223**, sobre a lista de conversas. Isso
vale para qualquer direção, porque o ramo `enviado` dá o mesmo x. Com a âncora no `msg-container` e o
espaço medido dentro do `#main`:

| Mensagem | Espaço à direita no `#main` | Espaço à esquerda no `#main` | Posição |
|---|---|---|---|
| recebida | 1624 − 949 − 8 = 667 | 613 − 551 − 8 = 54 | à direita, x = 957 |
| enviada (direção lida como `recebido`) | 1624 − 1567 − 8 = 49 | 1231 − 551 − 8 = 672 | à esquerda, x = 903 |
