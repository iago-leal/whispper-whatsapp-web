# Requirements: Integração com o WhatsApp Web

> Identificador: `002-integracao-whatsapp-web`
> Data: 2026-10-01
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O adaptador do WhatsApp Web é o componente da extensão injetado em `web.whatsapp.com`. Ele localiza mensagens de voz na conversa ativa, insere um botão de ação acessível para transcrever sem alterar o layout da página, intercepta e entrega o áudio decifrado (sem som e sem marcar como reproduzido) para o núcleo da extensão via porta `FonteDeAudio`, e emite eventos de reprodução, remoção e ancoragem geométrica para a janela flutuante. Concentra 100% dos seletores de DOM em um módulo isolado com detecção automática de estado degradado em caso de mudanças no WhatsApp Web.

## 2. Contexto a partir do legado

| Fonte | Trecho relevante | Confidência |
|---|---|---|
| `_reversa_sdd/prd.md#4. Escopo (in)` | Extensão Chrome MV3; ícone em cada mensagem de áudio; transcrição sob demanda; janela flutuante ancorada. | 🟡 |
| `_reversa_sdd/sdd/integracao-whatsapp-web.md#6. Requisitos Funcionais` | RF-01 a RF-16: injeção de ícone, extração de áudio decifrado, detecção de estado degradado, isolamento de seletores. | 🟡 |
| `_reversa_sdd/sdd/nucleo-transcricao.md#8. Design e Interface` | Contrato da porta `FonteDeAudio` implementado pelo adaptador. | 🟡 |
| `_reversa_sdd/addenda/001-motor-transcricao-local.md` | Entrega do motor local offline e da extensão base MV3 com serviço em background. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---|---|---|
| Usuário pessoal / técnico | Transcrever mensagens de áudio longas ou prolixas diretamente na interface do WhatsApp Web | Ao abrir uma conversa no WhatsApp Web, visualiza o botão de transcrição ao lado de cada áudio. Ao clicar, o áudio é processado localmente sem emitir som e sem marcar como ouvido. |
| Atendente / usuário comum | Ler áudios sem perder o foco visual na conversa | Identifica facilmente o botão em mensagens recebidas e encaminhadas, acionando via clique ou atalho de teclado acessível. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** O adaptador só deve ser executado no contexto de origem `https://web.whatsapp.com/*`. 🟢
2. **RN-02:** Mensagens de voz marcadas como visualização única não recebem botão de transcrição. 🟡
3. **RN-03:** A obtenção do áudio para transcrição não deve acionar o player audível do WhatsApp nem marcar o áudio como reproduzido (azul) para o remetente. 🟡
4. **RN-04:** Um seletor de DOM quebrado ou ausente deve colocar o adaptador em estado "degradado", emitindo aviso estruturado e cessando novas injeções sem travar o WhatsApp Web. 🟡
5. **RN-05:** Todo seletor de DOM, classe CSS ou heurística de identificação de nós da página do WhatsApp Web deve residir exclusivamente no módulo de configuração de estruturas. 🟢
6. **RN-06:** Cada mensagem de voz possui um identificador estável durante toda a sessão da aba, preservado em rolagens e trocas de conversa. 🟡

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|---|---|---|---|---|
| RF-01 | Inserir botão de transcrição em cada mensagem de voz visível na conversa (recebida, enviada ou encaminhada). | Must | Todas as mensagens de voz carregadas exibem o botão sem sobreposição de controles nativos. | 🟡 |
| RF-02 | Manter exatamente um botão por mensagem, gerenciando mutações de DOM por rolagem e renderização virtualizada. | Must | Rolagem contínua não duplica nem remove indevidamente botões das mensagens ativas. | 🟡 |
| RF-03 | Inserir botão em até 500 ms após a mensagem de voz aparecer no viewport. | Must | Medição de latência de injeção p95 ≤ 500 ms. | 🟡 |
| RF-04 | Atribuir identificador estável à mensagem de voz derivado de metadados da página. | Must | Mesma mensagem conserva identificador idêntico ao rolar a lista ou alternar conversas. | 🟡 |
| RF-05 | Emitir evento de clique com identificador e direção (recebido/enviado) sem disparar o player do WhatsApp. | Must | Clique no botão não emite áudio pelos alto-falantes e não altera botão nativo de play. | 🟡 |
| RF-06 | Extrair os bytes do áudio decifrado, tipo de mídia (`audio/ogg`, `audio/mp4`, etc.) e duração em segundos. | Must | Dados do áudio entregues à porta `FonteDeAudio` são decodificáveis com fidelidade e sem som. | 🟡 |
| RF-07 | Não alterar o estado de reprodução no aparelho do remetente ao capturar o áudio. [DÚVIDA] | Must | Confirmação de que o status de não reproduzido é preservado após a extração. | 🟡 |
| RF-08 | Emitir evento de reprodução iniciada quando o usuário der play nativo no WhatsApp. | Should | Notificação enviada ao núcleo quando o player da página toca o áudio. | 🟡 |
| RF-09 | Emitir evento de mensagem removida se o remetente apagar a mensagem para todos. | Should | Disparo do evento em ≤ 2 s após a detecção de deleção do nó no DOM. | 🟡 |
| RF-10 | Fornecer e atualizar coordenadas geométricas (retângulo de âncora) e visibilidade da mensagem para a janela flutuante. | Must | Eventos de scroll e resize recalculam e notificam a posição correta da âncora. | 🟡 |
| RF-11 | Módulo de verificação estrutural (saúde dos seletores) com transição para estado degradado e log sem conteúdo sensível. | Must | Falha em seletor crítico desativa injeção e relata nome da estrutura ausente em ≤ 10 s. | 🟡 |
| RF-12 | Acessibilidade: rótulo `aria-label="Transcrever áudio"`, foco via teclado (`Tab`), ativação por `Enter`/`Espaço`. | Should | Leitor de tela anuncia ação e navegação por teclado opera normalmente. | 🟡 |
| RF-13 | Módulo único de configuração contendo seletores, versão e data de verificação. | Must | Zero referências a seletores de DOM fora do módulo `configuracao-estruturas.ts`. | 🟢 |
| RF-14 | Posicionamento estético do botão no balão da mensagem (antes do controle de play ou ao lado do timer). [DÚVIDA] | Should | Botão integrado harmoniosamente ao balão sem quebrar o layout nativo. | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|---|---|---|---|
| Desempenho | 0 tarefas do content script acima de 50 ms no thread principal da página (Long Tasks). | Evita travamento ou degradação de responsividade do WhatsApp Web. | 🟡 |
| Desempenho | Obtenção do áudio em ≤ 1 s para mensagens de até 5 minutos já armazenadas em cache pelo navegador. | Garante início célere da transcrição. | 🟡 |
| Estabilidade | Altura e largura do balão de mensagem inalterados (tolerância máxima de 2 px). | Preserva integridade visual do WhatsApp Web. | 🟡 |
| Robustez | Captura de 100% das exceções do adaptador; zero erros não tratados no console global da página. | Não polui o console nem afeta scripts do WhatsApp. | 🟢 |
| Segurança / Privacidade | Não ler nem persistir mensagens de texto, imagens, contatos ou tokens de autenticação. Apenas dados de áudio solicitados. | Garantia estrita de privacidade do usuário. | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Inserção de botão em nova mensagem de áudio
  Dado que a conversa ativa no WhatsApp Web contém uma mensagem de voz recebida
  Quando a mensagem é renderizada na viewport
  Então um botão "Transcrever áudio" é inserido junto ao player em até 500 ms
  E o balão de mensagem mantém suas dimensões visuais originais

Cenário: Clique para transcrição sem reprodução audível
  Dado que o botão de transcrição de uma mensagem não ouvida está visível
  Quando o usuário clica no botão ou pressiona Enter com o foco nele
  Então o evento de solicitação é despachado para a extensão com os bytes do áudio
  E nenhum som é emitido pelo WhatsApp Web
  E a mensagem permanece marcada como não reproduzida

Cenário: Mudança de interface do WhatsApp Web (estado degradado)
  Dado que o WhatsApp Web atualizou seu layout e um seletor essencial de mensagem não é encontrado
  Quando o módulo de verificação executa a validação estrutural
  Então o adaptador entra em estado degradado
  E cessa a tentativa de injetar botões
  E relata o nome da estrutura ausente no log interno da extensão sem lançar exceção não capturada
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|---|---|---|
| RF-01, RF-02, RF-03, RF-04, RF-05, RF-06, RF-07, RF-10, RF-11, RF-13 | Must | Núcleo fundamental da integração: detecção, injeção, extração de áudio e segurança contra quebra. |
| RF-08, RF-09, RF-12, RF-14 | Should | Sincronia de eventos de reprodução/remoção, acessibilidade e alinhamento visual fino. |

## 9. Esclarecimentos

> Nenhuma sessão de dúvidas interativa executada (modo autônomo com premissas em arquivo).

## 10. Lacunas

- 🔴 [DÚVIDA] Se o mecanismo interno da página do WhatsApp Web forçar a marcação de áudio como ouvido no momento do download de mídia não pré-carregada, a transcrição deve aceitar essa marcação ou falhar com aviso ao usuário?
- 🔴 [DÚVIDA] Posição exata do botão no balão: integrado antes do botão de play nativo ou posicionado ao final da barra de reprodução/duração?

## 11. Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-10-01 | Versão inicial gerada por `reversa-forward-autonomous` | reversa-requirements |
