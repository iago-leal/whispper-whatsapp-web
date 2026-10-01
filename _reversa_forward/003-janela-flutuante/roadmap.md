# Roadmap: Janela Flutuante de Transcrição

> Identificador: `003-janela-flutuante`
> Data: 2026-10-01
> Requirements: `_reversa_forward/003-janela-flutuante/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A janela flutuante é implementada em TypeScript no content script como um subsistema modular composto por: (1) `porta-exibicao-de-transcricao.ts` formalizando a interface no domínio; (2) `gerenciador-janelas.ts` coordenando o ciclo de vida e pilha de até 20 janelas; (3) `posicionador-colisoes.ts` calculando âncoras e resolvendo sobreposições verticais com transições suaves via aceleração por hardware (`translate3d`); e (4) `janela-elemento.ts` gerando a árvore DOM acessível, cabeçalho com fechar, corpo com estados e rodapé com botão copiar e indicador de idioma.

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|---|---|---|
| I. Longevidade e SRP | Cada classe tem responsabilidade única (renderização, cálculo de colisão, gerenciamento de coleção). | respeita |
| II. Performance e Estabilidade | 0 tarefas longas (> 50 ms) no scroll através de posições computadas em microtasks e renderizadas com CSS Transforms. | respeita |
| III. Acessibilidade | WCAG 2.1 AA em tema claro e escuro, fechamento com tecla Esc e foco gerenciável por teclado. | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|---|---|---|---|---|
| D-01 | Container único `#whispper-janelas-container` no `body` com coordenadas absolutas de viewport. | Evita que propriedades `overflow: hidden` dos containers do WhatsApp cortem a janela flutuante. | Inserir a janela como nó filho direto de cada balão de mensagem. | 🟢 |
| D-02 | Resolução de colisão vertical cascateada com gap mínimo de 8 px e conector visual. | Permite leitura linear e desimpedida de vários áudios picados consecutivos. | Sobrepor janelas como cartas de baralho ou permitir apenas uma janela aberta por vez. | 🟡 |
| D-03 | Aceleração por GPU com `transform: translate3d(...)` para posicionamento em tempo real de rolagem. | Elimina reflow/layout thrashing durante a rolagem do WhatsApp Web. | Uso de `top` e `left` diretos via CSS. | 🟢 |

## 4. Premissas

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|---|---|---|
| Largura de 320 px e altura máxima de 240 px cabem confortavelmente na área de chat em resoluções desktop padrão (≥ 1024 px). | `requirements.md#RF-07` | Em telas muito estreitas, o posicionamento abaixo do balão (fallback) é acionado. |

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|---|---|---|---|
| Porta ExibicaoDeTranscricao | `_reversa_sdd/sdd/nucleo-transcricao.md` | contrato-novo | Formaliza a interface em `extension/src/dominio/exibicao-de-transcricao.ts`. |
| Gerenciador de Janelas | `_reversa_sdd/sdd/janela-flutuante.md` | componente-novo | Módulo de renderização, colisão e controle de janelas flutuantes. |

## 6. Delta no modelo de dados

Detalhe em `_reversa_forward/003-janela-flutuante/data-delta.md`. Entidades puramente voláteis em memória da aba (`EstadoJanela`, `JanelaAtiva`).

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|---|---|---|
| `ExibicaoDeTranscricao` | Interface TypeScript | `_reversa_forward/003-janela-flutuante/interfaces/porta-exibicao-de-transcricao.md` |

## 8. Plano de migração

Não se aplica.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Rolagem pesada com muitas janelas abertas | médio | baixo | Descarte de rendering quando fora da tela e uso exclusivo de CSS Transforms. |
| Incompatibilidade com temas do WhatsApp | baixo | baixo | Leitura de variáveis CSS nativas (`--conversation-panel-background`, etc.) ou classes `dark`. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Testes unitários de colisão e ciclo de vida passando no `npm test`
- [ ] `legacy-impact.md` e `regression-watch.md` gerados
- [ ] Adendo gerado em `_reversa_sdd/addenda/003-janela-flutuante.md` via `/reversa-sync`
