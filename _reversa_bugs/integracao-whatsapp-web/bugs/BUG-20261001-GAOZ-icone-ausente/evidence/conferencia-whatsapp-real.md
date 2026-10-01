# Conferência no WhatsApp Web real (2026-10-01 14:54–15:01 -03)

Aba do grupo da automação do Chrome, no perfil do usuário, com a extensão recarregada depois do
`npm run build` de 14:52 (bundle com CHG-001 e CHG-002). As conversas foram abertas pelo próprio
usuário. Só se leram tags, nomes de atributos, contagens e tempos; os valores de `data-id` foram
mascarados e nenhum texto de mensagem foi lido ou registrado.

## 1. A extensão está na página

- Uma sonda com a classe `whispper-btn-transcrever`, anexada e removida em seguida, recebeu `margin-left: 6px` de `dist/content/estilos.css`: o script de conteúdo foi injetado.
- O console da aba não mostrou erro nem aviso da extensão. Com a página carregada sem conversa, não houve aviso de degradação (EC-10), ao contrário do relato original.

## 2. Mesmo assim, nenhum ícone

| Momento | Linhas com voz em `#main` | Ícones por linha de voz | Elementos marcados |
|---|---|---|---|
| Primeira conversa aberta | 1 | [0] | 0 |
| Segunda conversa aberta | 2 | [0, 0] | 0 |

## 3. Ordem de montagem na troca de conversa (registrador passivo, `MutationObserver` em `document.body`)

```text
90170ms  #main inserido, com 6 linhas e a lista de mensagens, 0 botões de voz
90302ms  DIV com 1 botão de voz inserido DENTRO de uma linha já existente
91904ms  25 blocos com 1 a 5 linhas cada (histórico), 0 botões de voz
91988ms  DIV com 1 botão de voz inserido dentro de linha existente
92062ms  DIV com 1 botão de voz inserido dentro de linha existente
```

- `#main` foi substituído: o painel da primeira conversa ficou desconectado (`isConnected: false`). Isso confirma, no WhatsApp real, a causa contribuinte 1.
- O player de voz entra depois do balão, dentro dele. `observarMensagensDeAudio` só procura balões no nó adicionado (o próprio nó ou os descendentes dele), e nunca os ancestrais; por isso o player tardio passa sem ícone (causa contribuinte 2).

## 4. Estrutura de uma linha de voz (do botão até `#main`)

```text
BUTTON[aria-label="Reproduzir mensagem de voz"]
DIV ×9 (sem atributos relevantes; um com tabindex)
DIV[data-testid=msg-container]
DIV ×2
DIV[data-virtualized]
DIV[data-testid=conv-msg-<id>][data-id=<20 caracteres>]
DIV[role=row]
DIV ×2
DIV[data-tab]                      (containerMensagens)
DIV[data-testid=conversation-panel-messages]
DIV ×2
DIV[data-testid=conversation-panel-body]
```

- Toda linha de `#main` tem exatamente um elemento `[data-id]`, e `conv-msg-<data-id>` é o `data-testid` dele: o `data-id` é o identificador da mensagem.
- `balaoMensagem` (`[data-id], div[role="row"]`) casa a linha e o `conv-msg` da mesma mensagem. Com o player presente na varredura inicial, a mensagem receberia 2 ícones (RF-02).
- `voz.closest(balaoMensagem)` devolve o `conv-msg`, que carrega o identificador estável (RF-04).
- Nenhum `pontoDeInjecaoBotao` casa dentro da linha: o botão vai para o próprio balão.
- Não há `<audio>` na linha antes da reprodução, o que é coerente com o BUG-20261001-2MOY.

## 5. Aceitação depois do CHG-006 (2026-10-01 15:16–15:23 -03)

Build de 15:09 com CHG-001 a CHG-007, extensão recarregada pelo usuário e aba recarregada. A primeira e a segunda conversa foram abertas pelo usuário; a pedido dele, o retorno às duas foi feito por clique na lista lateral. Leitura só de estrutura, como antes; o registrador passivo foi desligado ao fim.

| Passo | `#main` substituído | Linhas de voz | Ícones por linha de voz | Ícones fora de linha de voz | `data-id` do ícone = do balão |
|---|---|---|---|---|---|
| Primeira conversa (aberta pelo usuário) | — | 1 | [1] | 0 | sim |
| Segunda conversa | sim | 2 | [1, 1] | 0 | sim |
| Volta à primeira (clique) | sim | 1 | [1] | 0 | sim |
| Volta à segunda (clique) | sim | 2 | [1, 1] | 0 | sim |

- Latência player → ícone medida na volta à primeira: 0 ms. O ícone entra no mesmo ciclo de mutações que o player, bem abaixo dos 500 ms do RF-03.
- Console da aba: nenhuma mensagem nem erro da extensão em toda a conferência. A página carregada sem conversa não emitiu o aviso de degradação (EC-10).
- Na primeira leitura da volta à segunda, a aba estava oculta e o WhatsApp só tinha 4 linhas renderizadas, sem player; com a conversa na tela, as 54 linhas apareceram e as 2 de voz receberam o ícone.
- Com isso, os três critérios de aceitação do bug valem no WhatsApp Web real.
