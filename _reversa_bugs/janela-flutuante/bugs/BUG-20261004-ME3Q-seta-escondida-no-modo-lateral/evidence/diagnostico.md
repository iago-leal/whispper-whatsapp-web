# Diagnóstico do BUG-20261004-ME3Q

- Data: 2026-10-04, cerca de 17:40 -03, pelo `/reversa-debugger-fix`.
- Commit base: `b0c3408` (main). O posicionador não mudou desde a rodada 3 da aceitação do TTLJ (build de
  17:01:08 sobre `a7b6bdd` com as alterações que viraram `39f836b`).
- Fonte: `evidence/reproduction.md` (posicionador puro, gerenciador no navegador e caso alternado).

## 1. Onde aparece e onde nasce

O defeito aparece na camada das setas (`gerenciador-janelas.ts`, `garantirCamadaSetas`): a seta do áudio 6
corre atrás da janela 5. Mas a camada atrás das janelas é o critério 3 do OW7G, e ela só esconde a seta
porque o cálculo pôs uma janela sobre o balão e o corredor de outra. A causa nasce em
`posicionador-colisoes.ts`, em três decisões que se somam:

1. `xAoLado` mede o "espaço livre" do RF-01 só na horizontal, entre o balão e a borda da área. À esquerda de
   um enviado, esse espaço inclui a coluna dos balões recebidos (x = 558 a 894), que só está livre nas
   linhas do próprio balão.
2. A janela é mais alta que o balão (de 171 a 242 px contra 89 a 117) e desce para as linhas das mensagens
   seguintes. A colisão de `calcularPosicoesJanelas` só conhece janelas que se cruzam na horizontal
   (decisão do K3DY): balões e corredores de seta de outros áudios não são obstáculo.
3. `calcularSeta` mira o centro da parte visível do balão contra a faixa vertical da área, sem saber se outra
   janela cobre essa borda.

## 2. Faixa e alcance

- De 726 a 1118 px de área da conversa (`reproduction.md`, §4), numa conversa com os dois lados, a janela de
  um lado cobre a coluna dos balões do outro. Abaixo de 726 vale o modo abaixo (adendo do TTLJ); de 1119 em
  diante, as colunas não se cruzam. O navegador de 1440 px com a lista de conversas dá 944 px.
- O caso da rodada 3 tem folga de 82 px entre o balão 5 e o 6. Numa conversa alternada sem folga (28 px), as
  janelas dos dois lados formam uma pilha só, e cada uma cobre a **borda inteira** do balão seguinte: a
  seta de toda janela, exceto a primeira, fica sem ponta visível (`reproduction.md`, §3).
- O defeito é simétrico: a janela de um recebido (x = 902 a 1222) cobre a coluna dos enviados (a partir de
  1047) e o corredor das setas deles (1039 a 1047).

## 3. Medidas da janela que limitam as saídas

No navegador, com o CSS real: cabeçalho de 39 px, rodapé de 48, 20 de respiro no corpo e 2 de borda. A
janela sem nenhuma linha de texto já tem 109 px, e cada linha soma 20,3. Na conversa alternada sem folga, o
espaço entre o topo de um balão e o balão seguinte, menos o vão de 8 px, é de 109 px: encolher a janela até
ali não deixa linha de texto.

## 4. Estratégias consideradas

| # | Estratégia | Critério 1 (ponta) | Critério 2 (balão) | Custo e risco |
|---|---|---|---|---|
| A | **Uma por vez no conflito lateral.** A janela à vista que cobriria o balão ou a seta de outra janela à vista cede: fica a de foco mais recente (último abrir ou destacar), e a outra se oculta até o próximo destaque, como no modo abaixo do TTLJ. Sem conflito, nada muda. | passa em toda geometria | passa para áudios com janela à vista; o balão de áudio sem janela pode seguir coberto | médio: só o posicionador; muda o RF-05 lateral nos conflitos (adendo) |
| B | **Encolher a janela de cima** até 8 px antes do balão do outro lado, com rolagem interna, e A quando sobrar pouco. | passa | passa | alto: altura natural medida à parte, `max-height` por janela, medida a cada rolagem (RNF-02); só ajuda com folga, porque sem folga sobram 109 px, zero linhas (§3) |
| C | **Mínima: ponta na parte descoberta da borda do balão**, aceitando a cobertura num adendo, como o Delta 3. | falha sem folga: a borda inteira fica coberta (§2) | não (cobertura admitida) | baixo, mas não resolve o caso comum |
| D | Camada das setas à frente das janelas. | falha: a ponta fica sobre a janela 5, apontando para dentro dela, e `elementFromPoint` segue caindo na janela | não | baixo, mas reverte o critério 3 do OW7G sem resolver |

Recomendação: A. É a única que satisfaz os dois critérios em toda a faixa, estende a regra que o usuário já
decidiu no TTLJ ("uma por vez") só aos pares em conflito e deixa intactos o modo lateral de um lado só, as
áreas de 1119 px ou mais e o modo abaixo.

## 5. Pontos de decisão da estratégia A

- **Conflito**: duas janelas laterais à vista, em que uma cobre o balão da outra (a parte dele na área das
  mensagens) ou o traçado da seta dela (trecho no corredor e triângulo da ponta).
- **Quem cede**: a de foco menor. Empate (as duas sem foco, depois de fechar a de foco, regra do TTLJ):
  fica a de cima na conversa, a primeira na ordem de leitura.
- **Cálculo**: dispõe as janelas com o algoritmo de hoje, procura conflitos nas posições finais, oculta a
  janela de menor foco entre as envolvidas e refaz, até não haver conflito. No pior caso, 20 rodadas sobre
  20 janelas, sem tocar a página.
- **Fora**: o balão de um áudio sem janela à vista, e de mensagens de texto, pode seguir coberto pela janela
  lateral do outro lado (o posicionador não conhece esses balões; conhecê-los exigiria mudar o adaptador).
  Fica para o veredito de spec.
