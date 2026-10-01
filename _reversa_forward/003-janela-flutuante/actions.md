# Actions: Janela Flutuante de Transcrição

> Identificador: `003-janela-flutuante`
> Data: 2026-10-01
> Roadmap: `_reversa_forward/003-janela-flutuante/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 11 |
| Paralelizáveis (`[//]`) | 5 |
| Maior cadeia de dependência | 5 (T001 → T003 → T005 → T007 → T008 → T010) |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar a porta `ExibicaoDeTranscricao` em `extension/src/dominio/exibicao-de-transcricao.ts` definindo os tipos de estado e métodos de controle. | - | `[//]` | `extension/src/dominio/exibicao-de-transcricao.ts` | 🟢 | `[X]` |
| T002 | Criar a folha de estilos `extension/src/content/janela-flutuante.css` para o container absoluto, janelas flutuantes e suporte a tema escuro. | - | `[//]` | `extension/src/content/janela-flutuante.css` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Escrever testes de unidade para o algoritmo de posicionamento e colisão em `extension/test/posicionador-colisoes.test.ts`. | T001 | `[//]` | `extension/test/posicionador-colisoes.test.ts` | 🟢 | `[X]` |
| T004 | Escrever testes de unidade para o ciclo de vida e atualização de estados da janela em `extension/test/gerenciador-janelas.test.ts`. | T001 | `[//]` | `extension/test/gerenciador-janelas.test.ts` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Implementar o algoritmo de cálculo de posição lateral, fallback inferior e resolução de colisões em `extension/src/content/posicionador-colisoes.ts`. | T003 | - | `extension/src/content/posicionador-colisoes.ts` | 🟢 | `[X]` |
| T006 | Implementar o componente DOM da janela flutuante em `extension/src/content/janela-elemento.ts` com botões, estados e acessibilidade. | T001 | `[//]` | `extension/src/content/janela-elemento.ts` | 🟢 | `[X]` |
| T007 | Implementar a classe `GerenciadorDeJanelas` em `extension/src/content/gerenciador-janelas.ts` que implementa a porta `ExibicaoDeTranscricao`. | T004, T005, T006 | - | `extension/src/content/gerenciador-janelas.ts` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Conectar o `GerenciadorDeJanelas` ao content script em `extension/src/content/index.ts` e registrar ouvintes para mensagens de transcrição. | T007 | - | `extension/src/content/index.ts` | 🟢 | `[X]` |
| T009 | Atualizar `extension/package.json` e `extension/manifest.json` incluindo `janela-flutuante.css` no build e nos content_scripts. | T002 | - | `extension/package.json` | 🟢 | `[X]` |
| T010 | Executar a compilação completa (`npm run build`) e a suíte de testes (`npm test`) validando 100% de sucesso. | T008, T009 | - | `extension/package.json` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T011 | Escrever a documentação da janela flutuante em `extension/src/content/JANELAS.md`. | T010 | `[//]` | `extension/src/content/JANELAS.md` | 🟢 | `[X]` |

## Notas de execução

## Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-10-01 | Decomposição inicial gerada por `reversa-forward-autonomous` | reversa-to-do |
