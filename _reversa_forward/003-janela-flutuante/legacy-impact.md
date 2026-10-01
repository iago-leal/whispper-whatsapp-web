# Impacto no legado: Janela Flutuante de Transcrição

> Identificador: `003-janela-flutuante`
> Data: 2026-10-01
> Feature greenfield, sem legado pré-existente. Âncora: prd.md + specs SDD.
> Política de edição no momento da execução: `.reversa/reversa-config.json` com `allowLegacyEdits: true` e `allowedPaths` vazio, isto é, liberação irrestrita do projeto. Nenhum arquivo foi apagado.

## 1. Arquivos afetados

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|---|---|---|---|---|
| `extension/src/dominio/exibicao-de-transcricao.ts` | Porta ExibicaoDeTranscricao | componente-novo | HIGH | Contrato formal para comando das janelas flutuantes. |
| `extension/src/content/posicionador-colisoes.ts` | Janela Flutuante | componente-novo | HIGH | Algoritmo de posicionamento geométrico e prevenção de colisão vertical. |
| `extension/src/content/janela-elemento.ts` | Janela Flutuante | componente-novo | MEDIUM | Renderização do DOM da janela, cabeçalho, corpo e botão de cópia. |
| `extension/src/content/gerenciador-janelas.ts` | Janela Flutuante | componente-novo | HIGH | Orquestrador da pilha de até 20 janelas, âncoras e ciclo de vida. |
| `extension/src/content/janela-flutuante.css` | Content Script | componente-novo | LOW | Folha de estilos isolada para janelas flutuantes e tema escuro. |
| `extension/src/content/index.ts` | Content Script | componente-alterado | MEDIUM | Conexão do GerenciadorDeJanelas aos fluxos de transcrição e âncoras. |
| `extension/manifest.json` | Extensão MV3 | componente-alterado | LOW | Inclusão de janela-flutuante.css nos content_scripts. |
| `extension/package.json` | Infraestrutura de Build | componente-alterado | LOW | Cópia do CSS de janelas no script build. |
| `extension/test/posicionador-colisoes.test.ts`, `gerenciador-janelas.test.ts` | Testes | componente-novo | LOW | Testes unitários do posicionador e do gerenciador de janelas. |

## 2. Diff conceitual por componente

**Porta ExibicaoDeTranscricao:** Formaliza a capacidade de abrir, definir estados, destacar e fechar interfaces visuais de transcrição.

**Gerenciador e Posicionador de Janelas:** Adiciona suporte a múltiplas janelas (até 20) simultâneas no WhatsApp Web com prevenção de colisão vertical, scroll suave acelerado por GPU (`translate3d`), feedback de cópia e atalho `Esc` para fechamento.

## 3. Preservadas

Feature greenfield, sem regras de legado pré-existente para preservar.

## 4. Modificadas

Feature greenfield, sem regras de legado pré-existente modificadas.
