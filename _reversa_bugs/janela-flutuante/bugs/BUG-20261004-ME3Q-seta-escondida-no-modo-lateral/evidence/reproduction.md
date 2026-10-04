# Reprodução do BUG-20261004-ME3Q

## Cápsula

| Campo | Valor |
|---|---|
| Data | 2026-10-04 17:33–17:37 -03 |
| Commit base | `b0c3408` (main), árvore sem alterações em `extension/` nem `auxiliar/` |
| Ambiente | macOS 27.0.1, Node v26.10.0 (tipos removidos nativamente), Chrome for Testing do cache do Playwright (`chromium-1243`) |
| Tipo | isolada, sem WhatsApp, sem rede e sem conta: o posicionador puro e o gerenciador no navegador com o CSS real, nas entradas medidas na rodada 3 da aceitação do TTLJ (`aceitacao-ttlj-whatsapp-real.md`) |
| Taxa | 3/3 (posicionador puro, navegador, caso alternado); determinística, porque o posicionador é função pura das entradas |
| Classificação | `deterministic` |

Entradas (px CSS, rodada 3): área da conversa de x = 496 a 1440 (944 px), área das mensagens de y = 64 a 768;
balão enviado 5 em x = 1047, y = 56 a 145; balões recebidos em x = 558 a 894: 6 (227 a 316), 7 (344 a 461),
8 (489 a 605) e 9 (633 a 722); janelas de 232, 242, 232, 232 e 171 px de altura. O x do balão enviado vem da
janela medida (719 + 320 + 8) e da margem direita de 57 px da rodada 1.

## 1. Posicionador puro

Comando: `node scratchpad/me3q/repro-puro.ts` (chama `calcularPosicoesJanelas` com as entradas acima). Exit 0.

```
5 janela 719/64 seta {"direcao":"direita","pontaX":1047,"pontaY":104.5,"caudaX":1039,"caudaY":104.5,"trilho":1041.25}
6 janela 902/304 seta {"direcao":"esquerda","pontaX":894,"pontaY":271.5,"caudaX":902,"caudaY":314,"trilho":898.5}
7 janela 902/554 seta {"direcao":"esquerda","pontaX":894,"pontaY":402.5,"caudaX":902,"caudaY":564,"trilho":901}
8 janela 902/794 seta {"direcao":"esquerda","pontaX":894,"pontaY":547,"caudaX":902,"caudaY":804,"trilho":899.75}
9 janela 902/1034 seta {"direcao":"esquerda","pontaX":894,"pontaY":677.5,"caudaX":902,"caudaY":1044,"trilho":898.5}
janela 5: {"x":719,"y":64,"fimX":1039,"fimY":296}
ponta da seta 6 sob a janela 5: true
pontos do trecho vertical da seta 6 visíveis: 4 de 9
balão 6 coberto pela janela 5: 175 × 69 px (x 719 a 894, y 227 a 296)
```

As posições são as lidas na tela do WhatsApp real (719/64, 902/304, 902/554, 902/794, 902/1034), e a contagem
de pontos visíveis é a medida lá (4 de 9). A ponta, que a rodada 3 não mediu, cai sob a janela 5.

## 2. Gerenciador no navegador, com o CSS real

Comando: `node scratchpad/me3q/repro-navegador.ts` (o mesmo arranjo de `janelas-no-navegador.test.ts`: o
gerenciador montado do código-fonte e `janela-flutuante.css`, numa página neutra de 1440 × 832, cinco
janelas concluídas com o mesmo texto). Exit 0. Medido depois de as transições pararem, com
`elementFromPoint` 2 px dentro do triângulo da ponta e em nove pontos do trecho vertical:

| Janela | Retângulo desenhado (x, y, fim x, fim y) | Seta (cauda → ponta) | Ponta sob | Pontos visíveis |
|---|---|---|---|---|
| 5 | 719, 64, 1041, 295 | 1039; 104,5 → 1047; 104,5 | nada | 9/9 |
| 6 | 902, 303, 1224, 534 | 902; 313 → 894; 271,5 | **janela 5** | **4/9** |
| 7 | 902, 542, 1224, 773 | 902; 552 → 894; 402,5 | nada | 9/9 |
| 8 | 902, 781, 1224, 1012 | 902; 791 → 894; 547 | nada | 9/9 |
| 9 | 902, 1020, 1224, 1251 | 902; 1030 → 894; 677,5 | nada | 9/9 |

(As alturas desenhadas diferem das da rodada 3 porque o texto é outro; a geometria do defeito é a mesma.)

## 3. Conversa alternada sem folga

Comando: `node scratchpad/me3q/repro-alternado.ts`. Enviado, recebido e enviado, balões de 89 px a 28 px um
do outro (o vão dos recebidos consecutivos da rodada 3), janelas de 232 px, mesma área. Exit 0.

```
E1 719/64 {"direcao":"direita","pontaX":1047,"pontaY":164.5,"caudaX":1039,"caudaY":164.5,"trilho":1041.25}
R2 902/304 {"direcao":"esquerda","pontaX":894,"pontaY":281.5,"caudaX":902,"caudaY":314,"trilho":899.75}
E3 719/544 {"direcao":"direita","pontaX":1047,"pontaY":398.5,"caudaX":1039,"caudaY":554,"trilho":1041.25}
```

As três janelas se cruzam na horizontal (enviados de 719 a 1039, recebidos de 902 a 1222) e formam uma pilha
só. A ponta de R2 (894; 281,5) fica sob E1 (64 a 296), e a de E3 (1047; 398,5), sob R2 (304 a 536, de x =
902 a 1222). Cada janela cobre a borda inteira do balão seguinte, do outro lado: não há parte descoberta da
borda para onde a seta possa apontar.

## 4. Faixa de largura afetada

A janela de um recebido termina em esquerda + 726 (62 de margem, 336 do balão, 8 de vão, 320 da janela); o
balão de um enviado começa em direita − 393 (57 de margem e 336 do balão). As duas faixas se cruzam enquanto
a área da conversa tiver menos de 1119 px, e o caso do enviado é simétrico. O modo lateral começa em 726 px:
de 726 a 1118 px, numa conversa com os dois lados, a janela de um lado desce sobre a coluna dos balões do
outro. No navegador de 1440 px com a lista de conversas, a área tem 944 px.

## Fora desta reprodução

- WhatsApp real: não refeita. A rodada 3 já mediu posições, a cobertura e os 4 de 9 pontos às 17:04; a ponta,
  que faltava, foi medida aqui com o CSS real. A conferência no WhatsApp real fica para a aceitação do fix,
  pela `/aceitacao-real`, que só o usuário invoca.
- Os scripts ficaram no scratchpad da sessão; os testes de reprodução do Gate 1 os substituem como prova
  permanente.
