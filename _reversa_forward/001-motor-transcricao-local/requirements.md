# Requirements: Motor de transcrição local

> Identificador: `001-motor-transcricao-local`
> Data: `2026-09-30`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

🟡 A feature entrega ao usuário técnico, num Mac com Apple Silicon, a transcrição local de mensagens de voz a pedido da extensão, sem abrir o terminal a cada áudio. Compõe-se do aplicativo auxiliar, que roda o Whisper na máquina e mantém o modelo carregado; do adaptador do motor, que oferece ao núcleo o contrato de transcrição; e da extensão mínima que hospeda esse adaptador. Resolve a premissa 2 do PRD, segundo a qual a extensão, sozinha, não executa programas na máquina, e reduz a uma chamada os cerca de cinco passos manuais do fluxo atual. O ícone no WhatsApp Web, a fila do núcleo e a janela flutuante ficam para as features seguintes.

**Termos usados neste documento**

- **Aplicativo auxiliar:** programa instalado à parte no Mac, que recebe o áudio da extensão e o transcreve com o Whisper.
- **Native Messaging:** mecanismo do Chrome que permite a uma extensão trocar mensagens com um programa instalado na máquina, desde que o programa esteja registrado no Chrome e autorize aquela extensão.
- **Núcleo:** parte da extensão que coordena os pedidos de transcrição (spec `nucleo-transcricao`, feature futura).
- **Porta:** contrato pelo qual o núcleo conversa com uma parte externa sem conhecer sua implementação; o **adaptador** é a implementação concreta de uma porta. Aqui, a porta é `MotorDeTranscricao`.
- **Pedido:** uma solicitação de transcrição de um áudio, identificada por `idPedido`.
- **Verificação:** consulta ao estado do motor, sem áudio.
- **Modelo:** arquivo de pesos do Whisper; modelos maiores transcrevem melhor e levam mais tempo.
- **MiB:** mebibyte, 1 048 576 bytes.

## 2. Contexto a partir do legado

🟡 O projeto é greenfield: não há sistema legado extraído, e `architecture.md`, `domain.md`, `inventory.md`, `code-analysis.md`, `addenda/` e `.reversa/principles.md` não existem. A ancoragem vem dos artefatos gerados pelo `/reversa-new`, todos com selo 🟡 PLANEJADO, confidência que esta feature herda.

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/sdd/motor-transcricao-local.md#6. Requisitos Funcionais` | RF-01 a RF-17 do motor, base direta dos requisitos desta feature | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#8. Design e Interface` | Contrato de mensagens do protocolo 1 entre extensão e aplicativo auxiliar | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#11. Edge Cases e Tratamento de Erros` | EC-01 a EC-10: aplicativo ausente, queda, modelo ausente, áudio corrompido, silêncio, limite de tamanho, versões, memória, tempo esgotado, origem não autorizada | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#12. Segurança e Privacidade` | Origem autorizada, operações restritas ao protocolo, nenhum conteúdo retido | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#14. Open Questions` | OQ-01 a OQ-04, resolvidas na seção 9 ou encaminhadas na seção 10 | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#15. Decisões Tomadas (Decision Log)` | Escolhas do usuário: aplicativo auxiliar via Native Messaging, detecção automática de idioma, um pedido por vez, sem rede, modelo carregado durante a sessão | 🟡 |
| `_reversa_sdd/sdd/nucleo-transcricao.md#10. Integrações e Dependências` | Contrato da porta `MotorDeTranscricao`: `verificar()` com pronto, iniciando ou indisponível; `transcrever(audio, tipoDeMidia)` com texto e idioma, ou código de erro e motivo | 🟡 |
| `_reversa_sdd/sdd/nucleo-transcricao.md#6. Requisitos Funcionais` | RF-18 (o núcleo verifica o motor ao carregar a aba) e RF-19 (motor indisponível encerra o pedido em curso e a fila com MOTOR_INDISPONIVEL) | 🟡 |
| `_reversa_sdd/sdd/nucleo-transcricao.md#14. Open Questions` | OQ-01: piso de latência para áudios curtos | 🟡 |
| `_reversa_sdd/prd.md#3. Métricas de sucesso` | Latência de até 10 s por minuto de áudio em três meses | 🟡 |
| `_reversa_sdd/prd.md#6. Restrições` | Transcrição local na primeira versão; arquitetura de portas e adaptadores | 🟡 |
| `_reversa_sdd/prd.md#8. Riscos` | Premissa 2: nenhum caminho até o Whisper concilia latência e instalação simples | 🟡 |
| `_reversa_sdd/personas.md#Persona 1: usuário técnico` | Já transcreve com o mlx-whisper no terminal; o fluxo manual resolve, mas exige vários passos por áudio | 🟡 |

**Divergências entre as fontes, resolvidas neste documento**

1. 🟡 **Vocabulário de estados.** A spec do motor descreve o aplicativo auxiliar nos estados "pronto", "carregando" e "erro" (RF-08 do motor), enquanto a porta declarada pelo núcleo usa "pronto", "iniciando" e "indisponível". Prevalece o vocabulário da porta, e o adaptador traduz os estados do aplicativo (RN-06).
2. 🟡 **Modelo ausente.** A spec do motor devolve FALHA_NA_TRANSCRICAO aos pedidos quando o modelo não é encontrado (EC-03 do motor), mas o núcleo encerra com MOTOR_INDISPONIVEL todos os pedidos quando o motor se declara indisponível (RF-19 do núcleo). Prevalece o núcleo: FALHA_NA_TRANSCRICAO fica reservada à falha de um áudio específico (RN-06).
3. 🟡 **Campos do registro de desempenho.** O RF-17 do motor cita três colunas, e o modelo de dados da mesma spec (§9) acrescenta o resultado de cada pedido. Prevalece o modelo de dados, acrescido de uma linha por carregamento de modelo, sem a qual o objetivo G-02 do motor (nenhum carregamento a partir da segunda transcrição) não é aferível (RF-17 deste documento).
4. 🟡 **Limite de tamanho.** O RNF-02 do motor fixa "áudio de até 64 MiB por pedido", mas o limite do Native Messaging se aplica à mensagem inteira. Como o protocolo 1 transporta o áudio em base64, que aumenta o tamanho em um terço, o áudio aceito fica em torno de 48 MiB (RF-18 deste documento). Uma mensagem de voz de 5 min ocupa menos de 1 MiB, de modo que o limite não afeta o uso previsto.

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| 🟡 Usuário técnico (persona 1 do PRD) | Transcrever áudios do WhatsApp Web sem baixar o arquivo e rodar o Whisper no terminal | Instala o aplicativo auxiliar uma única vez por comando de terminal; daí em diante, cada pedido da extensão é atendido com o modelo já carregado, várias vezes ao dia, durante o trabalho |
| 🟡 Núcleo da extensão (consumidor do contrato, feature futura) | Pedir transcrições e conhecer o estado do motor sem depender de sua implementação | Chama `verificar()` quando a aba do WhatsApp Web carrega e `transcrever()` a cada clique, e recebe texto e idioma ou um código de erro com motivo |
| 🟡 Usuário leigo (persona 2 do PRD) | Fora desta feature | Atendido na etapa de distribuição, pela spec `compatibilidade-instalacao` |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** O áudio é processado exclusivamente na máquina do usuário: o aplicativo auxiliar não abre conexão de rede ao verificar o estado nem ao transcrever, e o comando de instalação também não, pois usa o modelo já presente no disco (esclarecimento de 2026-09-30). 🟡
   - Origem: `_reversa_sdd/prd.md#6. Restrições`; `_reversa_sdd/sdd/motor-transcricao-local.md#12. Segurança e Privacidade`
   - Tipo: nova
2. **RN-02:** Nenhuma cópia do áudio ou do texto sobrevive ao pedido. O que for gravado em disco temporariamente é apagado ao fim de cada pedido, com sucesso ou erro, e nenhum registro do aplicativo guarda conteúdo transcrito ou trecho de áudio. 🟡
   - Origem: `_reversa_sdd/sdd/motor-transcricao-local.md#6. Requisitos Funcionais` (RF-13) e `#12. Segurança e Privacidade`
   - Tipo: nova
3. **RN-03:** O motor atende um pedido por vez, na ordem de chegada. 🟡
   - Origem: `_reversa_sdd/sdd/motor-transcricao-local.md#15. Decisões Tomadas (Decision Log)`
   - Tipo: nova
4. **RN-04:** Só a extensão autorizada no registro do aplicativo auxiliar no Chrome pode acioná-lo, e ele executa apenas as operações do protocolo, verificar e transcrever. Não executa comandos nem lê arquivos indicados na mensagem. 🟡
   - Origem: `_reversa_sdd/sdd/motor-transcricao-local.md#12. Segurança e Privacidade`
   - Tipo: nova
5. **RN-05:** Extensão e aplicativo auxiliar só conversam na mesma versão de protocolo, numerada por inteiro; havendo diferença, o pedido é recusado sem tentativa de transcrição. Toda mudança incompatível no contrato incrementa a versão. 🟡
   - Origem: `_reversa_sdd/sdd/motor-transcricao-local.md#7. Requisitos Não-Funcionais` (RNF-05)
   - Tipo: nova
6. **RN-06:** O estado do motor chega ao núcleo no vocabulário da porta: "pronto" quando o modelo está carregado; "iniciando" enquanto o aplicativo inicia ou carrega o modelo; "indisponível", com motivo, quando o aplicativo não está instalado, não responde ou está em erro (modelo ausente, memória insuficiente, dependência ausente). Com o motor indisponível, todo pedido recebe MOTOR_INDISPONIVEL com o motivo; FALHA_NA_TRANSCRICAO designa apenas a falha de um áudio específico. 🟡
   - Origem: `_reversa_sdd/sdd/nucleo-transcricao.md#10. Integrações e Dependências` (porta `MotorDeTranscricao`) e `#6. Requisitos Funcionais` (RF-19)
   - Tipo: alterada, em relação a `_reversa_sdd/sdd/motor-transcricao-local.md#11. Edge Cases e Tratamento de Erros` (EC-03) e ao vocabulário do RF-08 do motor
7. **RN-07:** Depois de uma queda do aplicativo auxiliar, o motor tenta reconectar uma única vez, no pedido seguinte, antes de se declarar indisponível. 🟡
   - Origem: `_reversa_sdd/sdd/motor-transcricao-local.md#6. Requisitos Funcionais` (RF-10)
   - Tipo: nova
8. **RN-08:** O modelo é carregado uma vez por conexão e permanece na memória enquanto a conexão com a extensão estiver aberta e houver pedido de transcrição nos últimos 30 min. Após 30 min sem pedido, o modelo é descarregado e volta a ser carregado na verificação ou no pedido seguinte, que então não cumpre a meta de latência (esclarecimento de 2026-09-30). 🟡
   - Origem: `_reversa_sdd/sdd/motor-transcricao-local.md#15. Decisões Tomadas (Decision Log)` e `#14. Open Questions` (OQ-02)
   - Tipo: nova

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | O adaptador do motor deve oferecer ao núcleo exatamente duas operações: `verificar()`, que devolve o estado do motor, e `transcrever(audio, tipoDeMidia)`, que devolve texto, idioma detectado, duração do áudio e tempo de processamento, ou um código de erro com motivo (motor RF-01). | Must | A mesma bateria de testes de contrato passa contra o adaptador real, ligado ao aplicativo auxiliar, e contra um adaptador simulado, sem alteração nos testes. | 🟡 |
| RF-02 | O sistema deve detectar automaticamente o idioma de cada áudio, sem configuração prévia (motor RF-02). | Must | Um áudio em português devolve o idioma "pt" e um áudio em inglês devolve "en". | 🟡 |
| RF-03 | O sistema deve transcrever áudio Ogg com codificação Opus, formato das mensagens de voz do WhatsApp (motor RF-03). | Must | Dez mensagens de voz reais, de 5 s a 5 min, são transcritas sem erro. | 🟡 |
| RF-04 | O sistema deve transcrever também áudio MP4 com AAC e áudio MP3 (motor RF-04). | Should | Um arquivo de cada formato é transcrito sem erro. | 🟡 |
| RF-05 | O sistema deve manter o modelo carregado na memória entre transcrições enquanto a conexão com a extensão estiver aberta, ressalvado o descarregamento por ociosidade do RF-23 (motor RF-05, RN-08). | Must | Em cinco transcrições seguidas na mesma conexão, com intervalos inferiores a 30 min, o registro de desempenho contém uma única linha de carregamento de modelo. | 🟡 |
| RF-06 | O sistema deve iniciar o aplicativo auxiliar e o carregamento do modelo na primeira verificação, sem esperar um pedido de transcrição; pedidos recebidos durante o carregamento aguardam o fim dele e são atendidos na ordem de chegada (motor RF-06). O disparo da verificação ao abrir a aba do WhatsApp Web cabe ao núcleo (núcleo RF-18). | Should | 30 s após a primeira verificação, a primeira transcrição não gera linha de carregamento no registro; um pedido feito durante o carregamento é concluído depois dele, sem erro. | 🟡 |
| RF-07 | O sistema deve processar um pedido por vez, na ordem de chegada (motor RF-07, RN-03). | Must | Três pedidos enviados juntos são respondidos na ordem de envio, e o aplicativo nunca processa dois pedidos ao mesmo tempo. | 🟡 |
| RF-08 | O aplicativo auxiliar deve responder à verificação com a versão do protocolo, a versão do aplicativo, o modelo configurado e o estado, com o motivo quando houver; o adaptador traduz esse estado para o vocabulário da porta (motor RF-08, RN-06). | Must | A resposta contém os quatro campos; com o modelo ausente, o núcleo recebe "indisponível" com o motivo "modelo não encontrado". | 🟡 |
| RF-09 | O sistema deve recusar com VERSAO_INCOMPATIVEL o pedido cuja versão de protocolo difira da do aplicativo auxiliar, informando as duas versões (motor RF-09, RN-05). | Must | Um aplicativo com protocolo 2 recusa um pedido com protocolo 1 e informa as duas versões. | 🟡 |
| RF-10 | O sistema deve devolver MOTOR_INDISPONIVEL, com a instrução de instalação, quando o aplicativo auxiliar não estiver instalado, não iniciar ou encerrar a conexão, tentando reconectar uma vez no pedido seguinte antes de devolver o erro (motor RF-10, EC-01, EC-02, RN-07). | Must | Sem o aplicativo instalado, a verificação devolve "indisponível" e o pedido recebe MOTOR_INDISPONIVEL com a instrução; com o processo encerrado à força durante uma transcrição, esse pedido recebe o erro, e o pedido seguinte reconecta e é atendido. | 🟡 |
| RF-11 | O sistema deve devolver FALHA_NA_TRANSCRICAO, com motivo, quando um áudio não puder ser decodificado, estiver vazio ou o Whisper falhar nele, permanecendo apto para o pedido seguinte (motor RF-11, EC-04). | Must | Um arquivo corrompido e um arquivo de 0 bytes devolvem o erro com o motivo "áudio ilegível", e o pedido seguinte é transcrito normalmente. | 🟡 |
| RF-12 | O sistema deve funcionar sem acesso à rede, usando modelo já presente no disco (motor RF-12, RN-01). | Must | Com a rede desligada, verificação e transcrição são concluídas, e o monitor de conexões do sistema registra 0 conexões do aplicativo auxiliar. | 🟡 |
| RF-13 | O sistema não deve manter cópia do áudio nem do texto após responder; arquivos temporários, se usados, são apagados ao fim de cada pedido, com sucesso ou erro (motor RF-13, RN-02). | Must | Após 10 pedidos, 2 deles com erro, a pasta temporária do aplicativo está vazia, e nenhum arquivo do aplicativo contém trecho do áudio ou do texto transcrito. | 🟡 |
| RF-14 | O sistema deve aceitar conexões apenas da extensão cujo identificador consta no registro do aplicativo auxiliar no Chrome (motor RF-14, EC-10, RN-04). | Must | Uma segunda extensão de teste que tenta se conectar é recusada pelo Chrome, e o aplicativo não é iniciado para ela. | 🟡 |
| RF-15 | O sistema deve usar por padrão o modelo whisper-large-v3-turbo em formato MLX e permitir escolher outro num arquivo de configuração do aplicativo auxiliar (motor RF-15 e OQ-01; esclarecimento de 2026-09-30). | Should | Sem modelo definido na configuração, a verificação informa o whisper-large-v3-turbo; trocar o modelo no arquivo e reabrir a conexão muda o modelo informado. | 🟡 |
| RF-16 | O usuário deve poder instalar e desinstalar o aplicativo auxiliar por um comando de terminal, que verifica os pré-requisitos (Mac com Apple Silicon, versão do Python, ffmpeg, biblioteca do Whisper e modelo configurado presente na pasta de modelos já usada pelo mlx-whisper) e registra ou remove o aplicativo no Chrome, sem acessar a rede (motor RF-16, §10; esclarecimento de 2026-09-30). | Must | Após a instalação, a verificação responde "pronto"; faltando um pré-requisito, o comando recusa a instalação e nomeia o que falta e, se faltar o modelo, mostra o comando para baixá-lo; após a desinstalação, a verificação devolve "indisponível", e não resta arquivo do aplicativo fora da pasta de modelos. | 🟡 |
| RF-17 | O sistema deve gravar um registro local de desempenho, sem conteúdo, com uma linha por pedido (instante, duração do áudio, tempo de processamento e resultado) e uma linha por carregamento ou descarregamento de modelo (instante, evento e, no carregamento, a duração), limitado a 1 000 linhas e descartando as mais antigas (motor RF-17 e §9). | Should | Após 5 pedidos numa conexão nova, o registro tem 1 linha de carregamento e 5 linhas de pedido, sem nenhuma palavra transcrita; com 1 000 linhas, uma nova linha descarta a mais antiga. | 🟡 |
| RF-18 | O adaptador do motor deve recusar, antes do envio, o áudio cuja mensagem de pedido exceda o limite de 64 MiB do Native Messaging, com FALHA_NA_TRANSCRICAO e o motivo "áudio maior que o limite" (motor EC-06 e RNF-02; ver divergência 4 da seção 2). | Must | Um áudio de 50 MiB recebe o erro sem que o aplicativo auxiliar receba mensagem; um áudio de 1 MiB é enviado normalmente. | 🟡 |
| RF-19 | O sistema deve declarar o motor "indisponível", com o motivo "sem resposta", quando o aplicativo auxiliar não responder à verificação em 10 s, e repetir a verificação no pedido seguinte (motor EC-09). | Must | Com um aplicativo simulado que não responde, a verificação devolve "indisponível" em 10 s, com tolerância de 1 s, e o pedido seguinte dispara nova verificação. | 🟡 |
| RF-20 | O sistema deve devolver resultado com texto vazio, e não erro, quando o áudio não contiver fala (motor EC-05). | Must | Um áudio de 10 s de silêncio devolve resultado sem código de erro e com texto vazio. | 🟡 |
| RF-21 | O aplicativo auxiliar deve responder com erro de motivo "mensagem inválida" à mensagem malformada ou de tipo desconhecido, sem encerrar e sem executar outra ação (derivado de RN-04). | Must | Uma mensagem sem o campo "tipo" e outra com tipo "executar" recebem o erro, e a verificação seguinte responde "pronto". | 🟡 |
| RF-22 | A feature deve incluir a extensão mínima, sem interface, que hospeda o adaptador do motor no processo de segundo plano e mantém o mesmo identificador entre recarregamentos, condição da autorização do RF-14 (derivado do escopo desta feature). | Must | Carregada no Chrome sem empacotamento, removida e carregada de novo, a extensão mantém o identificador, e a verificação feita a partir dela responde "pronto". | 🟡 |
| RF-23 | O sistema deve descarregar o modelo após 30 min sem pedido de transcrição e recarregá-lo na verificação ou no pedido seguinte; durante o recarregamento, a verificação informa "iniciando" (motor OQ-02, RN-08; esclarecimento de 2026-09-30). | Should | Após 30 min sem pedido, com tolerância de 1 min, o registro contém uma linha de descarregamento; a verificação seguinte informa "iniciando" e depois "pronto", e o registro ganha nova linha de carregamento. | 🟡 |
| RF-24 | O aplicativo auxiliar deve interromper a transcrição que ultrapassar o prazo máximo por pedido, o maior entre 60 s e 30 s por minuto de áudio (núcleo RNF-02), devolver FALHA_NA_TRANSCRICAO com o motivo "prazo excedido" e seguir para o próximo pedido, ainda que a interrupção exija recarregar o modelo (esclarecimento de 2026-09-30). | Must | Com um áudio de 1 min e uma transcrição simulada que não termina, o pedido recebe o erro em 60 s, com tolerância de 2 s; o pedido seguinte é atendido, e um eventual recarregamento aparece no registro. | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | Tempo de processamento de cada áudio de até o maior entre 2 s e 10 s por minuto de áudio, com o modelo carregado, no Mac do usuário técnico (M1 com 16 GiB), aferido pela prova de conceito com as dez mensagens do RF-03. O piso de 2 s deixa 1 s ao núcleo e à página, para que o tempo do clique ao texto caiba em 3 s nos áudios curtos. | `_reversa_sdd/prd.md#3. Métricas de sucesso`; motor RNF-01 e §13; núcleo OQ-01; esclarecimento de 2026-09-30 | 🟡 |
| Desempenho | Nenhum carregamento de modelo da segunda transcrição em diante, na mesma conexão, enquanto não houver 30 min sem pedido. | Motor G-02; RN-08 | 🟡 |
| Capacidade | Mensagem de até 64 MiB da extensão para o aplicativo e resposta de até 1 MB no sentido contrário. | Limites do Native Messaging; motor RNF-02 | 🟡 |
| Segurança | 0 conexões de rede abertas pelo aplicativo auxiliar durante a verificação e a transcrição, verificável com o monitor de conexões do sistema. | Motor RNF-03, RN-01 | 🟡 |
| Segurança | O aplicativo auxiliar executa só as operações do protocolo e aceita só a origem autorizada. | Motor §12, RN-04 | 🟡 |
| Privacidade | Nenhum registro do aplicativo, seja de desempenho, de erro ou de diagnóstico, contém trecho de áudio ou de texto transcrito. | Motor §12, RN-02 | 🟡 |
| Plataforma | macOS em Mac com Apple Silicon; em outra plataforma, o comando de instalação recusa e informa o motivo. | Motor RNF-04: exigência da biblioteca MLX | 🟡 |
| Compatibilidade | Protocolo versionado por número inteiro, começando em 1. | Motor RNF-05, RN-05 | 🟡 |
| Manutenibilidade | Trocar o adaptador do motor não exige alteração no núcleo; o contrato da porta é coberto por testes de contrato executáveis sem o modelo real. | Motor G-05; `_reversa_sdd/prd.md#6. Restrições` (arquitetura de portas e adaptadores) | 🟡 |
| Testabilidade | Todos os estados da porta e todos os códigos de erro do contrato cobertos por testes automatizados. | Paralelo ao RNF-06 do núcleo, que exige 100% das transições cobertas | 🟡 |
| Observabilidade | O registro de desempenho é revisado ao fim da primeira e da quarta semana de uso, contra a meta de latência. | Motor §13 | 🟡 |

## 7. Critérios de Aceitação

```gherkin
# language: pt

# RF-01, RF-08, RF-22
Cenário: Verificação com o motor pronto
  Dado o aplicativo auxiliar instalado e a extensão mínima carregada no Chrome
  E o modelo configurado presente no disco
  Quando o adaptador do motor executa verificar()
  Então a resposta traz a versão do protocolo, a versão do aplicativo, o modelo e o estado "pronto"

# RF-06
Cenário: Carregamento antecipado na primeira verificação
  Dado o aplicativo auxiliar instalado e ainda não iniciado
  Quando o adaptador executa a primeira verificação
  Então o estado informado é "iniciando" e passa a "pronto" ao fim do carregamento
  E um pedido feito 30 s depois não gera linha de carregamento no registro de desempenho

# RF-06, RF-07
Cenário: Pedido durante o carregamento do modelo
  Dado o modelo em carregamento
  Quando o adaptador envia um pedido de transcrição
  Então o pedido aguarda o fim do carregamento e é concluído sem erro

# RF-02, RF-03, RF-05, RF-17
Cenário: Transcrição de mensagens de voz em sequência
  Dado o motor "pronto" numa conexão nova
  Quando o adaptador envia cinco mensagens de voz Ogg com Opus, em português
  Então cada resposta traz o texto, o idioma "pt", a duração do áudio e o tempo de processamento
  E o registro de desempenho contém 1 linha de carregamento e 5 linhas de pedido, sem palavras transcritas

# RF-02
Cenário: Idioma detectado sem configuração
  Dado o motor "pronto"
  Quando o adaptador envia uma mensagem de voz em inglês
  Então a resposta traz o idioma "en"

# RF-04
Cenário: Outros formatos de áudio
  Dado o motor "pronto"
  Quando o adaptador envia um áudio MP4 com AAC e outro MP3
  Então os dois são transcritos sem erro

# RF-07
Cenário: Pedidos simultâneos
  Dado o motor "pronto"
  Quando o adaptador envia três pedidos ao mesmo tempo
  Então as respostas chegam na ordem de envio
  E o aplicativo nunca processa dois pedidos ao mesmo tempo

# RF-12
Cenário: Transcrição sem rede
  Dado o motor "pronto" e a rede do Mac desligada
  Quando o adaptador envia um pedido de transcrição
  Então a transcrição é concluída
  E o monitor de conexões registra 0 conexões do aplicativo auxiliar

# RF-13
Cenário: Nenhum conteúdo retido
  Dado 10 pedidos atendidos, 2 deles com erro
  Quando se inspeciona a pasta temporária e os arquivos do aplicativo
  Então a pasta temporária está vazia e nenhum arquivo contém trecho do áudio ou do texto

# RF-10
Cenário: Aplicativo não instalado
  Dado a extensão carregada e o aplicativo auxiliar ausente
  Quando o adaptador executa verificar() e depois envia um pedido
  Então a verificação devolve "indisponível"
  E o pedido recebe MOTOR_INDISPONIVEL com a instrução de instalação

# RF-10
Cenário: Queda do aplicativo durante a transcrição
  Dado uma transcrição em curso
  Quando o processo do aplicativo auxiliar é encerrado à força
  Então o pedido em curso recebe MOTOR_INDISPONIVEL
  E o pedido seguinte reconecta uma vez e é atendido

# RF-09
Cenário: Versões de protocolo diferentes
  Dado um aplicativo auxiliar com protocolo 2
  Quando chega um pedido com protocolo 1
  Então o pedido é recusado com VERSAO_INCOMPATIVEL, informando as duas versões, sem tentativa de transcrição

# RF-08
Cenário: Modelo ausente no disco
  Dado o arquivo do modelo configurado removido do disco
  Quando o adaptador executa verificar() e depois envia um pedido
  Então a verificação devolve "indisponível" com o motivo "modelo não encontrado"
  E o pedido recebe MOTOR_INDISPONIVEL com o mesmo motivo, sem download automático

# RF-11
Cenário: Áudio corrompido ou vazio
  Dado o motor "pronto"
  Quando o adaptador envia um arquivo corrompido e depois um arquivo de 0 bytes
  Então cada um recebe FALHA_NA_TRANSCRICAO com o motivo "áudio ilegível"
  E o pedido seguinte é transcrito normalmente

# RF-18
Cenário: Áudio acima do limite do canal
  Dado o motor "pronto"
  Quando o núcleo pede a transcrição de um áudio de 50 MiB
  Então o adaptador devolve FALHA_NA_TRANSCRICAO com o motivo "áudio maior que o limite"
  E o aplicativo auxiliar não recebe mensagem

# RF-19
Cenário: Verificação sem resposta
  Dado um aplicativo simulado que não responde
  Quando o adaptador executa verificar()
  Então em 10 s, com tolerância de 1 s, o estado devolvido é "indisponível" com o motivo "sem resposta"
  E o pedido seguinte dispara nova verificação

# RF-20
Cenário: Áudio sem fala
  Dado o motor "pronto"
  Quando o adaptador envia 10 s de silêncio
  Então a resposta é um resultado com texto vazio, sem código de erro

# RF-21
Cenário: Mensagem inválida
  Dado o motor "pronto"
  Quando o aplicativo recebe uma mensagem sem o campo "tipo" e outra com tipo "executar"
  Então cada uma recebe erro com o motivo "mensagem inválida"
  E a verificação seguinte responde "pronto"

# RF-14
Cenário: Extensão não autorizada
  Dado o aplicativo auxiliar registrado para a extensão mínima
  Quando uma segunda extensão de teste tenta se conectar a ele
  Então o Chrome recusa a conexão e o aplicativo não é iniciado para essa origem

# RF-15
Cenário: Modelo padrão e troca pela configuração
  Dado o aplicativo auxiliar instalado sem modelo definido na configuração
  Quando o adaptador executa verificar()
  Então a verificação informa o whisper-large-v3-turbo
  E, depois de o usuário trocar o modelo no arquivo de configuração e a conexão ser reaberta, a verificação informa o novo modelo

# RF-16
Cenário: Instalação e desinstalação por comando
  Dado um Mac com Apple Silicon que atende aos pré-requisitos
  Quando o usuário executa o comando de instalação
  Então a verificação responde "pronto"
  E, depois do comando de desinstalação, a verificação devolve "indisponível" e não resta arquivo do aplicativo fora da pasta de modelos

# RF-16
Cenário: Pré-requisito ausente na instalação
  Dado um Mac sem o ffmpeg instalado
  Quando o usuário executa o comando de instalação
  Então o comando recusa a instalação e informa que o ffmpeg está ausente

# RF-22
Cenário: Identificador estável da extensão
  Dado a extensão mínima carregada no Chrome sem empacotamento
  Quando ela é removida e carregada de novo
  Então o identificador permanece o mesmo e a verificação responde "pronto"

# RF-16
Cenário: Modelo ausente na instalação
  Dado o modelo configurado ausente da pasta de modelos
  Quando o usuário executa o comando de instalação
  Então o comando recusa a instalação, sem acessar a rede, e mostra o comando para baixar o modelo

# RF-23
Cenário: Descarregamento por ociosidade
  Dado o motor "pronto" e nenhum pedido há 30 min
  Quando o prazo de ociosidade se completa
  Então o modelo é descarregado e o registro ganha uma linha de descarregamento
  E a verificação seguinte informa "iniciando" e depois "pronto"

# RF-24
Cenário: Transcrição que não termina
  Dado um áudio de 1 min e uma transcrição simulada que não termina
  Quando o prazo de 60 s se esgota
  Então o pedido recebe FALHA_NA_TRANSCRICAO com o motivo "prazo excedido"
  E o pedido seguinte é atendido

# RNF de desempenho
Cenário: Latência na prova de conceito
  Dado o motor "pronto" com o whisper-large-v3-turbo no M1 do usuário técnico
  Quando o adaptador envia as dez mensagens de voz do RF-03, de 5 s a 5 min
  Então o processamento de cada uma leva até o maior entre 2 s e 10 s por minuto de áudio

# RF-01
Cenário: Contrato independente da implementação
  Dado a bateria de testes de contrato da porta MotorDeTranscricao
  Quando ela é executada contra o adaptador real e contra o adaptador simulado
  Então passa nos dois casos, sem alteração nos testes
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Contrato de que o núcleo depende; sem ele, as features seguintes não se apoiam no motor. |
| RF-02 | Must | Decisão do usuário: detecção automática de idioma. |
| RF-03 | Must | Formato das mensagens de voz do WhatsApp, caso de uso central. |
| RF-04 | Should | Cobre áudios encaminhados como arquivo, menos frequentes. |
| RF-05 | Must | Sem ele, o carregamento a cada áudio inviabiliza a meta de latência. |
| RF-06 | Should | Evita o carregamento no primeiro clique; o produto funciona sem ele, com o primeiro pedido mais lento. |
| RF-07 | Must | O hardware de aceleração é compartilhado; pedidos paralelos somariam latência. |
| RF-08 | Must | O núcleo e o painel dependem do estado para orientar o usuário. |
| RF-09 | Must | Impede resultados imprevisíveis quando extensão e aplicativo divergem. |
| RF-10 | Must | Falha mais provável no uso diário, que precisa de aviso claro e recuperação. |
| RF-11 | Must | Um áudio problemático não pode derrubar o motor. |
| RF-12 | Must | Privacidade, restrição do PRD para a primeira versão. |
| RF-13 | Must | Privacidade: os áudios são de terceiros. |
| RF-14 | Must | Impede que outro software use o aplicativo para transcrever. |
| RF-15 | Should | Permite equilibrar qualidade e velocidade sem reinstalar. |
| RF-16 | Must | Único caminho de instalação da primeira etapa. |
| RF-17 | Should | Meio de aferir a meta de latência sem telemetria. |
| RF-18 | Must | Sem a recusa prévia, o Chrome derruba a conexão ao exceder o limite. |
| RF-19 | Must | Sem prazo, o núcleo esperaria indefinidamente por um aplicativo travado. |
| RF-20 | Must | Silêncio é situação comum e não é falha. |
| RF-21 | Must | Robustez e segurança do canal entre extensão e aplicativo. |
| RF-22 | Must | Sem a extensão hospedeira, o Native Messaging não pode ser exercitado nem autorizado. |
| RF-23 | Should | Libera cerca de 1,5 GB de memória com o WhatsApp Web aberto o dia inteiro; o produto funciona sem ele. |
| RF-24 | Must | Sem interrupção, um áudio travado bloqueia todos os pedidos seguintes. |
| RNF de desempenho (latência) | Must | Métrica central do PRD e critério da prova de conceito. |
| RNF de segurança e privacidade | Must | Restrição do PRD e natureza dos dados. |
| RNF de manutenibilidade | Must | Diretriz do usuário: arquitetura de portas e adaptadores. |
| RNF de observabilidade | Should | Revisão periódica, sem efeito no funcionamento. |

## 9. Esclarecimentos

### Sessão 2026-09-30

Fatos verificados no ambiente antes das perguntas: Mac M1 com 16 GiB; mlx-whisper instalado no Python 3.14 do python.org; ffmpeg instalado pelo Homebrew; modelos tiny, base, small, medium, large-v3-turbo, turbo e large-v3 já presentes no cache local de modelos; a skill de transcrição manual do usuário usa hoje o whisper-medium-mlx, com idioma fixo em português. O usuário adotou as cinco opções recomendadas.

- **Q:** Qual modelo o motor usa por padrão? (D-01)
  - **R:** whisper-large-v3-turbo em formato MLX (1,5 GB), de qualidade próxima à do large-v3 e mais rápido que o medium. Aplicado em RF-15, no RNF de desempenho e no cenário de latência.
- **Q:** Como o modelo chega ao disco? (D-01)
  - **R:** O aplicativo usa o cache de modelos já existente e nunca acessa a rede; faltando o modelo, o comando de instalação recusa e mostra como baixá-lo. Aplicado em RN-01 e RF-16.
- **Q:** O modelo deve sair da memória após um tempo sem uso? (D-02)
  - **R:** Sim, após 30 min sem pedido de transcrição. Aplicado em RN-08, RF-05, RF-17 e no novo RF-23.
- **Q:** Qual o tempo mínimo aceito para áudios curtos? (D-03)
  - **R:** Processamento do motor de até o maior entre 2 s e 10 s por minuto de áudio, deixando 1 s ao núcleo e à página para caber em 3 s do clique ao texto. Aplicado no RNF de desempenho.
- **Q:** O que fazer quando uma transcrição não termina?
  - **R:** Interromper ao fim do prazo do núcleo, o maior entre 60 s e 30 s por minuto de áudio, aceitando recarregar o modelo se a interrupção exigir. Aplicado no novo RF-24.

## 10. Lacunas

Nenhuma dúvida pendente: D-01, D-02 e D-03 foram resolvidas na sessão de esclarecimentos de 2026-09-30 (seção 9).

**Pendências encaminhadas a outras etapas, sem bloquear o plano**

- 🟡 Linguagem e empacotamento do aplicativo auxiliar (motor OQ-03): decisão técnica do `/reversa-plan`. A spec propõe Python, reaproveitando a biblioteca do Whisper que o usuário já usa.
- 🟡 Ambiente de execução do aplicativo: reaproveitar a instalação atual do mlx-whisper ou criar ambiente próprio. Decisão do `/reversa-plan`, sujeita ao critério de desinstalação sem resíduos do RF-16. Hoje o mlx-whisper está instalado no Python 3.14 do python.org, e não no Python do Homebrew, que é o primeiro `python3` do PATH.
- 🟡 Texto espúrio em trechos sem fala: o Whisper tende a produzir frases inexistentes em silêncio ou ruído, o que contraria o RF-20. O `/reversa-plan` deve prever o tratamento.
- 🟡 Exibição do motivo de MOTOR_INDISPONIVEL na janela: pela RN-06, o modelo ausente passa a chegar como MOTOR_INDISPONIVEL, cuja mensagem na spec da janela não mostra o motivo (`_reversa_sdd/sdd/janela-flutuante.md`). Ajuste a registrar na feature da janela.
- 🟡 Piso do núcleo: ao especificar a feature do núcleo, confirmar no OQ-01 do núcleo o piso de 3 s do clique ao texto, coerente com o RNF de desempenho desta feature.
- 🟡 Origem dos pesos do modelo na etapa de distribuição (motor OQ-04): fora desta feature.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-09-30 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-09-30 | Sessão de esclarecimentos: D-01, D-02 e D-03 resolvidas; RN-01, RN-08, RF-05, RF-15, RF-16, RF-17 e RNF de desempenho reescritos; RF-23 e RF-24 acrescentados | reversa-clarify |

## Pendências de Qualidade

- **Q-018 (nomes de produto e biblioteca):** o documento cita Whisper, mlx-whisper, MLX, Chrome, Native Messaging, ffmpeg, Python e formatos de áudio. A citação é deliberada: são restrições já decididas pelo usuário no PRD (§6) e no registro de decisões da spec do motor (§15), não soluções escolhidas por este documento. A escolha de linguagem, empacotamento e estrutura interna permanece com o `/reversa-plan`.
