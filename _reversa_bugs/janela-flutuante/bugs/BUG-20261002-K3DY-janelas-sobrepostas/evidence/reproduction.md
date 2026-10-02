# Cápsula de reprodução: BUG-20261002-K3DY

| Campo | Valor |
|---|---|
| Commit base | `75e027c` (branch `main`), árvore de `extension/` sem alterações |
| Ambiente | macOS 27.0.1 (Darwin 27.0.0, arm64); Node v26.10.0; Chrome for Testing do cache do Playwright (`chromium-1243`) |
| Página | página neutra (`https://exemplo.test/`, servida pelo protocolo DevTools) com `janela-flutuante.css` e o `GerenciadorDeJanelas` montado do código-fonte; tela de 1316 × 806 e área da conversa de x = 488 a 1316, como no print do A4MZ |
| Âncoras | balões de voz recebidos de 336 × 62 px em x = 550, a 70 px um do outro (y = 66, 136, 206, ...) |
| Data | 2026-10-02 |

## Comando

```bash
cd extension
node ../_reversa_bugs/janela-flutuante/bugs/BUG-20261002-K3DY-janelas-sobrepostas/evidence/reproduzir-k3dy.ts
```

- Exit code: 0 (o script mede; não faz asserção)
- Taxa: 4/4 execuções com saídas idênticas; saída integral em `reproduzir-k3dy.saida.txt`
- Determinismo: **determinístico**

O script mede o retângulo-alvo de cada janela: a posição do `translate3d` aplicado e o tamanho
desenhado (`offsetWidth` × `offsetHeight`). A transição de 120 ms do `transform` só anima o caminho
até esse alvo, então a medida não depende do instante da leitura.

## Resultado

### Cenário 1: cinco áudios concluídos com textos de tamanhos diferentes (critério 1, RF-05)

| Janela | Texto | Altura desenhada | y aplicado | Fim (y + altura) | Próxima começa em | Sobreposição |
|---|---|---|---|---|---|---|
| A1 | médio | 190 | 66 | 256 | 234 | **22 px** com A2 |
| A2 | curto | 129 | 234 | 363 | 402 | não |
| A3 | longo, no limite | 242 | 402 | 644 | 570 | **74 px** com A4 |
| A4 | médio | 190 | 570 | 760 | 738 | **22 px** com A5 |
| A5 | curto | 129 | 738 | 867 | — | — |

Todas as janelas descem exatamente 168 px (160 + 8) em relação à anterior, qualquer que seja a altura
desenhada. A sobreposição de cada par é `altura − 160`: 190 − 168 = 22 e 242 − 168 = 74. A janela
curta, de 129 px, deixa 39 px de vão sobrando.

### Cenário 2: a janela de cima cresce ao concluir (critério 2)

| Momento | B1 (y, altura) | B2 (y, altura) | Sobreposição |
|---|---|---|---|
| Ambas em espera | 66, 94 | 234, 94 | não (vão de 74 px) |
| Depois de B1 concluir com texto longo | 66, 242 | 234, 94 | **74 px** |

O `definirEstado` recalcula as posições, mas com os mesmos 160 px; a B2 não se move.

### Cenário 3: enviado e recebido, de lados opostos (nota do A4MZ)

A janela do enviado (x 591 a 913) e a do recebido (x 894 a 1216) se cruzam em 19 px na horizontal
nesta tela, e em 22 px na vertical. A colisão é real aqui. A régua de 160 px é a mesma.

## Conferência no WhatsApp Web real

A aceitação do A4MZ (`../BUG-20261002-A4MZ-janela-longe-do-balao/evidence/aceitacao-whatsapp-real.md`,
achado 2) mediu o mesmo defeito na conta do usuário: a janela do enviado (y 565 a 756, 191 px) e a do
recebido (y 739 a 981) se cruzam em 17 px, porque 565 + 160 + 8 = 733 < 739 e o posicionador não
deslocou a segunda. A altura de 191 px no WhatsApp real coincide com os 190 px medidos aqui para o
texto médio.

## Observações para a correção

- A altura desenhada inclui a borda de 1 px de cada lado: 242 px no limite do RF-07 (240 + 2), como os
  322 px de largura já anotados no A4MZ.
- Ler o tamanho da janela depois de ela entrar na página e antes de receber a posição força o estilo
  sem `transform`, e a transição a faria deslizar do canto da tela (lição da revisão 1 do A4MZ).
