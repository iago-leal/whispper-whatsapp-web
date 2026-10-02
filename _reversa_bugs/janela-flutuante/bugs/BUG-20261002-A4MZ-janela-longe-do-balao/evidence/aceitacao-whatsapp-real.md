# Aceitação no WhatsApp Web real: BUG-20261002-A4MZ

| Campo | Valor |
|---|---|
| Data | 2026-10-02, 16:47–16:57 -03 |
| Quem conferiu | iago, na própria conta, na aba do grupo da automação do Chrome; medidas do agente |
| Build | `npm run build` de 2026-10-02 sobre `bb174a2` + CHG-001 a CHG-010 (árvore não commitada); saída em `build-aceitacao.txt` |
| Preparação | extensão recarregada em `chrome://extensions` e aba do WhatsApp Web recarregada |

O usuário abriu a conversa e clicou nos ícones; o agente só leu geometria e o alinhamento do balão
(recebido ou enviado), sem ler o texto das janelas nem das mensagens.

## Medidas

Tela de 1624 × 907; lista de conversas de x = 65 a 551; área da conversa de x = 551 a 1624.

| Áudio | Balão visível | Janela | Posição | Folga | Topos | Cobre a lista | Dentro da conversa |
|---|---|---|---|---|---|---|---|
| Recebido | x 613 a 949, y 739 | x 957 a 1279, y 739 | à direita | 8 px | alinhados | não | sim |
| Enviado | x 1220 a 1556, y 565 | x 892 a 1214, y 565 | à esquerda | 6 px | alinhados | não | sim |

A folga de 6 px do enviado vem da janela desenhada com 322 px (borda de 1 px de cada lado) contra
os 320 px do cálculo; fica dentro da tolerância de 4 px do RF-01.

## Critérios de aceitação

| Critério | Resultado |
|---|---|
| 1. Recebido: à direita do balão, a 8 px, topos alinhados, dentro do painel | passou no WhatsApp real |
| 2. Enviado: à esquerda do balão, nas mesmas condições | passou no WhatsApp real |
| 3. Área da conversa de 600 px: abaixo do balão, sem cobri-lo | passou no navegador de teste (regressão do RF-02); não conferido no WhatsApp real |
| 4. Nenhuma janela cobre a lista de conversas | passou no WhatsApp real e no navegador de teste |
| 5. A âncora mede o balão da mensagem de voz | passou: as folgas e os topos foram medidos contra o `msg-container`, e o teste de navegador usa a estrutura conferida |

## Achados fora do escopo, na mesma conferência

1. **Janela cortada na borda inferior.** A janela do recebido vai de y = 739 a 981, a área das
   mensagens termina em 844 e a tela em 907: a janela cobre a caixa de escrita e perde 73 px abaixo
   da tela. O posicionador não tem limite vertical; o defeito é anterior a esta correção. O usuário
   decidiu registrá-lo como bug próprio, relacionado ao K3DY.
2. **Sobreposição real (K3DY).** A janela do enviado (y 565 a 756, 191 px de altura) e a do recebido
   (y 739 a 981) se cruzam em 17 px na vertical e em x 957 a 1214: o posicionador supôs 160 px de
   altura (565 + 160 + 8 = 733 < 739) e não deslocou a segunda.
3. **Ícone ausente.** Um áudio recebido da conversa tem a marca `data-whispper-injetado` no
   `conv-msg`, mas nenhum ícone do Whispper. Hipótese não verificada: a página redesenhou o conteúdo
   do balão e levou o ícone junto, e a marca, que ficou, faz `deveIgnorarMensagem` recusar a nova
   injeção. Candidato a bug no contexto `integracao-whatsapp-web`.
