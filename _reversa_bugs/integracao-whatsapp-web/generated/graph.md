<!-- GENERATED, DO NOT EDIT: regenerado por /reversa-debugger-graph em 2026-10-02T15:36Z a partir de 4 bugs -->

# Grafo · integracao-whatsapp-web

```mermaid
graph LR
  BUG_20261001_GAOZ["#4 BUG-20261001-GAOZ"]
  BUG_20261001_2MOY["#5 BUG-20261001-2MOY"]
  BUG_20261002_XDL5["#9 BUG-20261002-XDL5"]
  BUG_20261002_YUB4["#10 BUG-20261002-YUB4"]
  BUG_20261001_2MOY -->|blocked-by| BUG_20261001_GAOZ
  BUG_20261002_XDL5 -.-|related-to| BUG_20261001_2MOY
  BUG_20261002_YUB4 -.-|related-to| BUG_20261002_XDL5
```

Arestas tracejadas são relações `proposed` (hipótese); as `rejected` ficam só na matriz, como histórico.

## Impact score (heurística de triagem, não substitui priority/severity)

Só arestas `supported`/`confirmed` contam; relações `proposed` ficam fora.

| bug | impact score |
|---|---|
| BUG-20261002-XDL5 | 0 |
| BUG-20261002-YUB4 | 0 |

## Clusters

- 2 bugs abertos (BUG-20261002-XDL5, BUG-20261002-YUB4) convergem em `ponte-audio.ts`: indício de causa comum. Corrija BUG-20261002-XDL5 primeiro (P1, high).
