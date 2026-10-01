# Impacto no Legado — Núcleo de Transcrição

**Feature ID:** `004`
**Componente:** `nucleo-transcricao`
**Data:** 2026-10-01

---

## 1. Arquivos Criados
- `extension/src/dominio/armazenamento-navegador.ts` (porta hexagonal de persistência de contadores)
- `extension/src/dominio/contadores.ts` (gerenciador de contadores de métricas de adoção e qualidade)
- `extension/src/dominio/cache-sessao.ts` (cache em memória da aba para reexibição em ≤ 200 ms)
- `extension/src/dominio/fila-transcricao.ts` (fila FIFO estrita com timeouts e cancelamentos)
- `extension/src/dominio/nucleo.ts` (orquestrador hexagonal de domínio puro)
- `extension/src/adaptadores/armazenamento-chrome.ts` (adaptadores para chrome.storage e memória)
- `extension/src/adaptadores/motor-cliente-content.ts` (adaptador do motor para content script via mensagens)
- `extension/src/popup/popup.ts`, `extension/popup/index.html`, `extension/popup/popup.css` (painel/popup da extensão)
- `extension/test/nucleo-transcricao.test.ts` (suíte de testes unitários com portas simuladas)

## 2. Arquivos Modificados
- `extension/manifest.json`: inclusão da permissão `"storage"` e do popup de ação `"action": { "default_popup": "popup/index.html" }`.
- `extension/package.json`: inclusão do build e cópia dos arquivos do popup.
- `extension/src/background.ts`: suporte a mensagens `verificar_motor`.
- `extension/src/content/index.ts`: refatoração para inicializar e orquestrar todas as operações através de `NucleoDeTranscricao`.

## 3. Avaliação de Risco e Quebra
- Zero impacto regressivo em adaptadores existentes.
- A arquitetura preserva estritamente o princípio de portas e adaptadores (Hexagonal): nenhuma dependência de DOM ou Chrome vazou para `extension/src/dominio/`.
