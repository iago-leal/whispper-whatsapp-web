# Requirements: Indicador de espera com cronômetro na transcrição

> Identificador: `006-cronometro-transcricao`
> Data: `2026-10-01`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Ao clicar no ícone de transcrição de um áudio, o usuário passa a ver de imediato, no próprio ícone, que o pedido foi aceito e está em processamento, com um cronômetro em segundos; a janela flutuante mostra o mesmo cronômetro avançando. Concluída a transcrição, a janela informa quanto tempo a espera durou e qual a duração do áudio, para que o usuário julgue se ler compensou ouvir; o painel da extensão acumula a espera média por minuto de áudio, para a mesma avaliação ao longo dos dias. A feature preenche dois vazios do código vigente: o ícone não muda depois do clique, embora a spec da integração o preveja, e o tempo do estado "Transcrevendo" fica parado em 0 s.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/sdd/integracao-whatsapp-web.md#6.1 Requisitos Principais` | RF-16 (Could): o ícone reflete o estado do pedido, transcrevendo, concluído ou erro, com indicador de progresso durante a transcrição. | 🟡 |
| `_reversa_sdd/sdd/integracao-whatsapp-web.md#8. Design e Interface` | Estado de carregamento: indicador de progresso no ícone enquanto o áudio é obtido ou transcrito. | 🟡 |
| `_reversa_sdd/sdd/integracao-whatsapp-web.md#6.1 Requisitos Principais` | RF-02: a página redesenha a mensagem na rolagem e na troca de conversa, e o ícone é reinserido, um por mensagem. | 🟡 |
| `_reversa_sdd/sdd/janela-flutuante.md#6.1 Requisitos Principais` | RF-06: a janela exibe "Na fila (N à frente)" e "Transcrevendo…" com o tempo decorrido em segundos. RF-14: mudanças de estado anunciadas a leitores de tela. | 🟡 |
| `_reversa_sdd/sdd/janela-flutuante.md#8. Design e Interface` | Estado de carregamento "Transcrevendo… 7 s"; cabeçalho com a duração do áudio. | 🟡 |
| `_reversa_sdd/sdd/janela-flutuante.md#7. Requisitos Não-Funcionais` | RNF-02: 0 tarefas acima de 50 ms com 20 janelas; RNF-03: isolamento de estilo; RNF-04: contraste ≥ 4,5:1. | 🟡 |
| `_reversa_sdd/sdd/nucleo-transcricao.md#6.1 Requisitos Principais` | RF-03: quatro estados por pedido e exatamente 1 notificação por transição; RF-08: novo clique em pedido existente destaca a janela; RF-10: fechar a janela durante a transcrição não a interrompe; RF-14: o armazenamento guarda só 3 inteiros e 1 data. | 🟡 |
| `_reversa_sdd/sdd/nucleo-transcricao.md#6.1 Requisitos Principais` | RF-15: o painel exibe os contadores e a data de início; RF-16: zerar os contadores redefine a data de início; RF-17: áudios enviados pelo próprio usuário ficam fora dos contadores. | 🟡 |
| `_reversa_sdd/sdd/nucleo-transcricao.md#7. Requisitos Não-Funcionais` | RNF-01: ≤ 10 s por minuto de áudio; RNF-02: prazo máximo, o maior entre 60 s e 30 s por minuto de áudio. | 🟡 |
| `_reversa_sdd/prd.md#3. Métricas de sucesso` | A latência do produto é medida do clique no ícone ao texto na janela. | 🟡 |
| `_reversa_sdd/prd.md#8. Riscos` | A mitigação do risco de cliques sucessivos prevê "indicação de progresso em cada janela". | 🟡 |
| `_reversa_sdd/addenda/003-janela-flutuante.md#Resumo da entrega` | Declara entregue o estado "transcrevendo com cronômetro"; o código vigente o desmente (ver abaixo). | 🟢 |
| `_reversa_sdd/addenda/bug-BUG-20261001-2MOY-v001.md#Delta 3` | O áudio vem do download da própria página: a espera inclui a obtenção do áudio, não só o motor. | 🟢 |

**Constatações no código vigente**, verificadas por leitura em 2026-10-01 (🟢):

- `extension/src/dominio/nucleo.ts:254-258`: o núcleo envia o estado "transcrevendo" uma única vez, com `segundosDecorridos: 0`; nada o atualiza depois, e a janela exibe "Transcrevendo... (0 s)" parada.
- `extension/src/content/index.ts:8` e `:33`: `atualizarEstadoBotao` é importada e nunca chamada, e o ícone devolvido por `injetarBotaoNaMensagem` é descartado; o ícone não muda depois do clique. A animação de pulsar já existe em `extension/src/content/estilos.css:30-47`, sem uso.
- `extension/src/dominio/motor-de-transcricao.ts:20`: a resposta do motor já traz a duração do áudio e o tempo de processamento; `extension/src/dominio/cache-sessao.ts:13` guarda a duração, mas não o tempo de espera.
- `_reversa_bugs/integracao-whatsapp-web/bugs/BUG-20261001-2MOY-audio-sem-elemento/bug.md:261-262`: no WhatsApp real, a janela abriu sobre a lista de conversas, longe do balão, e o ícone não refletiu o estado do pedido.
- Linha de base, `_reversa_bugs/integracao-whatsapp-web/bugs/BUG-20261001-2MOY-audio-sem-elemento/evidence/aceitacao-whatsapp-real.md:18-19`: áudio de 9 s transcrito em cerca de 3,8 s; áudio de 13 s, em 9,7 s, do clique ao texto.

## 3. Personas e cenários de uso

Neste documento, **pedido** é a transcrição solicitada por um clique; **espera** é o intervalo em que o pedido está "na fila" ou "transcrevendo"; **balão** é o elemento do WhatsApp que contém a mensagem de voz.

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Usuário técnico (persona 1 do PRD, o documento de requisitos do produto) | Saber que o clique foi aceito e medir se ler compensa ouvir | Clica num áudio de 40 s, vê o ícone pulsar com "12 s" ao lado e, ao fim, lê na janela "Transcrito em 14,2 s · áudio de 40 s". |
| Usuário técnico, ao longo dos dias | Decidir se a ferramenta compensa no uso real | Depois de uma semana, abre o painel e lê "Espera média: 14,0 s por minuto de áudio". |
| Usuário técnico, com áudios fragmentados | Acompanhar vários pedidos em sequência | Clica em 4 áudios seguidos; os 4 ícones indicam espera, e a janela do terceiro mostra "Na fila (1 à frente) · 9 s". |
| Usuário leigo (persona 2), na etapa de distribuição | Não repetir o clique por julgar que nada aconteceu | Num computador mais lento, vê o cronômetro avançar e aguarda, em vez de clicar de novo. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** A contagem de um pedido começa no clique que o cria e cobre a fila, a obtenção do áudio e a transcrição; termina na conclusão ou no erro. 🟢
   - Origem no legado: `_reversa_sdd/prd.md#3. Métricas de sucesso` (latência medida do clique ao texto)
   - Tipo: nova
2. **RN-02:** O tempo exibido corresponde ao tempo real decorrido desde o clique, com erro máximo de 1 s, inclusive quando a aba do WhatsApp volta do segundo plano. 🟡
   - Tipo: nova
3. **RN-03:** O avanço do cronômetro não gera notificações adicionais do núcleo: cada transição de estado continua a gerar exatamente 1 notificação, e o tempo exibido avança sem depender de novas notificações. 🟡
   - Origem no legado: `_reversa_sdd/sdd/nucleo-transcricao.md#6.1 Requisitos Principais` (RF-03) e `_reversa_sdd/sdd/janela-flutuante.md#6.1 Requisitos Principais` (RF-06)
   - Tipo: alterada
4. **RN-04:** O pedido atendido pelo cache da sessão não inicia nova contagem; exibe o tempo medido na transcrição original. 🟡
   - Origem no legado: `_reversa_sdd/sdd/nucleo-transcricao.md#6.1 Requisitos Principais` (reexibição pelo cache em ≤ 200 ms)
   - Tipo: alterada
5. **RN-05:** O clique em "Tentar de novo" cria uma contagem nova, a partir desse clique; o tempo da tentativa que falhou não se soma ao da nova. 🟡
   - Tipo: nova
6. **RN-06:** O tempo de cada pedido fica só na memória da aba. Para o painel, a extensão guarda apenas o acumulado: a soma das esperas e a soma das durações dos áudios contados, dois números que não identificam áudios, pessoas nem conversas, ao lado dos 3 contadores e da data de início já existentes. 🟢
   - Origem no legado: `_reversa_sdd/sdd/nucleo-transcricao.md#6.1 Requisitos Principais` (RF-14: o armazenamento guardava só 3 inteiros e 1 data)
   - Tipo: alterada
7. **RN-07:** Entra no acumulado, uma única vez, cada transcrição concluída de áudio recebido. A espera considerada vai da saída da fila até a conclusão, sem a parte da fila, para que clicar vários áudios em sequência não infle a média. Ficam de fora os erros, as reaberturas pelo cache e os áudios enviados pelo próprio usuário. 🟡
   - Origem no legado: `_reversa_sdd/sdd/nucleo-transcricao.md#6.1 Requisitos Principais` (RF-17)
   - Tipo: nova
8. **RN-08:** A espera média é a soma das esperas dividida pela soma das durações dos áudios, em minutos; não é a média das razões de cada áudio. 🟡
   - Tipo: nova
9. **RN-09:** O acumulado compartilha a data de início dos contadores e é zerado com eles. 🟡
   - Origem no legado: `_reversa_sdd/sdd/nucleo-transcricao.md#6.1 Requisitos Principais` (RF-16)
   - Tipo: alterada

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | O sistema deve, ao clique que cria um pedido, fazer o próprio ícone de transcrição pulsar como indicador de espera, com o rótulo acessível "Transcrevendo áudio". Atende o RF-16 da integração, promovido de Could a Must. | Must | Em 20 cliques medidos por marcação de tempo, 95% dos ícones passam a pulsar em ≤ 100 ms após o clique, antes de qualquer resposta do motor. | 🟢 |
| RF-02 | O sistema deve exibir, ao lado do ícone em espera, o tempo decorrido desde o clique em segundos inteiros ("7 s"), atualizado ao menos uma vez por segundo com a aba visível, em formato distinto da duração do áudio que o WhatsApp exibe no balão ("0:13"). | Must | Com motor simulado que responde em 5 s, leituras a cada segundo mostram valores crescentes sem saltos maiores que 1 s, e nenhuma leitura usa o formato "m:ss". | 🟢 |
| RF-03 | O sistema deve exibir na janela flutuante o mesmo tempo decorrido, avançando nos dois estados de espera: "Na fila (N à frente) · 9 s" e "Transcrevendo… 12 s". | Must | Durante um pedido simulado de 5 s, a janela exibe 5 valores sucessivos; o valor da janela e o do ícone diferem em no máximo 1 s. | 🟢 |
| RF-04 | O sistema deve exibir os tempos a partir de 60 s no formato "1 min 05 s". | Should | Pedido simulado de 65 s exibe "1 min 05 s" no ícone e na janela. | 🟡 |
| RF-05 | O sistema deve, na conclusão, parar o cronômetro, trocar o ícone pelo indicador de concluído e exibir na janela, junto ao texto, o tempo total de espera, com uma casa decimal, e a duração do áudio: "Transcrito em 9,7 s · áudio de 13 s". | Must | Pedido simulado concluído em 3,2 s, com áudio de 13 s, exibe "Transcrito em 3,2 s · áudio de 13 s", com tolerância de 0,2 s no tempo; o valor não muda depois da conclusão. | 🟢 |
| RF-06 | O sistema deve, quando o pedido tiver esperado na fila, separar essa parte no resumo final: "Transcrito em 14,1 s (4,4 s na fila) · áudio de 13 s". | Must | Com A em transcrição por 4 s e B clicado logo depois, o resumo de B informa a parte da fila com tolerância de 0,2 s; pedido sem fila não exibe o parêntese. | 🟢 |
| RF-07 | O sistema deve, no erro, parar o cronômetro, trocar o ícone pelo indicador de erro e exibir na janela, junto à mensagem do erro, o tempo até a falha: "Falhou após 61 s". | Must | Com motor simulado que nunca responde, ao fim do prazo máximo o ícone indica erro, o contador some do ícone e a janela exibe "Falhou após" seguido do prazo. | 🟡 |
| RF-08 | O sistema deve manter o estado e o tempo do ícone quando o WhatsApp redesenhar o balão por rolagem ou troca de conversa: o ícone reinserido retoma a espera com o tempo corrente, ou o indicador de concluído ou de erro. | Must | Com um pedido em espera, trocar de conversa e voltar mostra o ícone em espera, com o tempo diferindo em no máximo 1 s do tempo da janela. | 🟡 |
| RF-09 | O sistema deve, ao reabrir uma transcrição pelo cache da sessão, exibir o indicador de concluído e o resumo da transcrição original, sem cronômetro (RN-04). | Must | Fechar a janela de um áudio transcrito em 9,7 s e clicar de novo no ícone exibe "Transcrito em 9,7 s · áudio de 13 s", e nenhum contador aparece. | 🟡 |
| RF-10 | O sistema não deve reiniciar a contagem quando o usuário clicar de novo no ícone de um pedido em espera. | Must | Clicar de novo aos 6 s mantém o contador em 6 s e destaca a janela existente. | 🟡 |
| RF-11 | O sistema deve iniciar uma contagem nova, a partir de 0 s, ao clique em "Tentar de novo" (RN-05). | Must | Após erro aos 61 s, "Tentar de novo" leva o ícone ao estado de espera e o contador a 0 s. | 🟡 |
| RF-12 | O sistema deve manter o ícone em espera, com o contador, quando o usuário fechar a janela durante a transcrição, e trocá-lo pelo indicador de concluído quando ela terminar. | Must | Fechar a janela aos 3 s de um pedido de 8 s: o contador do ícone segue até a conclusão, que troca o ícone pelo indicador de concluído; o clique seguinte exibe o resumo final. | 🟡 |
| RF-13 | O sistema deve acrescentar ao resumo final a comparação entre a espera e a duração do áudio: "1,3× mais rápido que ouvir" quando a espera for menor que a duração, e "mais lento que ouvir" nos demais casos. | Could | Espera de 10 s para áudio de 13 s exibe "1,3× mais rápido que ouvir"; espera de 15 s para o mesmo áudio exibe "mais lento que ouvir". | 🟡 |
| RF-14 | O sistema deve exibir no painel da extensão a espera média por minuto de áudio desde a data de início, com uma casa decimal: "Espera média: 14,0 s por minuto de áudio", calculada conforme RN-07 e RN-08. Sem transcrição contada, exibe "Espera média: sem transcrições ainda". | Must | Com duas transcrições contadas, de 4,3 s para 13 s de áudio e de 9,7 s para 47 s, o painel exibe "Espera média: 14,0 s por minuto de áudio"; após reiniciar o Chrome, o valor persiste. | 🟢 |
| RF-15 | O sistema deve zerar o acumulado quando o usuário zerar os contadores pelo painel (RN-09). | Should | Após confirmar o zeramento, o painel exibe "Espera média: sem transcrições ainda" e a data atual; ao cancelar, o valor não muda. | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | Com 20 pedidos em espera, 0 tarefas acima de 50 ms; a atualização do contador não desfaz a seleção de texto nem desloca o foco do teclado dentro da janela. | `_reversa_sdd/sdd/janela-flutuante.md#7. Requisitos Não-Funcionais` (RNF-02); o corpo da janela é hoje reconstruído a cada mudança de estado. | 🟡 |
| Desempenho | A sobrecarga do núcleo por pedido continua ≤ 100 ms, e o número de notificações por pedido não aumenta. | `_reversa_sdd/sdd/nucleo-transcricao.md#7. Requisitos Não-Funcionais` (RNF-03) e RN-03 | 🟡 |
| Precisão | Erro máximo de 1 s entre o tempo exibido e o decorrido, inclusive depois de 5 min com a aba em segundo plano. | RN-02; o navegador espaça os temporizadores de abas ocultas. | 🟡 |
| Acessibilidade | O leitor de tela anuncia o início da espera e a conclusão com o tempo total, sem anunciar cada segundo: no máximo 2 anúncios por pedido sem erro. | `_reversa_sdd/sdd/janela-flutuante.md#6.1 Requisitos Principais` (RF-14) | 🟡 |
| Acessibilidade | Contraste ≥ 4,5:1 do contador e dos indicadores nos temas claro e escuro; quando o sistema operacional pedir redução de movimento, o ícone deixa de pulsar, mantém a cor de espera, e o contador continua a avançar. | `_reversa_sdd/sdd/janela-flutuante.md#7. Requisitos Não-Funcionais` (RNF-04) | 🟡 |
| Isolamento | O contador ao lado do ícone não altera a largura nem a quebra de linha dos demais elementos do balão; 0 exceções não tratadas no console da página. | `_reversa_sdd/sdd/janela-flutuante.md#7. Requisitos Não-Funcionais` (RNF-03) e `_reversa_sdd/sdd/integracao-whatsapp-web.md#7. Requisitos Não-Funcionais` (RNF-04) | 🟡 |
| Privacidade | O armazenamento da extensão passa a conter 3 contadores, 2 totais de segundos e 1 data, nenhum deles identificando áudio, pessoa ou conversa; o tempo de cada pedido não sai da memória da aba e nada é enviado para fora do computador. | RN-06; `_reversa_sdd/sdd/nucleo-transcricao.md#6.1 Requisitos Principais` (RF-14) | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Clique inicia a espera visível no ícone (RF-01, RF-02)
  Dado uma conversa aberta com um áudio de 13 s nunca transcrito
  Quando o usuário clica no ícone de transcrição
  Então em até 100 ms o ícone de transcrição passa a pulsar
  E ao lado do ícone aparece "0 s", que avança a cada segundo

Cenário: Janela acompanha o mesmo tempo (RF-03)
  Dado um pedido em transcrição há 12 s
  Quando o usuário olha a janela flutuante do áudio
  Então a janela exibe "Transcrevendo… 12 s"
  E o valor da janela difere do valor do ícone em no máximo 1 s

Cenário: Tempo acima de um minuto (RF-04)
  Dado um pedido em espera há 65 s
  Quando o contador é atualizado
  Então o ícone e a janela exibem "1 min 05 s"

Cenário: Conclusão mostra o resumo para avaliar a troca (RF-05)
  Dado um pedido de um áudio de 13 s, sem fila
  Quando a transcrição termina 9,7 s depois do clique
  Então o ícone exibe o indicador de concluído, sem contador
  E a janela exibe o texto e "Transcrito em 9,7 s · áudio de 13 s"

Cenário: Comparação com o tempo de ouvir (RF-13)
  Dado um áudio de 13 s
  Quando a transcrição termina 15 s depois do clique
  Então o resumo final termina com "mais lento que ouvir"

Cenário: Espera na fila aparece separada (RF-03, RF-06)
  Dado o áudio A em transcrição
  Quando o usuário clica no áudio B
  Então a janela de B exibe "Na fila (1 à frente) · N s", com N avançando
  E ao concluir B, o resumo informa a parte da fila entre parênteses

Cenário: Erro para o cronômetro (RF-07)
  Dado um motor que nunca responde
  Quando o pedido atinge o prazo máximo
  Então o ícone exibe o indicador de erro, sem contador
  E a janela exibe a mensagem de tempo esgotado e "Falhou após" seguido do prazo

Cenário: Redesenho do balão preserva o estado (RF-08)
  Dado um pedido em espera há 5 s
  Quando o usuário troca de conversa e volta em 3 s
  Então o ícone reinserido exibe o indicador de espera e o contador em 8 s, com tolerância de 1 s

Cenário: Cache não falsifica o tempo (RF-09)
  Dado um áudio transcrito em 9,7 s cuja janela o usuário fechou
  Quando o usuário clica de novo no ícone
  Então a janela reabre com "Transcrito em 9,7 s · áudio de 13 s"
  E nenhum contador aparece no ícone

Cenário: Novo clique em pedido em espera não reinicia (RF-10)
  Dado um pedido em espera há 6 s
  Quando o usuário clica de novo no mesmo ícone
  Então o contador continua em 6 s, avançando
  E a janela existente é destacada, sem abrir outra

Cenário: Tentar de novo começa contagem nova (RF-11)
  Dado um pedido que falhou após 61 s
  Quando o usuário clica em "Tentar de novo"
  Então o ícone volta ao indicador de espera com o contador em 0 s

Cenário: Janela fechada durante a transcrição (RF-12)
  Dado um pedido em transcrição há 3 s
  Quando o usuário fecha a janela
  Então o ícone continua em espera, com o contador avançando
  E ao fim da transcrição o ícone exibe o indicador de concluído

Cenário: Painel acumula a espera média (RF-14)
  Dado duas transcrições concluídas de áudios recebidos, de 4,3 s para 13 s e de 9,7 s para 47 s
  Quando o usuário abre o painel da extensão
  Então o painel exibe "Espera média: 14,0 s por minuto de áudio"

Cenário: Fila, erro e cache não entram no acumulado (RN-07)
  Dado um pedido que esperou 4,4 s na fila e transcreveu em 9,7 s um áudio de 13 s
  E um pedido que falhou por tempo esgotado
  Quando o usuário reabre pelo cache a transcrição do primeiro áudio e abre o painel
  Então o acumulado soma 9,7 s de espera e 13 s de áudio, uma única vez

Cenário: Zerar os contadores zera o acumulado (RF-15)
  Dado um painel que exibe "Espera média: 14,0 s por minuto de áudio"
  Quando o usuário zera os contadores e confirma
  Então o painel exibe "Espera média: sem transcrições ainda" e a data atual

Cenário: Aba em segundo plano não distorce o tempo (RN-02)
  Dado um pedido em espera
  Quando o usuário passa 5 min em outra aba e volta
  Então o tempo exibido difere do tempo real decorrido em no máximo 1 s
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01, RF-02 | Must | Pedido explícito: saber, ao apertar o botão, que a transcrição está em processamento, com contagem de tempo. |
| RF-03 | Must | A janela já prevê o tempo decorrido (RF-06 da janela), hoje parado em 0 s. |
| RF-05 | Must | Pedido explícito: avaliar se a transcrição vale a pena, o que exige o tempo final e a duração do áudio lado a lado. |
| RF-07, RF-08, RF-09, RF-10, RF-11, RF-12 | Must | Sem eles, o cronômetro mente: continua após o erro, reinicia ou some no redesenho, ou exibe tempo falso na reabertura. |
| RF-06 | Must | Confirmado na sessão de esclarecimento: separar a fila mantém justa a comparação com a duração do áudio. |
| RF-14 | Must | Pedido na sessão de esclarecimento: avaliar a troca ao longo dos dias, não só áudio a áudio. |
| RF-04 | Should | Refina a leitura do tempo em áudios longos, sem alterar o núcleo do pedido. |
| RF-15 | Should | Acompanha o zeramento dos contadores, que já é Should no núcleo (RF-16 do núcleo). |
| RF-13 | Could | A comparação já é possível lendo os dois números do RF-05. |
| RNF de desempenho e de precisão | Must | O contador roda em todos os pedidos e não pode degradar a rolagem nem informar tempo errado. |
| RNF de acessibilidade | Should | Mantém o que a janela já exige (RF-14 e RNF-04 da janela). |
| Corrigir a âncora da janela que abre longe do balão | Won't | Defeito próprio, anotado no BUG-20261001-2MOY; segue por `/reversa-debugger`. O indicador no ícone não depende dele. |
| Distinguir "obtendo o áudio" de "transcrevendo" no cronômetro | Won't | O núcleo tem quatro estados (RF-03 do núcleo); a divisão não ajuda a decidir se compensa ler. |
| Barra de progresso percentual ou tempo restante estimado | Won't | O motor não informa progresso parcial. |

## 9. Esclarecimentos

### Sessão 2026-10-01

- **Q:** Além do tempo de cada áudio na janela, você quer um acumulado no painel da extensão para avaliar ao longo dos dias?
  **R:** Sim: tempo médio de espera por minuto de áudio, desde a data de início (opção b). Decorrências registradas por `/reversa-clarify`, a confirmar no plano: média ponderada pela duração (RN-08); fila, erros, cache e áudios próprios fora do acumulado (RN-07); zeramento junto com os contadores (RN-09). Reescritos: RN-06, RNF de privacidade; criados: RN-07 a RN-09, RF-14 e RF-15.
- **Q:** Onde fica o contador de segundos durante a espera?
  **R:** Ao lado do ícone, no balão, e também na janela (opção a). Confirmado o RF-02.
- **Q:** Quando a contagem começa, se houver outros áudios na fila à frente?
  **R:** No clique, somando fila e transcrição, com o resumo final separando a parte da fila (opção a). Confirmadas a RN-01 e o RF-06, este promovido a Must.
- **Q:** Que forma o indicador de espera deve ter no ícone?
  **R:** O próprio ícone de transcrição pulsando, com a animação que já existe no código (opção c). Reescritos: RF-01, o cenário do clique e o RNF de redução de movimento.

## 10. Lacunas

- 🟡 Dependência, não dúvida: no WhatsApp real a janela abriu longe do balão (BUG-20261001-2MOY, notas do agente). Enquanto esse defeito não for corrigido, o cronômetro da janela aparece fora do lugar; o do ícone (RF-01, RF-02) não é afetado.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-10-01 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-10-01 | Sessão de esclarecimento: L-01 e L-02 resolvidas; RN-01, RF-02 e RF-06 confirmados; RF-01 reescrito; RN-07 a RN-09, RF-14 e RF-15 criados | reversa-clarify |
