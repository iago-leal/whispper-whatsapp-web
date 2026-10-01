# Aceitação no WhatsApp Web real (2026-10-01 16:20–16:34 -03)

Aba do grupo da automação do Chrome, no perfil do usuário. Extensão com o Gate 2 aplicado
(`npm run build` de 16:16), recarregada pelo usuário em `chrome://extensions`, com a aba do WhatsApp
atualizada. Áudios de teste enviados pelo usuário de um segundo aparelho, na conversa aberta por
ele. Leitura só de estrutura e de estado: contagens, tipos, `ack` e duração; do texto transcrito,
apenas o número de palavras. O usuário conferiu o texto por conta própria.

## 1. A ponte do mundo da página está na página real

Aperto de mão feito do mundo da página, como o script de conteúdo faz: resposta `pronta`. O Chrome
do usuário aceitou o manifesto com `world: "MAIN"` e `run_at: "document_start"`.

## 2. Transcrição de ponta a ponta

| Áudio | Duração | `ack` antes | Resultado do clique | Tempo | `<audio>` criados | Player |
|---|---|---|---|---|---|---|
| 2º de teste (16:19) | 9 s | não medido | janela com 19 palavras, "Copiar", sem erro | ≈ 3,8 s | 0 | "Reproduzir mensagem de voz" |
| 3º de teste (16:29) | 13 s | 1 | janela com 39 palavras, "Copiar", sem erro | 9,7 s | 0 | "Reproduzir mensagem de voz" |

- Fidelidade (RF-06): o usuário ouviu o 2º áudio e confirmou que a transcrição corresponde à fala
  (captura de 16:22).

## 3. RF-07: estado de reprodução

### Instrumento do remetente: cego nesta configuração

- Controle positivo às 16:28: o usuário tocou o 1º e o 2º áudios para conferir a fidelidade, e o
  aparelho remetente continuou a mostrar ambos com microfone e tiques cinza (captura do usuário).
- Com as confirmações de leitura desligadas na conta destinatária, o recibo de reprodução não
  chega ao remetente; a observação do remetente não distingue "não reproduzido" de "recibo
  suprimido". O critério de aceitação do RF-07 fica trivialmente satisfeito e sem valor de prova.

### Instrumento do destinatário: `ack` do modelo da mensagem

- Controle positivo: depois que o usuário tocou o 1º e o 2º áudios, o `ack` dos dois passou de 1 a
  **4** (reproduzido), com `lastPlaybackProgress: 0`. O `ack` local registra a reprodução.
- Teste decisivo com o 3º áudio, nunca tocado: registrador passivo do `ack` a cada 250 ms, ligado
  antes do clique e removido no fim.

```text
     0 ms  ack 1  antes do clique
  9682 ms  ack 1  fim da transcrição
191 000 ms  ack 1  fim da observação (nenhuma transição registrada)
```

- `lastPlaybackProgress: 0`, 0 `<audio>` no documento, player intacto.
- Leitura: a obtenção pela ponte não marca o áudio como reproduzido no cliente, que é quem emite o
  recibo. Com o instrumento do remetente cego, esta é a melhor prova disponível do RF-07; a prova
  pelo remetente exigiria religar as confirmações de leitura (decisão do usuário).

## 4. Achado lateral

A janela da transcrição abriu no canto inferior esquerdo, sobre a lista de conversas, e não junto
ao balão do áudio (captura de 16:22). É defeito da âncora da janela flutuante, de outro contexto, e
fica como candidato a bug próprio.
