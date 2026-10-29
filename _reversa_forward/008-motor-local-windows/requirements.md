# Requirements: Motor local no Windows

> Identificador: `008-motor-local-windows`
> Data: `2026-10-29`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

🟢 A feature leva o aplicativo auxiliar ao Windows 10 e 11 de 64 bits, para que o autor transcreva as mensagens de voz do WhatsApp Web também no desktop da AFLA, onde usa o navegador Brave. Hoje o aplicativo auxiliar só roda em Mac com Apple Silicon, porque a implementação do Whisper que ele usa existe apenas para esse processador. A entrega preserva o protocolo 1, as garantias de privacidade (sem rede, sem retenção, só a extensão autorizada) e a instalação por comando de terminal, sem senha de administrador. No desktop, a transcrição roda na placa de vídeo NVIDIA, e o processador assume sozinho quando a placa não puder ser usada. Com isso, o mesmo aplicativo fica pronto para servir de modo de desempenho no Windows quando a feature 007 entregar o motor composto.

## 2. Contexto a partir do legado

🟡 O projeto nasceu pelo fluxo greenfield do Reversa. Por isso não existem `architecture.md`, `domain.md`, `inventory.md` nem `code-analysis.md`. As fontes são o PRD, as specs por unidade, os adendos vigentes, os requisitos da feature 007 (pausada), a documentação do código entregue e a inspeção do desktop feita em 2026-10-29.

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/prd.md#6-restrições` | Transcrição local; alvo inicial no Mac com Apple Silicon, com máquinas sem Apple Silicon contempladas no desenho desde o início; arquitetura de portas e adaptadores. | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#4-non-goals-fora-do-escopo` | A NG-02 adiava para a etapa de distribuição os adaptadores para máquinas sem Apple Silicon (whisper.cpp ou faster-whisper). Esta feature a revoga para o Windows. | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#7-requisitos-não-funcionais` | A RNF-04 restringe a plataforma ao macOS com Apple Silicon, por exigência da biblioteca MLX. Passa a valer só para o aplicativo no Mac. | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#8-design-e-interface` | Contrato do protocolo 1: `verificar`, `estado`, `transcrever`, `resultado` e `erro`. Esta feature não o altera. | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#12-segurança-e-privacidade` | Só a extensão autorizada conecta; só as operações do protocolo; áudio só em memória ou em temporário apagado; nenhuma rede. | 🟡 |
| `_reversa_sdd/addenda/001-motor-transcricao-local.md#regras-sob-vigilância` | W001 a W024 vigiam o comportamento do aplicativo auxiliar no Mac (detalhados em `_reversa_forward/001-motor-transcricao-local/regression-watch.md`). Continuam valendo no Mac e passam a valer no Windows. | 🟢 |
| `_reversa_sdd/sdd/compatibilidade-instalacao.md#6-requisitos-funcionais` | O RF-07 pede instalação sem senha de administrador, registrada para o usuário atual; o RF-08 pede adaptador próprio para máquinas sem Apple Silicon. A OQ-02 deixava em aberto a implementação do Whisper no Windows. | 🟡 |
| `_reversa_sdd/sdd/compatibilidade-instalacao.md#9-modelo-de-dados` | Requisitos mínimos do Windows: 10 ou 11, 64 bits, x86-64, 8 GB de memória, 4 GB livres em disco. | 🟡 |
| `_reversa_sdd/addenda/005-compatibilidade-instalacao.md#resumo-da-entrega` | A página de boas-vindas já detecta o Windows de 64 bits e oferece um instalador que ainda não existe; `extension/src/onboarding/onboarding.ts` trata a ausência exibindo falha de download. | 🟢 |
| `_reversa_forward/007-motor-whisper-navegador/requirements.md#5-requisitos-funcionais` | O RF-19 da feature 007 mantém o aplicativo auxiliar como modo de desempenho, com o motor no navegador como reserva. A 007 está pausada desde 2026-10-29, na etapa do plano. | 🟡 |
| `auxiliar/README.md` (código entregue) | A instalação grava a pasta do aplicativo em `~/Library/Application Support/whispper-motor/` e o manifesto só na pasta do Chrome; o identificador da extensão vem da `key` do `extension/manifest.json`; há comandos de instalar, desinstalar e diagnosticar; o ffmpeg decodifica o áudio com prazo, formatos fechados e limite de CPU. | 🟢 |
| Inspeção do desktop da AFLA em 2026-10-29 (`ssh afla-desktop`) | Windows 11 Pro; Intel Core i7-11700, 8 núcleos; 32 GB; NVIDIA GTX 1050 Ti de 4 GB; Python 3.13, Git, Node, Chrome e Brave 1.98 (perfil `Default`) instalados; ffmpeg ausente. Bitwarden e Granola registram seus aplicativos nativos tanto em `HKCU\Software\Google\Chrome\NativeMessagingHosts` quanto em `HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts`. | 🟢 |
| Driver de vídeo do desktop (`nvidia-smi`, 2026-10-29) | Driver 582.28, da série R580, anunciada pela NVIDIA como a última com suporte à arquitetura Pascal da GTX 1050 Ti. A geração 13 das bibliotecas de cálculo da NVIDIA já não suporta essa arquitetura, de modo que a aceleração depende da geração 12. A confirmar na investigação do plano. | 🟡 |
| Decisão do usuário em 2026-10-29 | Versão nativa do aplicativo auxiliar para Windows, transcrevendo com o faster-whisper no processador, em vez de uma ponte até o Mac ou de esperar a feature 007; ciclo completo do Reversa; uso no Brave. Na sessão de esclarecimento: Brave só no Windows e aceleração pela placa de vídeo já nesta feature. | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Usuário técnico (autor, médico) no desktop Windows da AFLA | Ler os áudios dos pacientes também quando trabalha no desktop, sem ouvi-los e sem que o áudio saia da máquina | Abre o WhatsApp Web no Brave, transcreve uma mensagem de voz de 1 min de um paciente e lê o texto na janela da extensão, como faz no Mac. |
| Usuário técnico no Mac | Seguir transcrevendo no Mac sem nenhuma mudança perceptível | Depois da entrega, reinstala o aplicativo auxiliar no Mac e transcreve como antes, com o mesmo tempo de resposta. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** No Windows, a transcrição é inteiramente local, como no Mac: nenhum áudio, texto ou dado de mensagem sai do computador, e o aplicativo auxiliar não abre conexão de rede. 🟢
   - Origem no legado: `_reversa_sdd/prd.md#6-restrições` (transcrição local) e `_reversa_sdd/sdd/motor-transcricao-local.md#6-requisitos-funcionais` (RF-12)
   - Tipo: alterada (a regra passa a valer também no Windows)
2. **RN-02:** O aplicativo auxiliar passa a ter duas plataformas: macOS em Mac com Apple Silicon e Windows 10 ou 11 de 64 bits em processador x86-64. Cada plataforma usa a implementação do Whisper adequada ao seu processador, com o mesmo modelo de referência, o Whisper large-v3-turbo. No Windows, o cálculo roda na placa de vídeo NVIDIA quando ela puder ser usada. 🟢
   - Origem no legado: `_reversa_sdd/sdd/motor-transcricao-local.md#4-non-goals-fora-do-escopo` (NG-02) e `#7-requisitos-não-funcionais` (RNF-04)
   - Tipo: alterada
3. **RN-03:** O protocolo entre a extensão e o aplicativo auxiliar continua o mesmo. A extensão não distingue a plataforma em que o aplicativo roda, e nenhuma mudança da extensão é exigida para transcrever no Windows. 🟡
   - Origem no legado: `_reversa_sdd/sdd/motor-transcricao-local.md#8-design-e-interface` (protocolo 1) e W001
   - Tipo: nova (restrição explícita sobre o contrato existente)
4. **RN-04:** O registro do aplicativo auxiliar vale para cada navegador do usuário em que a extensão roda. No Windows, são o Chrome e o Brave; no Mac, continua só o Chrome. Em todos, só a extensão de identificador fixo é autorizada. 🟡
   - Origem no legado: `_reversa_sdd/sdd/compatibilidade-instalacao.md#6-requisitos-funcionais` (RF-07, registro no Chrome do usuário atual) e `_reversa_sdd/sdd/motor-transcricao-local.md#6-requisitos-funcionais` (RF-14)
   - Tipo: alterada (passa a incluir o Brave no Windows)
5. **RN-05:** A instalação no Windows não exige senha de administrador e não acessa a rede. O download do modelo e a instalação das dependências ficam fora do aplicativo; o instalador apenas informa, com o comando exato, o que falta. 🟢
   - Origem no legado: W016 e `auxiliar/README.md#instalação`
   - Tipo: alterada (estende ao Windows)
6. **RN-06:** O trabalho no Windows não pode alterar o comportamento no Mac. As regras vigiadas W001 a W024 seguem atendidas no Mac depois da entrega. 🟡
   - Origem no legado: `_reversa_sdd/addenda/001-motor-transcricao-local.md#regras-sob-vigilância`
   - Tipo: nova
7. **RN-07:** A placa de vídeo acelera, mas não é condição para transcrever. Quando ela não puder ser usada, o aplicativo auxiliar transcreve no processador, sem intervenção do usuário, e registra o motivo. 🟡
   - Origem no legado: `_reversa_sdd/sdd/motor-transcricao-local.md#11-edge-cases-e-tratamento-de-erros` (EC-08, falha ao carregar o modelo)
   - Tipo: nova

## 5. Requisitos Funcionais

Termos usados abaixo: **aplicativo auxiliar** é o programa local que o navegador inicia para a extensão e que transcreve o áudio; **trabalhador** é o processo filho do aplicativo auxiliar que mantém o modelo na memória; **decodificador** é o programa que converte o áudio recebido no formato que o modelo lê; **pasta do aplicativo** é a pasta, dentro do perfil do usuário, onde ficam a cópia do código, a configuração e os registros.

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | O aplicativo auxiliar deve rodar no Windows 10 e 11 de 64 bits e atender ao protocolo 1 com as mesmas mensagens, estados e códigos de erro do Mac. | Must | A bateria de contrato do protocolo, a mesma usada no Mac, passa no desktop da AFLA contra o aplicativo auxiliar real, sem alteração nos casos da bateria. | 🟡 |
| RF-02 | O aplicativo auxiliar deve transcrever no Windows com o Whisper large-v3-turbo, no formato exigido pela implementação do Windows, detectando o idioma de cada áudio sem configuração. | Must | A amostra sintética em português devolve idioma "pt", uma amostra em inglês devolve "en", e um áudio só de silêncio devolve texto vazio, sem frase inventada. | 🟢 |
| RF-03 | O aplicativo auxiliar deve aceitar no Windows os mesmos formatos e limites do Mac: Ogg com Opus, MP4 com AAC e MP3; até 2 h de áudio; 60 s para decodificar; só os formatos aceitos e só a própria entrada. | Must | Uma amostra de cada formato é transcrita; um manifesto de streaming rotulado como áudio recebe FALHA_NA_TRANSCRICAO sem que nenhum arquivo local seja lido. | 🟡 |
| RF-04 | O aplicativo auxiliar deve, no Windows, começar a carregar o modelo na primeira verificação, mantê-lo carregado entre pedidos e descarregá-lo após o tempo de ociosidade configurado. | Must | No registro de desempenho, a segunda transcrição da sessão não traz carregamento; com ociosidade de 1 min e nenhum pedido, aparece uma linha de descarregamento. | 🟡 |
| RF-05 | O aplicativo auxiliar deve, no Windows, atender um pedido por vez, na ordem de chegada, interromper a transcrição que passar do prazo e recriar o trabalhador. | Must | Três pedidos enviados juntos são respondidos na ordem de envio; um pedido que passa do prazo recebe erro, e o pedido seguinte é atendido. | 🟡 |
| RF-06 | O aplicativo auxiliar não deve abrir conexão de rede no Windows, nem ao carregar o modelo nem ao transcrever. | Must | Com o acesso à rede bloqueado para os processos do aplicativo, a transcrição é concluída; durante o teste, a lista de conexões do sistema não mostra conexão alguma desses processos. | 🟢 |
| RF-07 | O aplicativo auxiliar não deve deixar cópia do áudio nem do texto no Windows. O áudio que passar por arquivo temporário deve ser apagado pelo próprio sistema operacional ao fim do pedido, inclusive quando o aplicativo for encerrado à força. | Must | Após 10 pedidos, 2 deles com erro, e um encerramento forçado no meio da decodificação de um MP4, a pasta temporária do aplicativo não contém arquivo de áudio. | 🟡 |
| RF-08 | Nenhum processo filho do aplicativo auxiliar, seja o decodificador ou o trabalhador, deve continuar rodando depois que o aplicativo termina, inclusive por encerramento forçado. | Must | Encerrado à força o aplicativo durante uma transcrição longa, nenhum processo do decodificador nem do trabalhador resta 5 s depois. | 🟡 |
| RF-09 | O aplicativo auxiliar deve aceitar conexão só da extensão autorizada, conferindo a origem recebida, e ignorar os argumentos adicionais que o navegador passa ao iniciá-lo no Windows. | Must | A extensão autorizada conecta no Brave e no Chrome; a extensão intrusa de `extension/test/extensao-intrusa/` é recusada pelo Brave; uma origem divergente encerra o aplicativo com código 2 e a linha "origem recusada" no registro de diagnóstico. | 🟡 |
| RF-10 | O usuário deve poder instalar o aplicativo auxiliar no Windows por um comando de terminal, no escopo do próprio usuário e sem senha de administrador. Antes de gravar qualquer arquivo, o comando confere Windows de 64 bits, Python 3.11 ou superior com a implementação do Whisper do Windows, decodificador e modelo presentes; faltando algo, lista cada falta com o comando que a resolve, termina com código 1 e não grava nada. A falta das bibliotecas de cálculo da placa de vídeo não impede a instalação: sai como aviso, com o comando que as instala. | Must | Numa conta sem privilégio de administrador e com tudo presente, a instalação conclui; sem o modelo, nenhum arquivo nem entrada de registro é criado, e a mensagem traz o comando que baixa o modelo. | 🟢 |
| RF-11 | A instalação no Windows deve registrar o aplicativo auxiliar no Brave e no Chrome do usuário atual, autorizando apenas o identificador calculado da `key` do manifesto da extensão. | Must | Depois da instalação, as duas entradas do registro do usuário apontam para o manifesto do aplicativo, e a extensão no Brave recebe o estado "pronto". | 🟢 |
| RF-12 | O usuário deve poder desinstalar o aplicativo auxiliar no Windows por um comando que remove primeiro as duas entradas de registro, depois encerra os aplicativos desta instalação em execução, informando o identificador de cada processo, e por fim apaga a pasta do aplicativo, preservando o cache de modelos. | Must | Após a desinstalação, a verificação na extensão responde MOTOR_INDISPONIVEL, e não resta entrada de registro nem arquivo do aplicativo fora da pasta de modelos. | 🟡 |
| RF-13 | O usuário deve poder diagnosticar a instalação no Windows por um comando que confere as entradas de registro dos dois navegadores, o manifesto, o lançador, a configuração e, por fim, inicia o aplicativo como o navegador o inicia e espera o estado "pronto", informando se o modelo carregou na placa de vídeo ou no processador. | Should | Cada item sai como "ok" ou "falha", com o detalhe; o item final nomeia o dispositivo e, no processador, o motivo; o comando termina com código 0 só quando todos passam. | 🟡 |
| RF-14 | O aplicativo auxiliar deve manter no Windows os mesmos registros locais sem conteúdo do Mac: desempenho limitado às 1 000 linhas mais recentes e diagnóstico podado acima de 1 MiB, ambos na pasta do aplicativo, legíveis só pelo usuário dono do perfil. | Should | Após 5 pedidos, o registro de desempenho tem 5 linhas de pedido sem palavra transcrita; nenhum dos dois registros contém trecho de texto, nome de arquivo ou conteúdo de mensagem. | 🟡 |
| RF-15 | O usuário deve poder escolher o modelo no arquivo de configuração do aplicativo auxiliar no Windows, e a reinstalação deve preservar a escolha. | Should | Trocar o modelo na configuração e reconectar a extensão muda o modelo informado na verificação; reinstalar mantém o modelo escolhido. | 🟡 |
| RF-16 | A entrega não deve alterar o comportamento do aplicativo auxiliar no Mac. | Must | No Mac, as suítes de testes do aplicativo auxiliar e da extensão terminam sem falha, e, após reinstalar, o diagnóstico passa em todos os itens. | 🟡 |
| RF-17 | A suíte de testes do aplicativo auxiliar deve rodar no Windows; cada teste que dependa de recurso exclusivo de uma plataforma deve aparecer como ignorado, com o motivo nomeando a plataforma, e nunca como falha. | Must | No desktop da AFLA, a suíte termina sem falha, e cada teste ignorado exibe o motivo. | 🟡 |
| RF-18 | O desktop da AFLA deve ficar pronto para uso: projeto clonado, extensão compilada e carregada no Brave, aplicativo auxiliar instalado e uma mensagem de voz real transcrita no WhatsApp Web. | Must | Na aceitação manual, o autor transcreve no Brave do desktop uma mensagem de voz real e lê o texto na janela da extensão. | 🟢 |
| RF-19 | No Windows, o aplicativo auxiliar deve carregar o modelo e transcrever na placa de vídeo NVIDIA, quando houver uma suportada pelo driver e pelas bibliotecas de cálculo instaladas. | Must | No desktop da AFLA, o registro de diagnóstico informa a placa de vídeo como dispositivo do carregamento, e o monitor da NVIDIA mostra o processo do trabalhador ocupando memória da placa durante uma transcrição. | 🟡 |
| RF-20 | Quando a placa de vídeo não puder ser usada no carregamento do modelo (sem placa NVIDIA, driver ou bibliotecas de cálculo ausentes ou incompatíveis, memória da placa insuficiente), o aplicativo auxiliar deve carregar o modelo no processador, sem intervenção do usuário, e registrar o motivo no registro de diagnóstico, sem conteúdo de mensagem. A escolha vale até o próximo carregamento, que tenta a placa de novo. | Must | Com as bibliotecas de cálculo da placa fora do alcance do aplicativo, a verificação chega a "pronto", a amostra sintética é transcrita, e o registro de diagnóstico traz o motivo do uso do processador. | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | No máximo 10 s de processamento por minuto de áudio, com o modelo carregado na placa de vídeo do desktop da AFLA, aferido pelo registro de desempenho com as amostras de `amostras/`. No processador, modo de reserva, não há meta: o tempo apenas fica registrado. | `_reversa_sdd/sdd/motor-transcricao-local.md#7-requisitos-não-funcionais` (RNF-01, mesma meta no Mac) | 🟡 |
| Desempenho | O modelo fica pronto em até 180 s após a primeira verificação, com o disco frio, o mesmo prazo admitido pelos testes contra o aplicativo real no Mac. | `extension/README.md#testes` | 🟡 |
| Segurança | O modelo de ameaça é o mesmo do Mac: página do WhatsApp semiconfiável, áudio de terceiros como entrada hostil, aplicativo nativo local. A revisão de segurança da extensão e do aplicativo auxiliar roda antes de fechar a feature, sem achado de severidade alta em aberto. | `_reversa_sdd/sdd/motor-transcricao-local.md#12-segurança-e-privacidade` | 🟡 |
| Privacidade | 0 conexões de rede do aplicativo auxiliar e 0 arquivos de áudio ou texto remanescentes após cada pedido, também no Windows. Os dados de mensagens de pacientes são dados sensíveis pela Lei Geral de Proteção de Dados (LGPD, art. 5º, II) e não saem do computador. | RN-01; `_reversa_sdd/prd.md#6-restrições` (compliance) | 🟢 |
| Compatibilidade | Windows 10 (versão 22H2) e 11, de 64 bits, em processador x86-64; Brave e Chrome em versão estável; Python 3.11 a 3.13. Aceleração em placa NVIDIA de arquitetura Pascal ou mais nova, com as bibliotecas de cálculo da geração 12; as demais placas usam o processador. O Mac com Apple Silicon continua suportado sem mudança. | `_reversa_sdd/sdd/compatibilidade-instalacao.md#9-modelo-de-dados`; inspeção do desktop | 🟡 |
| Memória | Com o modelo carregado, o aplicativo auxiliar ocupa no máximo 4 GB da memória do computador, metade do mínimo de 8 GB exigido, e no máximo 3 GB dos 4 GB da placa de vídeo, que também atende à tela. | `_reversa_sdd/sdd/compatibilidade-instalacao.md#9-modelo-de-dados`; inspeção do desktop | 🟡 |
| Observabilidade | Os mesmos registros do Mac, com o mesmo formato, de modo que a mesma leitura do registro de desempenho sirva às duas plataformas. | `auxiliar/README.md#registros` | 🟢 |
| Manutenibilidade | As regras do protocolo, da privacidade e da fila de pedidos têm uma única implementação, comum às duas plataformas; só o que depende do sistema operacional ou da implementação do Whisper muda por plataforma. Assim, uma correção numa plataforma não deixa a outra para trás. | RN-06; W001 a W024 | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Transcrição de uma mensagem de voz real no Brave do desktop (RF-01, RF-02, RF-18)
  Dado o desktop da AFLA com o aplicativo auxiliar instalado e a extensão carregada no Brave
  E o WhatsApp Web aberto no Brave há pelo menos 30 s
  Quando o autor pede a transcrição de uma mensagem de voz de 1 min de um paciente
  Então o texto aparece na janela da extensão, com o idioma "pt"
  E o registro de desempenho mostra no máximo 10 s de processamento para esse pedido

Cenário: Formatos aceitos e entrada maliciosa (RF-03)
  Dado o aplicativo auxiliar pronto no Windows
  Quando recebe uma amostra em Ogg com Opus, uma em MP4 com AAC e uma em MP3
  Então as três são transcritas
  E, quando recebe um manifesto de streaming rotulado como "audio/ogg", responde FALHA_NA_TRANSCRICAO sem ler arquivo local

Cenário: Modelo mantido e depois descarregado por ociosidade (RF-04)
  Dado o aplicativo auxiliar com ociosidade configurada em 1 min
  Quando duas transcrições são feitas em seguida e depois nenhum pedido chega por 1 min
  Então a segunda transcrição não traz carregamento no registro de desempenho
  E o registro ganha uma linha de descarregamento

Cenário: Fila e prazo (RF-05)
  Dado o aplicativo auxiliar pronto no Windows
  Quando três pedidos são enviados juntos e o primeiro passa do prazo de transcrição
  Então o primeiro recebe erro, os outros dois são respondidos na ordem de envio
  E o trabalhador é recriado sem intervenção

Cenário: Sem rede (RF-06)
  Dado o desktop com o acesso à rede bloqueado para os processos do aplicativo e o modelo já no disco
  Quando o autor transcreve a amostra sintética em português
  Então a transcrição é concluída
  E a lista de conexões do sistema não mostra conexão dos processos do aplicativo durante o teste

Cenário: Encerramento forçado no meio de uma decodificação (RF-07, RF-08)
  Dado o aplicativo auxiliar decodificando um áudio MP4 longo
  Quando o processo do aplicativo é encerrado à força
  Então, 5 s depois, não resta processo do decodificador nem do trabalhador
  E a pasta temporária do aplicativo não contém arquivo de áudio

Cenário: Extensão intrusa no Brave (RF-09)
  Dado o aplicativo auxiliar registrado no Brave
  Quando a extensão de teste sem a chave autorizada tenta se conectar
  Então o Brave recusa a conexão com "Access to the specified native messaging host is forbidden."

Cenário: Origem divergente chega ao aplicativo (RF-09)
  Dado o aplicativo auxiliar iniciado com uma origem diferente da autorizada e com o argumento adicional da janela-mãe
  Quando ele confere a origem
  Então encerra com código 2, sem carregar o modelo
  E o registro de diagnóstico ganha a linha "origem recusada"

Cenário: Instalação completa sem administrador (RF-10, RF-11)
  Dada uma conta do Windows sem privilégio de administrador, com Python, decodificador e modelo presentes
  Quando o usuário roda o comando de instalação
  Então as entradas de registro do Brave e do Chrome apontam para o manifesto do aplicativo
  E a extensão no Brave recebe o estado "pronto"

Cenário: Instalação recusada por falta do modelo (RF-10)
  Dado o Windows sem o modelo na pasta de modelos
  Quando o usuário roda o comando de instalação
  Então o comando termina com código 1, lista a falta com o comando que baixa o modelo
  E nenhum arquivo nem entrada de registro é criado

Cenário: Desinstalação com aplicativo em execução (RF-12)
  Dado o aplicativo auxiliar instalado e conectado à extensão no Brave
  Quando o usuário roda o comando de desinstalação
  Então o comando informa o identificador do processo encerrado
  E não resta entrada de registro nem arquivo do aplicativo fora da pasta de modelos
  E a verificação seguinte na extensão responde MOTOR_INDISPONIVEL

Cenário: Diagnóstico com uma entrada de registro ausente (RF-13)
  Dado o aplicativo instalado e a entrada do Brave apagada à mão
  Quando o usuário roda o comando de diagnóstico
  Então o item do registro do Brave sai como "falha", com o detalhe
  E o comando termina com código diferente de 0

Cenário: Registros sem conteúdo (RF-14)
  Dado o aplicativo auxiliar no Windows após 5 transcrições
  Quando o autor abre os registros de desempenho e de diagnóstico
  Então o de desempenho tem 5 linhas de pedido, sem palavra transcrita
  E nenhum dos dois contém trecho de texto, nome de arquivo ou conteúdo de mensagem

Cenário: Troca de modelo preservada na reinstalação (RF-15)
  Dado o modelo trocado no arquivo de configuração por outro presente no disco
  Quando a extensão reconecta e, depois, o usuário reinstala o aplicativo
  Então a verificação informa o modelo escolhido nas duas ocasiões

Cenário: Mac sem regressão (RF-16)
  Dado o Mac do autor com o código desta feature
  Quando as suítes do aplicativo auxiliar e da extensão rodam e o aplicativo é reinstalado
  Então nenhuma suíte tem falha
  E o diagnóstico passa em todos os itens

Cenário: Transcrição na placa de vídeo (RF-19)
  Dado o desktop da AFLA com a placa NVIDIA e as bibliotecas de cálculo instaladas
  Quando o aplicativo auxiliar carrega o modelo e transcreve a amostra sintética em português
  Então o registro de diagnóstico informa a placa de vídeo como dispositivo
  E o monitor da NVIDIA mostra o trabalhador ocupando memória da placa durante a transcrição

Cenário: Reserva no processador sem as bibliotecas da placa (RF-20)
  Dado o desktop com as bibliotecas de cálculo da placa fora do alcance do aplicativo
  Quando a extensão pede a verificação e depois a transcrição da amostra sintética
  Então a verificação chega a "pronto" e a amostra é transcrita
  E o registro de diagnóstico traz o motivo do uso do processador, sem conteúdo de mensagem

Cenário: Suíte no Windows sem falha (RF-17)
  Dado o projeto clonado no desktop da AFLA
  Quando a suíte de testes do aplicativo auxiliar roda
  Então ela termina sem falha
  E cada teste ignorado exibe o motivo, nomeando a plataforma
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 a RF-03 | Must | Sem eles não há transcrição no Windows. |
| RF-04, RF-05 | Must | Garantem a latência e a ordem já entregues no Mac. |
| RF-06 a RF-09 | Must | São as garantias de privacidade e de autorização; os áudios são de pacientes. |
| RF-10 a RF-12 | Must | Instalação e remoção sem administrador, no Brave, é o que torna o uso possível no desktop. |
| RF-16, RF-17 | Must | Evitam que o Windows quebre o Mac e mantêm a suíte confiável nas duas plataformas. |
| RF-18 | Must | É o objetivo do usuário: usar a transcrição no desktop. |
| RF-19, RF-20 | Must | Decisão do usuário: a placa de vídeo entra já nesta feature para cumprir a meta de latência, e a reserva no processador evita que uma falha da placa deixe o desktop sem transcrição. |
| RF-13 a RF-15 | Should | Úteis para manter e ajustar, mas o uso diário não depende deles. |
| RNF de desempenho | Must | A meta de 10 s por minuto é a mesma do produto. |
| Instalador gráfico assinado para Windows (`.exe`) | Won't | Serve ao usuário leigo, na etapa de distribuição; exige certificado de assinatura (OQ-03 da spec de compatibilidade). |
| Página de boas-vindas guiando a instalação no Windows | Won't | A página segue oferecendo um instalador inexistente e tratando a falha; muda junto com o instalador gráfico ou com a feature 007. |
| Registro do aplicativo no Brave do Mac | Won't | No Mac, o autor usa o Chrome; decidido na sessão de esclarecimento de 2026-10-29. |
| Placas de vídeo de outros fabricantes (AMD, Intel) | Won't | O desktop tem placa NVIDIA; as demais placas usam o processador. |
| Linux, Mac com Intel e outros navegadores (Edge, Opera) | Won't | Fora do uso atual do autor. |

## 9. Esclarecimentos

### Sessão 2026-10-29

- **Q:** No Mac, o aplicativo auxiliar também deve ser registrado no Brave? Hoje a instalação no Mac só o registra no Chrome, e a extensão está carregada só no Chrome do Mac.
  **R:** Não (opção a). No Mac o autor continua no Chrome; o Brave fica só no Windows. Aplicado na RN-04 e na seção 8.
- **Q:** Se o desktop não cumprir a meta de 10 s de processamento por minuto de áudio só com o processador, qual saída: modelo menor, meta mais folgada, placa de vídeo à parte ou decidir depois da medição?
  **R:** Placa de vídeo, já nesta feature (opção c, com "usar GPU agora"). Aplicado no resumo, na RN-02, na nova RN-07, nos RF-10, RF-13, RF-19 e RF-20, nos requisitos não funcionais de desempenho, memória e compatibilidade, nos cenários e na seção 8. A reserva automática no processador (RN-07, RF-20) foi acrescentada pelo redator, para que uma falha da placa não deixe o desktop sem transcrição.

## 10. Lacunas

Nenhuma lacuna em aberto. As duas lacunas da versão inicial foram resolvidas na sessão de 2026-10-29 (seção 9).

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-10-29 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-10-29 | Sessão de esclarecimento: Brave só no Windows; aceleração pela placa de vídeo nesta feature, com reserva no processador (RN-07, RF-19, RF-20) | reversa |

## Pendências de Qualidade

- **Q-018 (nomes de produto):** o documento nomeia Windows, Brave, Chrome, Python, NVIDIA e o modelo Whisper large-v3-turbo, porque a feature consiste justamente em levar o aplicativo a essa plataforma e a esses navegadores. A escolha da implementação do Whisper no Windows, decisão do usuário, aparece só na seção 2; os requisitos a tratam como "implementação do Whisper do Windows".
