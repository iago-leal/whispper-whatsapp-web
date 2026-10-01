# Requirements: Janela Flutuante de Transcrição

> Identificador: `003-janela-flutuante`
> Data: 2026-10-01
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

A janela flutuante de transcrição é a interface de exibição do Whispper ancorada diretamente aos balões de mensagem de voz no WhatsApp Web. Ela implementa a porta `ExibicaoDeTranscricao`, suporta até 20 janelas simultâneas sem sobreposição desordenada, acompanha o scroll da conversa em tempo real com indicador visual de conexão (seta/conector), exibe os estados de progresso ("Na fila", "Transcrevendo com cronômetro", "Concluído" com botão de cópia, e "Erro" com tentativa de reexecução), respeita o tema claro/escuro e pode ser fechada individualmente via clique ou tecla Esc.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|---|---|---|
| `_reversa_sdd/prd.md#4. Escopo (in)` | Janela flutuante ancorada ao áudio de origem; várias janelas abertas ao mesmo tempo para áudios fragmentados; fechamento individual. | 🟡 |
| `_reversa_sdd/sdd/janela-flutuante.md#6. Requisitos Funcionais` | RF-01 a RF-15: posicionamento lateral/inferior, prevenção de colisões, estados de UI, botão de cópia, suporte a tema e acessibilidade. | 🟡 |
| `_reversa_sdd/sdd/nucleo-transcricao.md#8. Design e Interface` | Contrato da porta `ExibicaoDeTranscricao`. | 🟡 |
| `_reversa_sdd/addenda/002-integracao-whatsapp-web.md` | Rastreador de âncoras geométricas (`CoordenadasAncora`) e content script injetado em `web.whatsapp.com`. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---|---|---|
| Usuário pessoal / técnico | Ler sequência de múltiplos áudios curtos picados sem precisar ouvi-los | Clica em três áudios consecutivos na conversa. Três janelas abrem-se empilhadas harmoniosamente sem colisão; conforme cada áudio é processado, o texto surge ao lado da respectiva mensagem. |
| Usuário geral / trabalho | Copiar trechos de áudios recebidos para notas ou respostas | Visualiza o texto transcrito em fonte confortável, clica em "Copiar" para colar em outra janela ou fecha com Esc. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** Cada mensagem de voz possui no máximo uma janela de transcrição aberta simultaneamente. Se o usuário clicar novamente no ícone de uma mensagem que já possui janela, esta recebe foco e destaque visual temporário. 🟡
2. **RN-02:** A janela deve se manter visualmente ligada ao seu balão de origem, ocultando-se quando o balão sair do viewport e reaparecendo quando ele retornar. 🟡
3. **RN-03:** Em caso de colisão geométrica vertical com outra janela já aberta, a janela mais recente é deslocada para baixo mantendo conector visual até seu balão. 🟡
4. **RN-04:** O fechamento de uma janela não cancela o processamento em background, mas descarta a visualização ativa na tela. 🟡
5. **RN-05:** Cores e contrastes devem respeitar o tema claro ou escuro configurado na interface do WhatsApp Web (WCAG 2.1 AA). 🟢

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|---|---|---|---|---|
| RF-01 | Posicionar janela ao lado do balão (à direita para recebidos, à esquerda para enviados), com topo alinhado. | Must | Margem de 8 px em relação ao balão e topos nivelados. | 🟡 |
| RF-02 | Fallback de posicionamento: se o espaço lateral for < 320 px, posicionar abaixo do balão sem cobri-lo. | Must | Em viewports estreitos a janela posiciona-se logo abaixo do balão. | 🟡 |
| RF-03 | Acompanhamento de rolagem e redimensionamento via `CoordenadasAncora`. | Must | Janela move-se sem defasagem perceptível (60 fps) e oculta-se fora da tela. | 🟡 |
| RF-04 | Isolamento por conversa: ocultar janelas ao trocar de conversa e reexibir ao retornar. | Must | Troca de chat não vaza janelas da conversa anterior. | 🟡 |
| RF-05 | Resolução de colisão vertical para até 20 janelas simultâneas. | Must | Nenhuma janela sobrepõe o conteúdo textual de outra janela. | 🟡 |
| RF-06 | Exibir estados informados pelo núcleo: Fila, Transcrevendo (com cronômetro), Concluído e Erro. | Must | Interface reage dinamicamente às mensagens de progresso emitidas pelo núcleo. | 🟡 |
| RF-07 | Largura de 320 px, altura automática até 240 px e scroll interno para textos longos. | Must | Áudios de vários minutos não extrapolam a altura máxima de 240 px. | 🟡 |
| RF-08 | Botão "Copiar" com feedback visual de 2 segundos ("Copiado!"). | Should | Clique copia o texto integral para a área de transferência do sistema operacional. | 🟡 |
| RF-09 | Fechamento individual por botão [X] ou tecla `Esc`. | Must | Fechar remove a janela do DOM e emite evento `janelaFechada(idAudio)`. | 🟢 |
| RF-10 | Realce visual (highlight de 1 s) ao solicitar foco em janela já aberta. | Should | Re-clique no ícone aplica brilho/borda temporária na janela existente. | 🟡 |
| RF-11 | Mensagem informativa "Nenhuma fala reconhecida" quando o áudio transcrito for vazio. | Must | Áudios de silêncio exibem o aviso em vez de caixa vazia. | 🟢 |
| RF-12 | Adaptação automática a tema claro e escuro do WhatsApp Web. | Should | Mudança de tema do WhatsApp atualiza fundo, bordas e textos das janelas. | 🟡 |
| RF-13 | Botão "Tentar de novo" exibido no estado de erro, notificando o núcleo para reprocessar. | Should | Clique despacha novo pedido de transcrição sem fechar a janela. | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|---|---|---|---|
| Desempenho | Tempo de renderização inicial da janela ≤ 150 ms após solicitação. | Interatividade imediata perceptível pelo usuário. | 🟡 |
| Desempenho | 0 tarefas longas (> 50 ms) durante a rolagem com até 20 janelas abertas. | Mantém o WhatsApp Web suave e sem engasgos. | 🟢 |
| Acessibilidade | Contraste mínimo de 4.5:1 nos temas claro e escuro; navegável por teclado. | Conformidade com WCAG 2.1 AA. | 🟢 |
| Estabilidade Visual | Estilos da janela contidos e prefixados (`whispper-janela-*`) para zero vazamento no WhatsApp. | Não desconfigura a interface original do mensageiro. | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Abertura e exibição de janela flutuante
  Dado que o usuário solicitou a transcrição de uma mensagem de voz
  Quando o núcleo emite o evento de início
  Então a janela flutuante surge ancorada ao balão da mensagem em até 150 ms
  E exibe o estado "Transcrevendo..." com cronômetro decorrido

Cenário: Conclusão da transcrição com sucesso
  Dado que a transcrição do áudio terminou com sucesso
  Quando o texto é entregue à janela flutuante
  Então a janela exibe o texto transcrito
  E exibe o botão "Copiar"
  E permite fechar clicando no X ou pressionando Esc

Cenário: Detecção de colisão entre múltiplas janelas
  Dado que duas mensagens de áudio consecutivas foram transcritas
  Quando as janelas são posicionadas lado a lado
  Então a segunda janela é deslocada verticalmente para não sobrepor a primeira
  E exibe uma linha conectora ligando-a ao seu balão de origem
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|---|---|---|
| RF-01, RF-02, RF-03, RF-05, RF-06, RF-07, RF-09, RF-11 | Must | Estrutura fundamental da janela: ancoragem, exibição de estados, texto e fechamento. |
| RF-04, RF-08, RF-10, RF-12, RF-13 | Should | Conforto de uso: cópia rápida, re-tentativa, temas e foco. |

## 9. Esclarecimentos

> Modo autônomo ativo. Nenhuma sessão interativa realizada.

## 10. Lacunas

Nenhuma lacuna crítica pendente. Todos os comportamentos foram fixados na especificação `_reversa_sdd/sdd/janela-flutuante.md`.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-10-01 | Versão inicial gerada por `reversa-forward-autonomous` | reversa-requirements |
