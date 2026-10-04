# Diagnóstico do BUG-20261004-TTLJ

- Data: 2026-10-04, cerca de 16:20 -03, pelo `/reversa-debugger-fix`.
- Commit base: `a7b6bdd` (main). Nenhum arquivo de `extension/` mudou desde `4518b43`, o commit do build da
  reprodução (`git diff --stat 4518b43 HEAD -- extension/` vazio): a cápsula `reproduction.md` segue válida.
- Ambiente: macOS 27.0.1, Node v26.10.0; instrumento `whatsapp-cft` no grupo de teste, conferido por
  booleano, com a barra lateral escondida (0 elementos de `#side` com `visibility` diferente de `hidden`).

## 1. O algoritmo isolado reproduz a geometria medida

Script do scratchpad, com as entradas medidas no WhatsApp (balões de 336 × 89 em x = 807, y = 293, 410,
528, 645 e 763; janelas de 232, 171, 211, 242 e 232; área de x = 544 a 1200; mensagens de 64 a 768),
chamando `calcularPosicoesJanelas` de `extension/src/content/posicionador-colisoes.ts`:

| Janela | Com a faixa vertical (hoje) | Cobre | Sem a faixa (antes do HVT4) | Cobre |
|---|---|---|---|---|
| 1 | 64 a 296, seta abaixo | B1 3% | 390 a 622, seta acima | B2 100%, B3 100% |
| 2 | 304 a 475, seta abaixo | B1 88%, B2 73% | 630 a 801, seta acima | B4 100%, B5 43% |
| 3 | 483 a 694, seta acima | B2 18%, B3 100%, B4 55% | 809 a 1020, seta acima | B5 48% |
| 4 | 702 a 944, seta acima | B4 36%, B5 100% | 1028 a 1270, seta acima | (fora da tela) |
| 5 | 952 a 1184, seta acima | (fora da tela) | 1278 a 1510, seta acima | (fora da tela) |

- As posições com a faixa são exatamente as medidas na reprodução (64, 304, 483, 702, 952): o defeito
  nasce no cálculo, não no desenho nem na medida do adaptador.
- Sem a faixa, o modo abaixo já cobria por inteiro os balões seguintes: a janela 1, abaixo do balão 1,
  cobre os balões 2 e 3. O defeito é anterior ao HVT4; a subida da Adição 2 o agrava, cobrindo também o
  próprio balão.
- Setas: a seta do modo abaixo é vertical, da borda da janela ao balão. A janela empurrada para baixo de
  outra (ou subida acima de outra) tem a seta atravessando a vizinha, e a camada das setas fica atrás das
  janelas (`garantirCamadaSetas`, OW7G): a seta some.

## 2. Largura da área da conversa e balão de voz

Medido redimensionando a janela do instrumento e restaurando-a a 1200 × 832 ao fim (as cinco janelas
voltaram a 64, 304, 483, 702 e 952):

| Janela do navegador | Área da conversa (`#main`) | Balão de voz | Espaço ao lado do balão |
|---|---|---|---|
| 1200 px | x = 544, 656 px | 336 px, x = 807 | 255 px à esquerda |
| 900 px | x = 424, 476 px | 336 px, x = 507 | 75 px à esquerda |
| 760 px | x = 406, 354 px | 336 px | nenhum |

- O balão de voz tem largura fixa (336 px); a área da conversa encolhe com a janela do navegador. Com a
  lista de conversas aberta (544 px a 1200), o modo lateral exige janela de uns 1270 px: abaixo disso,
  toda janela cai no modo abaixo. O modo abaixo é o caso comum de janela não maximizada, não um canto.
- Estreitar a janela flutuante só alcançaria uma faixa curta (área de uns 600 a 726 px); a 900 px de
  navegador sobram 75 px ao lado do balão.

## 3. Onde ficam o ▶ e o ícone da extensão

- ▶ do player: 34 × 34 px, de 76 a 110 px da borda esquerda do balão, no meio da altura (x = 883 a 917 a
  1200 px de navegador).
- Ícone de transcrição da extensão: 26 × 26 px, na borda esquerda da área da conversa (x = 550), na linha
  logo abaixo de cada balão (y = 382, 500, 617, 735, 852). É ele que abre o vão de 28 px entre os balões
  de voz. Fica fora da coluna dos balões: a janela do modo abaixo (x = 807 a 1129) não o cobre.
- O clique no ícone de um áudio cuja janela está aberta chega ao gerenciador como `destacar`
  (`nucleo.ts`, `processarSolicitacao`: cache, fila ou transcrição em curso).

## 4. Conclusão

Causa raiz **confirmada**: no modo abaixo, `calcularPosicoesJanelas` põe cada janela na coluna do próprio
balão e só resolve colisão entre janelas, nunca contra balões; numa sequência de áudios (um a cada 117 px)
qualquer pilha de janelas de 171 a 242 px cobre balões, e `conterNaFaixa` sobe a pilha sem distinguir o
modo. Na origem, uma lacuna de spec: o RF-02 foi escrito para uma janela; sua combinação com o RF-05 (várias
janelas) e com a Adição 2 nunca foi especificada, como o "Limite conhecido" do adendo do HVT4 admite.

## 5. Ícone da extensão nos áudios recebidos (medido às 16:50, depois do veredito)

Medido no grupo de teste, só em geometria, com quatro áudios recebidos que chegaram depois da reprodução
(balões alinhados à esquerda, `align-items: flex-start`); janela do instrumento restaurada a 1200 × 832 ao
fim. Cobertura calculada com o `calcularPosicoesJanelas` já corrigido, janela de 171 px, focando cada
áudio por vez:

| Navegador | Área da conversa | Balão recebido | Ícone | Janela de foco | Ícones cobertos |
|---|---|---|---|---|---|
| 1200 px | x = 544, 656 px | x = 606 | x = 550 a 576 | x = 606 a 926 | nenhum, nos quatro focos |
| 760 px | x = 406, 354 px | x = 468 (passa da borda direita da área) | x = 412 a 438 | x = 432 a 752 | 6 px da borda direita de dois ícones, em cada foco |

- O ícone fica na borda esquerda da área (esquerda + 6) também nos recebidos, abaixo do balão.
- A janela do modo abaixo começa na borda do balão, 62 px depois da borda da área, e só é empurrada para a
  esquerda quando a área tem menos de 62 + 320 + 8 = 390 px; a 354 px ela começa em esquerda + 26 e cobre
  os 6 px finais do ícone (20 de 26 px seguem livres e clicáveis).
- Consequência para o adendo `bug-BUG-20261004-TTLJ-v001`: o "nunca cobre o ícone" do Delta 3 só vale
  com a área de uns 390 px ou mais.
