# Legacy impact: Indicador de espera com cronômetro na transcrição

> Identificador: `006-cronometro-transcricao`
> Data: `2026-10-02`
> Execução: T001 a T024 em 2026-10-01 (commit `6b4869a`); T025 e T026 em 2026-10-02
> Política de edição no momento da execução: `allowLegacyEdits: true`, `allowedPaths` vazio (projeto inteiro liberado)

**Feature greenfield, sem legado pré-existente. Âncora: `prd.md` + specs SDD.** Não há `architecture.md` nem `domain.md` em `_reversa_sdd/`; cada arquivo é mapeado ao componente da spec correspondente em `_reversa_sdd/sdd/`.

A regra greenfield do `/reversa-coding` manda classificar tudo como `componente-novo`. Esta feature, porém, evolui código entregue pelas features 002 a 004, e por isso a classificação abaixo usa o tipo real de cada mudança; só os dois arquivos criados são `componente-novo`. Caminhos relativos a `extension/`.

## Arquivos do produto

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `src/dominio/tempo-de-espera.ts` | `nucleo-transcricao.md` | `componente-novo` | LOW | Funções puras de tempo e formatação em pt-BR, sem estado (D-14) |
| `src/content/cronometro-espera.ts` | `integracao-whatsapp-web.md` e `janela-flutuante.md` | `componente-novo` | MEDIUM | Um único temporizador de 500 ms no script de conteúdo serve ícones e janelas; para sem nós registrados (D-03) |
| `src/dominio/exibicao-de-transcricao.ts` | `janela-flutuante.md` (porta de exibição) | `regra-alterada` | MEDIUM | Os estados de espera trocam `segundosDecorridos` por `inicioEsperaEm`; "concluido" ganha `tempos` e "erro" ganha `falhouAposMs` (D-01, D-07) |
| `src/dominio/fonte-de-audio.ts` | `integracao-whatsapp-web.md` (porta `FonteDeAudio`) | `regra-nova` | MEDIUM | Operação `refletirEstadoPedido` e tipo `EstadoPedidoIcone` (D-04) |
| `src/dominio/armazenamento-navegador.ts` | `nucleo-transcricao.md` | `delta-de-dados` | MEDIUM | `ContadoresPersistidos` ganha `esperaAcumuladaMs` e `audioAcumuladoMs`; `MetricasContadores` ganha `esperaMediaSegPorMinuto` (D-10) |
| `src/adaptadores/armazenamento-chrome.ts` | `nucleo-transcricao.md` | `delta-de-dados` | MEDIUM | Registro antigo ou inválido é lido como 0; o zeramento inclui os campos novos |
| `src/dominio/contadores.ts` | `nucleo-transcricao.md` | `regra-alterada` | MEDIUM | `registrarTempoDeEspera` e média ponderada (RN-07, RN-08); cada registro relê o armazenamento antes de gravar, para não desfazer um zeramento feito pelo painel (D-11) |
| `src/dominio/fila-transcricao.ts` | `nucleo-transcricao.md` | `regra-alterada` | MEDIUM | Relógio injetável e três carimbos por pedido; `repetir` passa a receber a direção, antes fixa em "recebido" (D-02, D-07, D-13) |
| `src/dominio/cache-sessao.ts` | `nucleo-transcricao.md` | `delta-de-dados` | LOW | O item guarda `tempos` para a reabertura mostrar o resumo original (D-09) |
| `src/dominio/nucleo.ts` | `nucleo-transcricao.md` | `regra-alterada` | HIGH | Reflete o pedido no ícone em toda transição, inclusive com a janela fechada; reabre a janela de pedido em andamento num novo clique (D-12); devolve o ícone ao ocioso quando a janela de um pedido na fila fecha (D-15); a gravação no cache passou à conclusão |
| `src/content/botao-transcricao.ts` | `integracao-whatsapp-web.md` | `regra-nova` | MEDIUM | Contador `whispper-contador` com `aria-hidden` e aplicação de `EstadoPedidoIcone` (D-05); atende o RF-16 da integração, antes Could |
| `src/adaptadores/adaptador-whatsapp-web.ts` | `integracao-whatsapp-web.md` | `regra-nova` | MEDIUM | Guarda o estado de cada pedido e o reaplica ao botão recriado pela página (RF-08 da feature) |
| `src/content/index.ts` | `integracao-whatsapp-web.md` | `regra-alterada` | LOW | Cria o cronômetro único, entrega-o ao adaptador e às janelas e registra cada botão injetado |
| `src/content/estilos.css` | `integracao-whatsapp-web.md` | `regra-nova` | LOW | Contador fora do fluxo, à direita do ícone; sem pulsar sob `prefers-reduced-motion` |
| `src/content/janela-elemento.ts` | `janela-flutuante.md` | `regra-alterada` | MEDIUM | Contador vivo com `role="timer"`, resumo final com fila e comparação, "Falhou após", anúncio só no início e no fim (D-06) |
| `src/content/gerenciador-janelas.ts` | `janela-flutuante.md` | `regra-alterada` | LOW | Recebe o cronômetro e o repassa a cada janela |
| `src/content/janela-flutuante.css` | `janela-flutuante.md` | `regra-nova` | LOW | Estilos do contador, do resumo e da classe só para leitor de tela |
| `popup/index.html`, `src/popup/popup.ts` | `nucleo-transcricao.md` (painel) | `regra-nova` | LOW | Linha "Espera média", com "sem transcrições ainda" sem dados (RF-14) |

## Testes

| Arquivo | Tipo | Cobertura |
|---------|------|-----------|
| `test/tempo-de-espera.test.ts` | `componente-novo` | Formatação, resumo, comparação e média (T004) |
| `test/cronometro-espera.test.ts` | `componente-novo` | Temporizador único, atualização só na mudança, descarte de nós, volta da aba (T005) |
| `test/contadores-espera.test.ts` | `componente-novo` | Acumulado, média, zeramento e registro antigo (T007) |
| `test/nucleo-transcricao.test.ts` | `regra-alterada` | Estados do ícone, tempos, cache, "Tentar de novo", reabertura e acumulado (T006) |
| `test/gerenciador-janelas.test.ts` | `regra-alterada` | Contrato novo da porta de exibição (T008) |
| `test/integracao-conversa.test.ts` | `regra-nova` | No Chrome for Testing: o clique faz o ícone pulsar com contador e passa ao erro sem contador; em 20 cliques, o ícone pulsa na mesma tarefa do clique e em até 100 ms (T025) |

## Diff conceitual por componente

**`nucleo-transcricao.md`.** O pedido passa a carregar três instantes, do clique, do início da transcrição e do fim, num relógio monotônico comum à fila, ao núcleo e à exibição. Deles o núcleo deriva os tempos do pedido (espera total, parte na fila, duração do áudio) e os entrega à janela na conclusão e na reabertura pelo cache. O acumulado do painel soma só a espera sem fila e a duração dos áudios recebidos e concluídos, e a média é ponderada pela duração. Mudam três comportamentos do núcleo especificado: o novo clique num pedido em andamento com a janela fechada reabre a janela em vez de só destacar, o pedido repetido preserva a direção original e o cache passa a ser gravado na conclusão. Os RF-08 e RF-10 da spec (novo clique e fechamento da janela) e os RF-15 a RF-17 (painel, zeramento e exclusão dos áudios enviados) precisam desse registro no `/reversa-sync`.

**`integracao-whatsapp-web.md`.** A porta `FonteDeAudio` ganha uma operação de saída, `refletirEstadoPedido`, e o adaptador passa a guardar o estado de cada pedido para reaplicá-lo ao botão que a página recria na rolagem e na troca de conversa. O RF-16 da integração, antes Could, fica entregue como Must, com o contador ao lado do ícone.

**`janela-flutuante.md`.** O tempo decorrido do RF-06 da janela, que o código mantinha parado em 0 s apesar do adendo `003`, passa a avançar. A janela só recria o corpo na transição de estado; durante a espera o cronômetro troca apenas o texto do contador, e o leitor de tela é avisado só no início e no fim (RF-14 da janela).

## Preservadas

Cenário greenfield: não há regras 🟢 de `domain.md` a preservar. A suíte anterior à feature continua verde (144 aprovados, 0 falhas, 2 pulados, contra 142 aprovados antes de T025), o que cobre o comportamento das features 001 a 005.

## Modificadas

Cenário greenfield: não há regras 🟢 de `domain.md` alteradas. Os requisitos das specs SDD que a entrega altera estão no diff conceitual acima e serão convergidos pelo `/reversa-sync` em `_reversa_sdd/addenda/`.
