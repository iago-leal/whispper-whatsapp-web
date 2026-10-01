# Investigação: Indicador de espera com cronômetro na transcrição

> Identificador: `006-cronometro-transcricao`
> Data: `2026-10-01`

## 1. Estado de partida, verificado no código

| Ponto | Onde | Constatação |
|-------|------|-------------|
| Tempo da janela parado | `extension/src/dominio/nucleo.ts:254-258` | O estado "transcrevendo" sai uma vez com `segundosDecorridos: 0`; nada o atualiza |
| Ícone sem estado | `extension/src/content/index.ts:8`, `:33` | `atualizarEstadoBotao` importada e nunca chamada; o botão devolvido pela injeção é descartado |
| Animação pronta | `extension/src/content/estilos.css:30-47` | Classes `whispper-animando`, `whispper-concluido`, `whispper-erro` e `@keyframes whispper-pulsar` sem uso |
| Rerenderização total | `extension/src/content/janela-elemento.ts:65-90` | Cada mudança de estado faz `innerHTML = ''` no corpo e no rodapé |
| Conclusão com janela fechada | `extension/src/dominio/nucleo.ts`, `tratarMudancaEstadoFila` | Retorna cedo sem notificar ninguém, o que deixaria o ícone sem o estado concluído |
| Clique com janela fechada | `extension/src/dominio/nucleo.ts`, `processarSolicitacao` | Pedido existente só recebe `destacar`, que não faz nada sem janela |
| Direção perdida | `extension/src/dominio/fila-transcricao.ts`, `repetir` | A nova tentativa sempre entra como "recebido" |
| Cópia antiga dos contadores | `extension/src/dominio/contadores.ts` | O script de conteúdo carrega os contadores uma vez e regrava essa cópia; o zeramento feito pelo popup é desfeito no registro seguinte |
| Dados já disponíveis | `extension/src/dominio/motor-de-transcricao.ts:20` | A resposta do motor traz `duracaoAudioSeg` e `processamentoMs` |
| Linha de base | `_reversa_bugs/integracao-whatsapp-web/bugs/BUG-20261001-2MOY-audio-sem-elemento/evidence/aceitacao-whatsapp-real.md:18-19` | 9 s de áudio em cerca de 3,8 s; 13 s em 9,7 s |

## 2. Pesquisa de fundo

### 2.1 Temporizadores em abas ocultas

O Chrome limita temporizadores de abas em segundo plano a no máximo uma execução por segundo e, depois de cerca de 5 minutos oculta, aplica o "intensive throttling", que agrupa temporizadores encadeados em execuções por minuto. Um contador que soma tiques passaria a mostrar tempo menor que o real. Calcular o tempo a partir do instante de início e redesenhar ao voltar a aba (`visibilitychange`) elimina a deriva. Fonte: documentação do Chrome, "Heavy throttling of chained JS timers beginning in Chrome 88" (developer.chrome.com/blog/timer-throttling-in-chrome-88).

### 2.2 Relógio monotônico

`performance.now()` é monotônico, não recua com ajuste do relógio do sistema e continua avançando com a aba oculta. Núcleo e janela vivem no mesmo script de conteúdo, portanto compartilham a mesma origem de tempo; o popup não precisa dela, porque lê apenas totais em milissegundos. Fonte: W3C High Resolution Time (w3.org/TR/hr-time-3).

### 2.3 Acessibilidade de contadores

Um contador que muda a cada segundo dentro de uma região viva produz um anúncio por segundo. O papel `role="timer"` tem `aria-live="off"` implícito: o valor fica disponível para consulta sem ser anunciado. Os anúncios de início e conclusão vão para uma região `aria-live="polite"` separada. Fonte: WAI-ARIA 1.2, papel `timer` (w3.org/TR/wai-aria-1.2/#timer).

### 2.4 Redução de movimento

`@media (prefers-reduced-motion: reduce)` permite desligar a animação de pulsar sem perder o indicador: o ícone mantém a cor de espera e o contador continua. Fonte: Media Queries Level 5 (w3.org/TR/mediaqueries-5/#prefers-reduced-motion).

### 2.5 Formato numérico em português

A vírgula decimal sai de `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })` ou de troca simples do ponto, sem biblioteca. O formato "7 s" difere do "0:13" que o WhatsApp usa para a duração, o que evita confundir os dois no mesmo balão.

### 2.6 Armazenamento local sem transação

`chrome.storage.local` não oferece transação: a última gravação vence. Com dois contextos gravando a mesma chave (popup e script de conteúdo), reler antes de incrementar reduz a janela de corrida a milissegundos, suficiente para um uso pessoal.

## 3. Alternativas avaliadas

| Tema | Alternativa | Veredito |
|------|-------------|----------|
| Quem faz o tempo andar | Núcleo emite a cada segundo | Descartada: viola RF-03 do núcleo e multiplica as rerenderizações |
| Quem faz o tempo andar | Exibição calcula a partir do instante de início | Escolhida (D-01) |
| Temporizador | Um por janela ou ícone | Descartada: até 20 janelas mais os ícones em espera |
| Temporizador | `requestAnimationFrame` | Descartada: pausa em segundo plano e roda a 60 Hz sem necessidade |
| Temporizador | Um intervalo compartilhado de 500 ms | Escolhida (D-03): erro máximo de meio segundo além do arredondamento |
| Canal até o ícone | Porta de exibição decorada | Descartada: a janela pode estar fechada (RF-12) |
| Canal até o ícone | Operação nova na porta `FonteDeAudio` | Escolhida (D-04): o adaptador do WhatsApp é dono do botão |
| Acumulado | Lista de tempos por pedido | Descartada: viola RN-06 |
| Acumulado | Dois totais inteiros | Escolhida (D-10) |

## 4. Padrões aplicáveis

- Portas e adaptadores: o domínio não toca DOM nem `chrome.*`; o relógio entra por injeção.
- Estado reaplicável: o adaptador do WhatsApp guarda o último estado por áudio e o aplica a cada botão injetado, porque a página recria os balões.
- Funções puras para formatação, testadas por tabela de exemplos.
