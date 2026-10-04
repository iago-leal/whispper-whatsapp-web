# Aceitação no WhatsApp Web real: BUG-20261004-ME3Q

| Campo | Valor |
|---|---|
| Quem conferiu | iago, na própria conta, pediu a aceitação (`/aceitacao-real`); medidas do agente |
| Quando | 2026-10-04 18:03–18:07 -03 |
| Build | build: 2026-10-04 18:01:52 -0300 · commit: b0c3408 · alterações não commitadas em extension/ ou auxiliar/ (`/verificar` completo verde: typecheck, 199 testes da extensão com 197 aprovados e 2 pulados, ruff, 126 do pytest com 6 pulados) |
| Preparação | extensão recarregada no instrumento (`reload_extension`); aba do WhatsApp Web recarregada e trazida para frente; grupo de teste aberto por `span[title]` e conferido por booleano |
| Instrumento | whatsapp-cft (Chrome for Testing, perfil `~/.cache/whispper-cft-perfil`), medidas no DOM com `getBoundingClientRect` e `elementFromPoint`; cliques no ícone de transcrição e no botão de fechar da janela por `evaluate_script` |
| Geometria | rodadas 1 e 2 e print: janela de 1440 × 832, área da conversa de 944 px (x = 496), modo lateral; rodada 3: 1200 × 832, área de 656 px (x = 544), modo abaixo. Área das mensagens de y = 64 a 768 |
| Privacidade | só o grupo `Whispper teste`, conferido por booleano; barra lateral escondida por `adoptedStyleSheets`, com 0 elementos de `#side` visíveis na preparação, na troca de largura e antes do print; só geometria e estado, sem ler o texto transcrito; um print recortado ao `#main` e desfocado (sigma 40), fora do git; nenhum envio |

## Critérios

Fixados às 18:03, depois de medir os balões e antes de abrir qualquer janela. São os quatro do `bug.md`,
lidos pelo adendo `bug-BUG-20261004-ME3Q-v001` (decisão de 17:59, nas Agent Notes): o critério 2 vale para o
balão de outra janela à vista, e a cobertura de mensagens sem janela à vista do outro lado (Delta 2) fica
registrada sem reprovar. O 5 vem do Delta 1.

| # | Critério | Resultado | Medida que sustenta |
|---|---|---|---|
| 1 | No modo lateral (área de 726 px ou mais), numa conversa com os dois lados, a seta de cada janela à vista tem a ponta fora de qualquer janela (`elementFromPoint` 2 px dentro do triângulo) e 9 de 9 pontos do corredor fora delas | **passou** | Área de 944 px; balão 5 enviado, 6 a 9 recebidos. Rodada 1: 4 janelas à vista (6 a 9), 4 pontas livres, 9/9 pontos em cada. Rodada 2: com a 5 destacada, 4 à vista (5, 7, 8 e 9), 4 pontas livres, 9/9; com a 5 fechada, 4 à vista (6 a 9), 9/9. Antes da correção, na mesma geometria, a seta 6 tinha 4 de 9 pontos e a ponta sob a janela 5 |
| 2 | Nenhuma janela à vista cobre o balão de outra janela à vista, na parte dele dentro da área das mensagens; a cobertura de mensagens sem janela à vista do outro lado fica registrada, sem reprovar (Delta 2) | **passou** | 0 coberturas entre janelas à vista em todos os estados das rodadas 1 e 2. Coberturas do Delta 2: a janela 6 sobre a parte do balão 5 dentro da área (x = 1047 a 1224, y = 64 a 145), com a janela 5 cedida ou fechada; a janela 5 sobre a parte direita do balão 6 (x = 719 a 894, y = 227 a 296), com a janela 6 cedida |
| 3 | As janelas à vista não se sobrepõem e mantêm vãos de 8 px entre as que se cruzam na horizontal; com as janelas abertas de um lado só, todas ficam à vista | **passou** | 0 sobreposições em todos os estados; vãos de 8 px entre consecutivas (6→7, 7→8 e 8→9; com a 5 destacada, 5→7, 7→8 e 8→9). Com a 5 fechada, as quatro abertas são recebidas: 4 de 4 à vista |
| 4 | No modo abaixo (área abaixo de 726 px), só a janela de foco fica à vista, com a seta visível (adendo do TTLJ) | **passou** | Rodada 3, área de 656 px: com a janela de foco (a 5) já fechada, 4 abertas e nenhuma à vista; clique no ícone 7, só a 7 à vista (y = 469 a 701, 8 px abaixo do balão, que termina em 461), seta vertical com a ponta livre e 9/9 pontos, ▶ próprio livre |
| 5 | Clicar no ícone de um áudio cuja janela cedeu a põe à vista e oculta a janela com que ela conflita; fechar a janela que causava o conflito devolve a outra | **passou** | Rodada 2: clique no ícone 5, janela 5 à vista (y = 64 a 296, x = 719 a 1041) e 6 oculta; botão de fechar da janela 5, janela 6 de volta à vista no topo da área (y = 64 a 306), com seta reta em y = 271,5 |

## Rodada 1: conversa com os dois lados, modo lateral (18:04)

Lista rolada até o fim no grupo de teste. Balões na área: o enviado 5 em x = 1047 a 1383, y = 56 a 145 (em
parte sob o cabeçalho), e os recebidos 6 a 9 em x = 558 a 894; os áudios 1 a 4, enviados, ficam acima da
área. É a geometria da rodada 3 da aceitação do TTLJ, em que o defeito foi visto. Cliques nos ícones 5, 6, 7,
8 e 9, nessa ordem: transcritos em 9 s.

| Áudio | Lado | Balão (y) | Janela (y; x) | À vista | Seta (cauda → ponta) | Ponta | Pontos |
|---|---|---|---|---|---|---|---|
| 5 | enviado | 56 a 145 | 64 a 296; 719 a 1041 (posição oculta) | não: cede (Delta 1) | oculta | | |
| 6 | recebido | 227 a 316 | 64 a 306; 902 a 1224 | sim | 902; 271,5 → 894; 271,5 (reta) | livre | 9/9 |
| 7 | recebido | 344 a 461 | 314 a 546; 902 a 1224 | sim | 902; 402,25 → 894; 402,25 (reta) | livre | 9/9 |
| 8 | recebido | 489 a 605 | 554 a 786; 902 a 1224 | sim | 902; 564 → 894; 546,75 | livre | 9/9 |
| 9 | recebido | 633 a 722 | 794 a 965; 902 a 1224 | sim | 902; 804 → 894; 677,5 | livre | 9/9 |

- A janela 5, de foco mais antigo, criaria conflito: ficaria sobre o balão 6 e sobre o corredor da seta dele.
  Ela cede, e a pilha das janelas 6 a 9 (901 px, mais alta que os 704 da área) começa no topo e só o excesso
  passa do fim (Adição 2 do HVT4), como na rodada 3 do TTLJ.
- Na rodada 3 do TTLJ, com o posicionador de antes: as cinco à vista, a janela 6 empurrada para y = 304 pela 5
  e a seta dela com 4 de 9 pontos.

## Rodada 2: troca pelo ícone e fechamento, modo lateral (18:05)

| Estado | Abertas | À vista | Posições medidas | Coberturas entre à vista | Setas |
|---|---|---|---|---|---|
| A: clique no ícone 5 | 5 | 5, 7, 8 e 9 | 5 em y = 64 a 296, x = 719 a 1041, seta reta de 1039 a 1047 em y = 104,5; 6 oculta; 7 em 304 a 536, 8 px abaixo da 5, com que se cruza na horizontal; 8 em 544 a 776; 9 em 784 a 955 | 0 | 4 pontas livres, 9/9 cada |
| B: botão de fechar da janela 5 | 4 | 6, 7, 8 e 9 | 6 de volta em y = 64 a 306, seta reta em 271,5; 7, 8 e 9 como na rodada 1 | 0 | 4 pontas livres, 9/9 cada |

- No estado A, a janela 5 cobre a parte direita do balão 6, cuja janela cedeu (Delta 2).
- O clique de fechar foi no botão da própria janela da extensão, que não age sobre o WhatsApp.

## Rodada 3: modo abaixo (18:06)

Janela do instrumento reduzida a 1200 × 832: área da conversa de 656 px (x = 544), balões recebidos em x = 606
a 942.

| Estado | Abertas | À vista | Janela à vista (y; x) | Balão dela (y) | Seta | ▶ próprio |
|---|---|---|---|---|---|---|
| A: logo depois da troca de largura | 4 | nenhuma | | | | |
| B: clique no ícone 7 | 4 | 7 | 469 a 701; 606 a 928 | 344 a 461 | vertical em x = 766, de 469 a 460,5; ponta livre (2 px dentro, em y = 462,5), 9/9 pontos | livre (x = 620 a 654, y = 407 a 441) |

- Estado A: a janela de foco, a 5, tinha sido fechada na rodada 2; fechar a janela de foco não traz outra no
  modo abaixo, como o TTLJ decidiu.
- Estado B: a janela 7 cobre o balão 8 e parte do 9, como admite o Delta 3 do adendo do TTLJ.

## Print do modo lateral (18:06)

Janela do instrumento devolvida a 1440 × 832 e janela 5 reaberta pelo ícone, com a transcrição já pronta
(0 s). Medidas iguais às do estado A da rodada 2: à vista 5, 7, 8 e 9, a 6 oculta, 0 coberturas entre
janelas à vista, 0 sobreposições, 4 pontas livres e 9/9 pontos em cada seta. Barra lateral conferida antes
do print: 0 elementos de `#side` com `visibility` diferente de `hidden`.

O print foi recortado ao `#main` (1888 × 1664 px, `devicePixelRatio` 2) e desfocado com sigma 40. Cópia
desfocada: `aceitacao-modo-lateral-desfocado.png` (o recorte original, `aceitacao-modo-lateral.png`, fica só
na máquina; ambos fora do git pelo `.gitignore`). Mostra a janela 5 à esquerda do balão enviado, sobre a
parte direita do balão 6, e as janelas 7, 8 e 9 empilhadas à direita dos recebidos.

Janela do instrumento restaurada a 1200 × 832 às 18:07.

## Fora desta aceitação

- Conversa alternada sem folga: o grupo de teste não tem essa sequência; ela fica provada pelos testes de
  reprodução e de regressão do posicionador (`posicionador-colisoes.test.ts`).
- Conversa consigo mesmo: não aberta. O trecho de um lado só foi medido no grupo, com as quatro janelas
  recebidas depois de fechada a 5.
- Empate sem foco, que põe à vista a janela de cima: provado só no cálculo.

## Achados laterais

Nenhum defeito novo. As coberturas observadas são as que os adendos admitem: mensagens sem janela à vista do
outro lado, no modo lateral (Delta 2 deste bug), e balões vizinhos no modo abaixo (Delta 3 do TTLJ). A pilha
que passa do fim da área só no excesso é a Adição 2 do HVT4. Seguem candidatos os dois limites já anotados no
adendo: o balão em parte sob a caixa de escrita, que não oculta a janela (não exercitado aqui), e o
posicionador que não conhece os balões de texto nem os de áudios sem janela.
