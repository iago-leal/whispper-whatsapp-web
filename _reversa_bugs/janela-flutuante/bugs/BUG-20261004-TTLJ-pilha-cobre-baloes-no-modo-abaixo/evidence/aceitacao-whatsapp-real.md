# Aceitação no WhatsApp Web real: BUG-20261004-TTLJ

| Campo | Valor |
|---|---|
| Quem conferiu | iago, na própria conta, pediu a aceitação (`/aceitacao-real`); medidas do agente |
| Quando | 2026-10-04 17:00–17:05 -03 |
| Build | build: 2026-10-04 17:01:08 -0300 · commit: a7b6bdd · alterações não commitadas em extension/ ou auxiliar/ (`/verificar` completo verde: typecheck, 190 testes da extensão com 2 pulados, ruff, 126 do pytest) |
| Preparação | extensão recarregada no instrumento (`reload_extension`); aba do WhatsApp Web recarregada e trazida para frente; grupo de teste aberto por `span[title]` |
| Instrumento | whatsapp-cft (Chrome for Testing, perfil `~/.cache/whispper-cft-perfil`), medidas no DOM com `getBoundingClientRect` e `elementFromPoint` |
| Geometria | rodadas 1 e 2: janela de 1200 × 832, área da conversa de 656 px (x = 544), modo abaixo; rodada 3: janela de 1440 × 832, área de 944 px (x = 496), modo lateral. Área das mensagens de y = 64 a 768 em todas |
| Privacidade | só o grupo `Whispper teste`, conferido por booleano; barra lateral escondida por `adoptedStyleSheets`, com 0 elementos de `#side` visíveis em cada medida; só geometria e estado; um print recortado ao `#main` e desfocado (sigma 40), fora do git; nenhum envio |

## Critérios

Fixados às 17:02, antes de olhar a tela. Os critérios 1 a 5 são os do `bug.md`; o 1 é lido pelo adendo
`bug-BUG-20261004-TTLJ-v001` (Deltas 1 e 3), que substituiu o texto original ("nenhuma janela cobre o
balão de um áudio que esteja na área das mensagens, nem o ▶ dele"), inalcançável no modo abaixo. Os 6 e 7
vêm do adendo.

| # | Critério | Resultado | Medida que sustenta |
|---|---|---|---|
| 1 | No modo abaixo, com cinco áudios abertos, há uma janela à vista; ela não cobre o próprio balão nem o ▶ dele (`elementFromPoint` no centro do ▶ não cai numa janela), e, com a área de 390 px ou mais, nenhum ícone de transcrição fica sob ela | **passou** | Rodada 1: 5 abertas, 1 à vista (a do áudio 5, de 389 a 621; balão de 629 a 719); ▶ do áudio 5 livre; 0 de 5 ícones sob janela, também na borda direita. Os ▶ dos vizinhos 3 e 4 ficam sob a janela, como o Delta 3 admite |
| 2 | Cada janela exibida tem a sua seta com trecho visível, ligando-a ao balão correto | **passou** | Modo abaixo: 9 de 9 pontos visíveis em cada janela à vista (áudios 5, 2, 9 e 7), seta de 8 px com a ponta na borda do próprio balão. Modo lateral: 5 de 5 setas com trecho visível e ponta no balão correto (ver o achado lateral 1) |
| 3 | As janelas seguem sem se sobrepor, com vãos de 8 px (RF-05), e nenhuma passa do fim da área das mensagens além do que a spec decidida admitir (no modo abaixo, a janela à vista fica dentro da área) | **passou** | Modo abaixo: 0 sobreposições; janela à vista dentro de 64 a 768 em todos os estados (389–621, 374–545, 454–625, 469–701). Modo lateral: 0 sobreposições, vãos de 8, 8, 8 e 8 px; a pilha de 1141 px, mais alta que a área (704), começa no topo e só o excesso passa do fim (Adição 2) |
| 4 | O modo lateral não regride: com área de 726 px ou mais, todas as janelas abertas ficam à vista, sem sobreposição, com vãos de 8 px, cada uma com seta visível até o próprio balão | **passou** | Rodada 3 (área de 944 px): as 5 janelas com balão na área ficam à vista; as 3 de balões acima da área se ocultam (RF-03). O posicionador de antes da correção (`git show HEAD`) e o de agora dão saídas idênticas nas entradas medidas, iguais às posições lidas na tela (719/64, 902/304, 902/554, 902/794, 902/1034) |
| 5 | A decisão sobre o conflito entre o RF-02 e a Adição 2 no modo abaixo fica registrada num adendo | **passou** | `_reversa_sdd/addenda/bug-BUG-20261004-TTLJ-v001.md`, veredito `spec-desatualizada` às 16:43, emenda do Delta 3 às 16:51 |
| 6 | Clicar no ícone de outro áudio põe a janela dele à vista e oculta a anterior; fechar a janela à vista não traz outra | **passou** | Rodada 1: clique no ícone 2 → só a janela 2 à vista (374 a 545, 8 px abaixo do balão, que termina em 366). Botão de fechar da janela 2 → 4 abertas, 0 à vista, 0 setas. Rodada 2: clique no ícone 7 → só a janela 7 à vista (469 a 701, 8 px abaixo do balão, que termina em 461) |
| 7 | Os critérios 1 a 3 valem também com áudios recebidos (balões à esquerda) | **passou** | Rodada 2: 8 abertas, 1 à vista (a do áudio 9, de 454 a 625; balão de 633 a 722; depois a do 7); ▶ próprio livre; 0 de 5 ícones sob janela; seta com 9 de 9 pontos; dentro da área |

## Rodada 1: cinco áudios enviados, modo abaixo (17:02)

Lista rolada para deixar os cinco balões enviados inteiros na área (y = 159, 277, 394, 512 e 629; balões de
336 × 90 px em x = 807). Cliques nos cinco ícones, em ordem: transcritos em 10 s.

| Estado | Janelas abertas | À vista | Janela à vista (y) | Balão dela (y) | Seta | ▶ próprio | Ícones sob janela |
|---|---|---|---|---|---|---|---|
| A: depois de abrir os cinco | 5 | áudio 5 | 389 a 621, acima do balão (Adição 3) | 629 a 719 | 621 → 629, 9/9 pontos | livre | 0 de 5 |
| B: clique no ícone 2 | 5 | áudio 2 | 374 a 545, abaixo do balão | 277 a 366 | 374 → 366, 9/9 pontos | livre | 0 de 5 |
| C: fechar a janela 2 (botão da janela) | 4 | nenhuma | | | nenhuma | | |

- No estado A, a janela cobre o ▶ dos vizinhos 3 e 4; no B, o do vizinho 3 (Delta 3 do adendo).
- O clique de fechar foi no botão da própria janela da extensão, que não age sobre o WhatsApp.
- Cópia desfocada do estado B: `aceitacao-modo-abaixo-desfocado.png` (original recortado:
  `aceitacao-modo-abaixo.png`; ambos fora do git). Mostra os balões 1 e 2 livres, a janela logo abaixo do
  balão 2, sobre o 3, e os balões 4 e 5 descobertos.

## Rodada 2: quatro áudios recebidos, modo abaixo (17:03)

Lista rolada até o fim: balões recebidos de 336 px em x = 606, em y = 227, 344, 489 e 633 (alturas 89 e
117); o balão enviado 5 em parte sob o cabeçalho. Cliques nos quatro ícones, em ordem: transcritos em 9 s.
As quatro janelas que restaram da rodada 1 seguiam abertas.

| Estado | Janelas abertas | À vista | Janela à vista (y, x) | Balão dela (y) | Seta | ▶ próprio | Ícones sob janela |
|---|---|---|---|---|---|---|---|
| A: depois de abrir os quatro | 8 | áudio 9 | 454 a 625, x = 606 a 928, acima do balão | 633 a 722 | 625 → 633, 9/9 pontos | livre | 0 de 5, também na borda direita |
| B: clique no ícone 7 | 8 | áudio 7 | 469 a 701, x = 606 a 928, abaixo do balão | 344 a 461 | 469 → 461, 9/9 pontos | livre | 0 de 5, também na borda direita |

- O ícone fica em x = 550 a 576, 30 px à esquerda da janela à vista (x = 606).

## Rodada 3: modo lateral (17:04)

Janela do instrumento alargada a 1440 × 832: área da conversa de 944 px (x = 496). Sem novos cliques.

| Áudio | Lado | Balão (y) | Janela (y; x) | À vista | Seta |
|---|---|---|---|---|---|
| 1, 3, 4 | enviado | acima da área | | não (RF-03) | oculta |
| 5 | enviado | 56 a 145 (em parte sob o cabeçalho) | 64 a 296; 719 a 1041 | sim | 9/9 |
| 6 | recebido | 227 a 316 | 304 a 546; 902 a 1224 | sim | 4/9 (achado 1) |
| 7 | recebido | 344 a 461 | 554 a 786; 902 a 1224 | sim | 9/9 |
| 8 | recebido | 489 a 605 | 794 a 1026; 902 a 1224 | sim | 9/9 |
| 9 | recebido | 633 a 722 | 1034 a 1205; 902 a 1224 | sim | 9/9 |

- Vãos de 8 px entre janelas consecutivas que se cruzam na horizontal; 0 sobreposições.
- Janela do instrumento restaurada a 1200 × 832 ao fim.

## Achados laterais

1. **Modo lateral, conversa com os dois lados: a janela de um áudio enviado cobre o corredor e parte do
   balão de um recebido.** Na rodada 3, a janela do áudio 5 (enviado, x = 719 a 1041, y = 64 a 296) fica
   sobre o corredor de 8 px entre o balão 6 (recebido, x = 558 a 894) e a janela dele (x = 902): a seta do
   áudio 6 sobe até o centro do balão e tem 4 de 9 pontos visíveis, e a janela 5 cobre a parte direita do
   balão 6 (x = 719 a 894, y = 227 a 296). Comportamento anterior a esta correção (posicionador idêntico
   antes e depois); a colisão do K3DY só considera janela contra janela. Contexto `janela-flutuante`,
   `related-to` OW7G e K3DY. Candidato a `/reversa-debugger`.
2. **Balão em parte sob a caixa de escrita não oculta a janela**: já registrado nas Agent Notes do bug como
   candidato; não exercitado nesta aceitação, porque os balões das rodadas 1 e 2 estavam inteiros na área.
3. **Ícone em área estreita**: com a área abaixo de uns 390 px, a janela à vista cobre até 6 px da borda
   direita do ícone (diagnóstico §5); está nos Limites conhecidos do adendo, não é defeito novo.
