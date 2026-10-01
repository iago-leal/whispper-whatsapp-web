# Problema: Estratégia de correção
- Modo: repair
- Bug: BUG-20261001-MAC1
- Causa raiz confirmada: O arquivo .pkg não é gerado em nenhum lugar do repositório. O botão na tela aponta para um mock, causando falha no download e no instalador (erro -1).
- Rubrica do Juiz:
  1. Menor risco de mudança.
  2. Alinhamento com a spec (instalação sem root, sem terminal).
  3. Viabilidade imediata de implementação.
