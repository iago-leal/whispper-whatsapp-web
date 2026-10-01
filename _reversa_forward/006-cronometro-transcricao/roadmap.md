# Roadmap: Indicador de espera com cronômetro na transcrição

> Identificador: `006-cronometro-transcricao`
> Data: `2026-10-01`
> Requirements: `_reversa_forward/006-cronometro-transcricao/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O núcleo passa a carimbar três instantes em cada pedido (clique, saída da fila, fim), lidos de um relógio monotônico injetável, e os envia uma vez por transição: à janela, pela porta `ExibicaoDeTranscricao`, e ao ícone, por uma operação nova da porta `FonteDeAudio`. Quem faz o tempo andar é a camada de exibição: um único cronômetro compartilhado no script de conteúdo recalcula, a cada meio segundo, o texto dos contadores registrados (ícone e janela) a partir do instante de início, sem notificar o núcleo e sem recriar a janela. Na conclusão, o núcleo deriva os tempos do pedido, guarda-os no cache da sessão para a reabertura e soma, no armazenamento, a espera sem fila e a duração do áudio, de onde o painel calcula a espera média por minuto. O ícone usa a animação de pulsar que já existe em `estilos.css`, e as funções de cálculo e formatação ficam num módulo puro do domínio, testável sem DOM.

## 2. Princípios aplicados

Não há `.reversa/principles.md` neste projeto. Ficam registradas as convenções das specs que a feature precisa respeitar:

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Portas sem tipo de navegador (`extension/src/dominio/armazenamento-navegador.ts`, cabeçalho) | Os campos novos da porta de armazenamento são números; o relógio é injetado como função, sem `chrome.*` no domínio | respeita |
| Seletores só no módulo de configuração (`_reversa_sdd/sdd/integracao-whatsapp-web.md`, RF-13) | O contador é criado dentro do próprio botão da extensão; nenhum seletor novo da página | respeita |
| Uma notificação por transição (`_reversa_sdd/sdd/nucleo-transcricao.md`, RF-03) | O cronômetro anda na exibição; o núcleo não emite por segundo | respeita |
| Nada de conteúdo persistido (`_reversa_sdd/sdd/janela-flutuante.md`, seção 12) | Persistem só dois totais em milissegundos; tempos por pedido ficam na memória da aba | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | O núcleo envia o instante de início da espera (`inicioEsperaEm`) nos estados "fila" e "transcrevendo"; a exibição calcula o tempo decorrido | Mantém 1 notificação por transição (RN-03, RF-03 do núcleo) e corrige o "0 s" parado | Núcleo emitir a cada segundo; manter `segundosDecorridos` fixo | 🟢 |
| D-02 | Relógio monotônico injetável `agora: () => number`, padrão `performance.now()`, compartilhado por fila, núcleo e exibição, que vivem no mesmo script de conteúdo | Não sofre ajuste do relógio do sistema e segue avançando com a aba oculta (RN-02); injetável para teste | `Date.now()`; somar tiques de temporizador | 🟢 |
| D-03 | Um único `CronometroDeEspera` no script de conteúdo: tique a cada 500 ms, atualiza só o `textContent` de nós registrados quando o texto muda, descarta nós desconectados, para quando não há nós e dá um tique imediato ao voltar a aba (`visibilitychange`) | Um temporizador para 20 janelas e N ícones (RNF de desempenho); erro ≤ 1 s mesmo com o navegador espaçando temporizadores | Um temporizador por janela ou ícone; `requestAnimationFrame`, que pausa em segundo plano | 🟢 |
| D-04 | Operação nova `refletirEstadoPedido(idAudio, estado)` na porta `FonteDeAudio`, implementada pelo `AdaptadorWhatsAppWeb`, que guarda o último estado por áudio e o reaplica ao botão reinserido | O RF-16 da integração fala em estado "informado pelo núcleo"; o ícone precisa funcionar com a janela fechada (RF-12) e após o redesenho do balão (RF-08) | Decorar `ExibicaoDeTranscricao` (perde o estado quando a janela fecha); observar o DOM da janela | 🟢 |
| D-05 | Indicador de espera: classe `whispper-animando` já existente; contador num `<span class="whispper-contador" aria-hidden="true">` dentro do botão, posicionado de forma absoluta para não deslocar o balão; `prefers-reduced-motion: reduce` desliga a animação | Resposta 4c do esclarecimento; RNF de isolamento e de redução de movimento | Relógio com ponteiro; círculo giratório; contador fora do botão | 🟢 |
| D-06 | Na janela, o corpo só é recriado na transição de estado; durante a espera, o cronômetro troca apenas o texto do contador (`role="timer"`). Uma região `aria-live="polite"` oculta por janela recebe 2 anúncios: início e conclusão ou erro | Preserva foco e seleção (RNF de desempenho); limita anúncios (RNF de acessibilidade) | Rerenderizar a janela a cada tique; contador dentro da região viva | 🟢 |
| D-07 | `ItemFila` ganha `inicioEsperaEm`, `inicioTranscricaoEm` e `fimEm`; o núcleo deriva `TemposDoPedido` (`esperaTotalMs`, `esperaFilaMs`, `duracaoAudioSeg`) | Base de RF-05, RF-06, RF-07 e do acumulado (RN-07) | Medir na exibição (não sabe quando o pedido saiu da fila) | 🟢 |
| D-08 | Duração do áudio: a do motor (`duracaoAudioSeg`, medida na decodificação); se ausente ou ≤ 0, a da `FonteDeAudio`; sem nenhuma, o resumo omite "· áudio de" e o pedido não entra no acumulado | Evita divisão por zero e média falsa | Usar sempre a duração da página | 🟡 |
| D-09 | `CacheSessao` guarda `TemposDoPedido`; a reabertura envia o estado concluído com esses tempos e o ícone em concluído | RN-04 e RF-09 | Recalcular na reabertura | 🟢 |
| D-10 | `ContadoresPersistidos` ganha `esperaAcumuladaMs` e `audioAcumuladoMs`, inteiros; registro antigo sem os campos é lido como 0. `MetricasContadores` ganha `esperaMediaSegPorMinuto`, nulo sem áudio acumulado | RN-06, RN-08, RF-14; inteiros evitam acúmulo de erro de ponto flutuante | Média móvel; guardar lista de pedidos (violaria RN-06) | 🟢 |
| D-11 | `GerenciadorContadores` relê o armazenamento antes de cada incremento (ler, modificar, gravar) | O popup zera o armazenamento enquanto o script de conteúdo guarda cópia antiga em memória e a regravaria, desfazendo o zeramento (RF-15). O defeito já afeta os 3 contadores atuais | Ouvir mudanças do armazenamento (acoplaria a porta ao Chrome) | 🟡 |
| D-12 | Novo clique num pedido em andamento cuja janela foi fechada reabre a janela no estado atual, com o mesmo cronômetro, e volta a marcá-la como aberta | Hoje o núcleo "destaca" uma janela inexistente e o clique não mostra nada (complementa RF-10 e RF-12) | Manter o clique sem efeito até a conclusão | 🟡 |
| D-13 | O núcleo guarda a direção de cada pedido e a repassa a `fila.repetir`, que hoje fixa "recebido" | RN-07 exclui áudios próprios do acumulado também na nova tentativa | Ignorar a direção no "Tentar de novo" | 🟢 |
| D-14 | Funções puras em `extension/src/dominio/tempo-de-espera.ts`: formatação dos tempos (pt-BR, vírgula decimal), resumo final, comparação com ouvir e espera média | Uma fonte para ícone, janela e painel; teste unitário sem DOM | Formatar em cada componente | 🟢 |
| D-15 | Fechar a janela de um pedido na fila, que o remove (RF-10 do núcleo), devolve o ícone ao estado ocioso | Sem isso, o ícone ficaria pulsando para um pedido inexistente | Deixar o ícone em espera | 🟢 |

## 4. Premissas

Não há `[DÚVIDA]` aberta no `requirements.md`. As decorrências da resposta 1b (RN-07 a RN-09) foram registradas pelo `/reversa-clarify` e são seguidas aqui como requisito.

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|----------|----------------------------------|-----------------|
| Média ponderada pela duração, sem fila, erros, cache e áudios próprios | Seção 9, sessão 2026-10-01, Q1 | A média do painel mede coisa diferente da esperada; ajuste local em `tempo-de-espera.ts` e `contadores.ts` |

## 5. Delta arquitetural

O projeto é greenfield: os componentes vêm das specs em `_reversa_sdd/sdd/` e dos adendos, não de `architecture.md`.

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| Fila de transcrição | `_reversa_sdd/sdd/nucleo-transcricao.md#6.1` (`extension/src/dominio/fila-transcricao.ts`) | regra-alterada | Carimba os três instantes por pedido com relógio injetável; `repetir` recebe a direção |
| Núcleo | `_reversa_sdd/sdd/nucleo-transcricao.md#6.1` (`extension/src/dominio/nucleo.ts`) | regra-alterada | Envia instantes e tempos à janela e ao ícone; reflete o ícone mesmo com a janela fechada; reabre janela de pedido em andamento; alimenta o acumulado |
| Cache da sessão | `_reversa_sdd/sdd/nucleo-transcricao.md#6.1` (`extension/src/dominio/cache-sessao.ts`) | regra-alterada | Guarda os tempos do pedido |
| Contadores | `_reversa_sdd/sdd/nucleo-transcricao.md#6.1` (`extension/src/dominio/contadores.ts`) | regra-alterada | Acumula espera e duração; calcula a média; ler, modificar e gravar |
| Tempo de espera | `extension/src/dominio/tempo-de-espera.ts` | componente-novo | Cálculo e formatação puros |
| Porta ExibicaoDeTranscricao | `_reversa_sdd/sdd/nucleo-transcricao.md#8` (`extension/src/dominio/exibicao-de-transcricao.ts`) | contrato-alterado | `inicioEsperaEm` nos estados de espera; `tempos` na conclusão; `falhouAposMs` no erro |
| Porta FonteDeAudio | `_reversa_sdd/sdd/nucleo-transcricao.md#10` (`extension/src/dominio/fonte-de-audio.ts`) | contrato-alterado | Operação `refletirEstadoPedido` |
| Porta ArmazenamentoNavegador | `_reversa_sdd/sdd/nucleo-transcricao.md#10` (`extension/src/dominio/armazenamento-navegador.ts`) | contrato-alterado | Dois campos novos nos contadores persistidos |
| Adaptador do WhatsApp Web | `_reversa_sdd/sdd/integracao-whatsapp-web.md#6.1` (`adaptador-whatsapp-web.ts`, `content/botao-transcricao.ts`, `content/index.ts`, `content/estilos.css`) | regra-alterada | Liga o RF-16: estado e contador no ícone, reaplicados ao botão reinserido |
| Cronômetro de espera | `extension/src/content/cronometro-espera.ts` | componente-novo | Temporizador único dos contadores visíveis |
| Janela flutuante | `_reversa_sdd/sdd/janela-flutuante.md#6.1` (`content/janela-elemento.ts`, `content/gerenciador-janelas.ts`, `content/janela-flutuante.css`) | regra-alterada | Contador vivo, resumo final, "Falhou após", região viva com 2 anúncios |
| Armazenamento Chrome | `_reversa_sdd/addenda/004-nucleo-transcricao.md` (`adaptadores/armazenamento-chrome.ts`) | regra-alterada | Normaliza registro antigo e zera os campos novos |
| Painel da extensão | `_reversa_sdd/sdd/nucleo-transcricao.md#6.1`, RF-15 (`src/popup/popup.ts`, `popup/index.html`) | regra-alterada | Linha "Espera média" |

## 6. Delta no modelo de dados

- Resumo das mudanças: dois inteiros novos no registro persistido dos contadores, uma métrica derivada, três instantes no item da fila e os tempos do pedido no cache e nos estados de exibição. Leitura de registro antigo preenche 0, sem migração explícita.
- Detalhe completo em: `_reversa_forward/006-cronometro-transcricao/data-delta.md`

## 7. Delta de contratos externos

Nenhum contrato externo (Native Messaging, página do WhatsApp) muda. As três portas internas alteradas estão descritas em arquivos próprios.

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| ExibicaoDeTranscricao | porta interna | `_reversa_forward/006-cronometro-transcricao/interfaces/porta-exibicao-de-transcricao.md` |
| FonteDeAudio | porta interna | `_reversa_forward/006-cronometro-transcricao/interfaces/porta-fonte-de-audio.md` |
| ArmazenamentoNavegador | porta interna | `_reversa_forward/006-cronometro-transcricao/interfaces/porta-armazenamento-navegador.md` |

## 8. Plano de migração

1. Na primeira leitura após a atualização, `whispper_contadores` sem os campos novos é tratado como `esperaAcumuladaMs = 0` e `audioAcumuladoMs = 0`; a gravação seguinte já os inclui.
2. Os 3 contadores e a data de início existentes são preservados.
3. Nenhuma ação do usuário; recarregar a aba do WhatsApp Web após recarregar a extensão.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| O contador ao lado do ícone cobre a duração do áudio ou outro elemento do balão no WhatsApp real | médio | médio | Posição absoluta à direita, fundo do tema; conferência manual no WhatsApp real (onboarding, passo 4) |
| A janela abre longe do balão (defeito anotado no BUG-20261001-2MOY) | baixo | alto | Fora do escopo; o indicador principal fica no ícone |
| Escritas concorrentes no armazenamento entre popup e script de conteúdo | médio | baixo | D-11, ler, modificar e gravar a cada registro |
| A mudança de contrato da exibição quebra testes existentes (`test/gerenciador-janelas.test.ts` usa `segundosDecorridos`) | baixo | alto | Ação de teste atualiza o caso para `inicioEsperaEm` |
| O navegador espaça temporizadores em aba oculta | baixo | alto | Tempo calculado do instante de início e tique imediato em `visibilitychange` (D-03) |
| Rótulo acessível do botão alterado a cada segundo inundaria o leitor de tela | médio | baixo | Contador com `aria-hidden`; rótulo muda só na transição (D-05, D-06) |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `cross-check.md` (se executado) sem CRITICAL nem HIGH
- [ ] `regression-watch.md` gerado
- [ ] `npm run typecheck` e `npm test` verdes na pasta `extension/`
- [ ] Teste de integração no navegador (`test/integracao-conversa.test.ts`) cobrindo o ícone em espera e em erro, quando o Chrome for Testing estiver disponível
- [ ] `npm run build` regenera `dist/` sem erro
- [ ] Re-extração reversa executada e sem regressão vermelha (recomendado, não obrigatório)

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-10-01 | Versão inicial gerada por `/reversa-plan` | reversa |
