# Investigação Técnica: Janela Flutuante

> Feature: `003-janela-flutuante`
> Data: 2026-10-01

## 1. Algoritmo de Resolução de Colisão Vertical

Quando múltiplas janelas estão abertas para mensagens consecutivas (ex: 3 a 5 áudios enviados em sequência), o topo ideal de cada janela coincide com o topo do balão de áudio. Como cada balão tem tipicamente ~60 px de altura e a janela tem entre 100 e 240 px, haveria sobreposição inevitável se nada fosse feito.

### Abordagem adotada:
1. As janelas abertas são ordenadas por posição vertical de seus balões no documento.
2. Cada janela recebe sua posição ideal: `topoDesejado = ancora.y`.
3. Percorre-se a lista: se `topoDesejado < topoAnterior + alturaAnterior + gap (8px)`, então `topoFinal = topoAnterior + alturaAnterior + gap`.
4. Um conector visual SVG discreto desenha uma linha curva partindo da âncora até a borda lateral da janela deslocada.

## 2. Isolamento de CSS e Renderização sem Layout Thrashing

- Todas as janelas são gerenciadas por um container absoluto único `#whispper-janelas-container` anexado ao `document.body` com `pointer-events: none`, contendo filhos com `pointer-events: auto`.
- As posições utilizam `transform: translate3d(x, y, 0)` em vez de `top`/`left` para aceleração por GPU (camada de composição), garantindo sincronia perfeita de 60 fps durante o scroll.
