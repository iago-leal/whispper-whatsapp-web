# Requirements: Motor de transcrição no navegador

> Identificador: `007-motor-whisper-navegador`
> Data: `2026-10-04`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA
> Entrada: `_reversa_sdd/brainstorms/001-lancamento-chrome-web-store/pre-spec.md` (opção B de `decision.md`)

## 1. Resumo executivo

🟡 A feature leva o motor de transcrição para dentro da extensão. O Whisper passa a rodar no próprio navegador, e a transcrição das mensagens de voz do WhatsApp Web dispensa o aplicativo auxiliar. Hoje o produto só funciona num Mac em que o ambiente de programação e as bibliotecas de áudio do aplicativo auxiliar foram instalados à mão. Com a feature, o usuário técnico, no Mac, e o usuário leigo, num notebook com Windows, passam a usá-lo instalando apenas a extensão. A primeira entrega vai à loja de extensões do Chrome como item não listado, por link, para um grupo piloto, sem cobrança.

## 2. Contexto a partir do legado

🟡 O projeto nasceu pelo fluxo greenfield do Reversa. Por isso não existem `architecture.md`, `domain.md`, `inventory.md` nem `code-analysis.md`. As fontes são o PRD, as specs por unidade, os adendos vigentes e a sessão de ideação.

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/prd.md#6-restrições` | A transcrição é local na primeira versão; a arquitetura é hexagonal (portas e adaptadores); o PRD já cita o Whisper no navegador como caminho alternativo ao aplicativo auxiliar. | 🟡 |
| `_reversa_sdd/prd.md#3-métricas-de-sucesso` | Latência ≤ 10 s por minuto de áudio e ≥ 95% das transcrições compreendidas sem ouvir o áudio; o hardware de referência da latência está em aberto. | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#4-non-goals-fora-do-escopo` | A NG-01 adiava o Whisper no navegador como adaptador futuro; esta feature a revoga. | 🟡 |
| `_reversa_sdd/sdd/motor-transcricao-local.md#6-requisitos-funcionais` | O motor atual detecta o idioma, aceita Ogg/Opus, MP4/AAC e MP3, mantém o modelo carregado, atende um pedido por vez, não guarda áudio nem texto e registra a latência sem conteúdo (RF-02 a RF-05, RF-07, RF-13 e RF-17). | 🟡 |
| `_reversa_sdd/addenda/001-motor-transcricao-local.md#impacto-por-artefato-da-extração` | O contrato `MotorDeTranscricao` (`verificar()` e `transcrever()`) está formalizado em `extension/src/dominio/motor-de-transcricao.ts`, e o adaptador local, em `extension/src/adaptadores/motor-local/`. | 🟢 |
| `_reversa_sdd/addenda/004-nucleo-transcricao.md#resumo-da-entrega` | O núcleo orquestra as quatro portas, com fila sequencial, tempo-limite e contadores anônimos. | 🟢 |
| `_reversa_sdd/addenda/005-compatibilidade-instalacao.md#resumo-da-entrega` | A página de boas-vindas tem seis etapas: privacidade, verificação de hardware antes de qualquer download, instalador, detecção do aplicativo auxiliar, modelo e teste com áudio sintético. | 🟢 |
| `_reversa_sdd/sdd/compatibilidade-instalacao.md#3-goals-objetivos` | G-01: no máximo 15 min até a primeira transcrição com conexão de 50 Mbps. G-02: incompatíveis avisados antes de qualquer download. | 🟡 |
| `_reversa_sdd/sdd/compatibilidade-instalacao.md#13-plano-de-rollout` | Publicação não listada, por link, para 5 a 10 pessoas leigas antes da listagem pública; sem telemetria. | 🟡 |
| `_reversa_sdd/sdd/integracao-whatsapp-web.md#6-requisitos-funcionais` | O player do WhatsApp deve funcionar com a extensão ativa (RF-05 a RF-07 e RF-12); o BUG-20261002-YUB4 relata o contrário e segue aberto. | 🟡 |
| `_reversa_sdd/brainstorms/001-lancamento-chrome-web-store/decision.md#decisão-do-usuário` | O usuário escolheu a opção B, motor no navegador, contra a recomendação A; prazo de duas semanas e orçamento só da taxa da loja. | 🟢 |
| `_reversa_sdd/brainstorms/001-lancamento-chrome-web-store/options.md#fatos-verificados-que-delimitam-o-espaço` | Diretrizes da Meta vedam "WhatsApp" no nome de produto de terceiros. A loja exige política de privacidade e declaração de "comunicações pessoais". Modelos que cabem no navegador têm de 41 a 249 MB. | 🟡 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Usuário técnico (autor, médico, Mac com Apple Silicon) | Seguir lendo os áudios dos pacientes sem depender do aplicativo auxiliar | Com o aplicativo auxiliar desligado, usa só o motor no navegador durante uma semana de trabalho. |
| Usuário leigo (colega do grupo piloto, notebook com Windows) | Ler os áudios de clientes ou pacientes sem instalar nada além da extensão | Abre o link não listado, instala a extensão, segue a página de boas-vindas e lê a transcrição de um áudio real no próprio WhatsApp Web. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** A transcrição continua inteiramente local; o que muda é o lugar onde roda, que passa a ser o próprio navegador. 🟡
   - Origem no legado: `_reversa_sdd/prd.md#6-restrições` (transcrição local) e `_reversa_sdd/sdd/motor-transcricao-local.md#4-non-goals-fora-do-escopo` (NG-01)
   - Tipo: alterada (a NG-01 deixa de valer; a restrição de transcrição local se mantém)
2. **RN-02:** O aplicativo auxiliar deixa de ser condição para transcrever. A extensão instalada pela loja basta para a primeira transcrição. 🟡
   - Origem no legado: `_reversa_sdd/sdd/compatibilidade-instalacao.md#5-usuários-e-personas` (a jornada futura exigia o instalador)
   - Tipo: alterada
3. **RN-03:** A única comunicação de rede do motor é o download dos pesos do modelo, do repositório público em que o modelo já está publicado, origem fixa declarada na política de privacidade. Nenhum áudio, texto ou dado do usuário acompanha esse pedido. 🟡
   - Origem no legado: `_reversa_sdd/sdd/motor-transcricao-local.md#6-requisitos-funcionais` (RF-12, isolamento de rede)
   - Tipo: alterada (o motor atual não faz nenhuma conexão)
4. **RN-04:** O computador incompatível recebe o aviso antes de qualquer download, agora com os requisitos do motor no navegador. 🟡
   - Origem no legado: `_reversa_sdd/sdd/compatibilidade-instalacao.md#3-goals-objetivos` (G-02)
   - Tipo: alterada (mudam os requisitos verificados; a regra se mantém)
5. **RN-05:** A primeira entrega é distribuída como item não listado, por link, a um grupo piloto de 5 a 10 pessoas, com pelo menos uma num notebook com Windows. Não há listagem pública nem cobrança. 🟡
   - Origem no legado: `_reversa_sdd/sdd/compatibilidade-instalacao.md#13-plano-de-rollout`
   - Tipo: nova
6. **RN-06:** O nome publicado na loja não contém a marca "WhatsApp". 🟡
   - Origem: diretrizes de marca da Meta, registradas em `_reversa_sdd/brainstorms/001-lancamento-chrome-web-store/options.md#fatos-verificados-que-delimitam-o-espaço`
   - Tipo: nova
7. **RN-07:** O piloto só começa depois de diagnosticado o BUG-20261002-YUB4. Se a extensão for a causa, ele precisa estar corrigido. Em 2026-10-04 o usuário relatou que o defeito não ocorre mais; falta encerrar o registro do bug como não reproduzido, pelo fluxo de bugs. 🟡
   - Origem no legado: `_reversa_sdd/sdd/integracao-whatsapp-web.md#6-requisitos-funcionais` (RF-12: tocar áudio continua funcionando)
   - Tipo: nova

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | O sistema deve transcrever as mensagens de voz do WhatsApp Web inteiramente dentro do navegador, sem aplicativo auxiliar instalado, atendendo ao mesmo contrato da porta do motor: verificação de estado (pronto, iniciando, indisponível) e transcrição, com texto e idioma ou código de erro. | Must | Num computador sem o aplicativo auxiliar registrado, a verificação responde "pronto" depois de preparado o modelo, e uma mensagem de voz de 1 min é transcrita. Os testes do núcleo passam com o novo motor no lugar do motor local. | 🟡 |
| RF-02 | O sistema deve aceitar áudio Ogg com codificação Opus, formato das mensagens de voz do WhatsApp, sem programa externo de conversão. | Must | Dez mensagens de voz de 5 s a 5 min são transcritas sem erro num computador sem nenhum programa de conversão de áudio instalado. | 🟡 |
| RF-03 | O sistema deve aceitar também áudio MP4/AAC e MPEG (MP3). | Should | Um arquivo de cada formato é transcrito sem erro. | 🟡 |
| RF-04 | O sistema deve detectar automaticamente o idioma de cada áudio. | Must | Um áudio em português devolve o idioma "pt", e um em inglês devolve "en", sem configuração prévia. | 🟡 |
| RF-05 | O sistema deve usar como padrão o modelo de maior qualidade que cumpra a meta de latência (RNF de desempenho) no notebook Windows de referência, conforme medido no teste da premissa. | Must | O modelo padrão e a medição que o justifica ficam registrados antes do plano, com segundos por minuto de áudio e erros que mudam o sentido nas amostras de `amostras/`. | 🟡 |
| RF-06 | O sistema deve baixar o modelo uma única vez, com progresso percentual visível, e reaproveitá-lo nas sessões seguintes. | Must | Na segunda abertura do navegador, a primeira transcrição não baixa nenhum byte do modelo, conforme o registro de rede. | 🟡 |
| RF-07 | O sistema deve conferir a integridade do modelo baixado antes de usá-lo, descartar o arquivo incompleto ou corrompido e baixá-lo de novo. | Must | Com um arquivo de modelo adulterado no armazenamento, nenhuma transcrição é feita com ele, e o download recomeça. | 🟡 |
| RF-08 | O sistema deve, quando o download falhar por rede, informar a falha em linguagem simples e oferecer nova tentativa, sem perder o que já foi baixado. | Must | Com a rede cortada a 50% do download, a página mostra a falha e o botão de nova tentativa; com a rede restabelecida, o download continua a partir do ponto em que parou. | 🟡 |
| RF-09 | O sistema deve transcrever sem acesso à rede depois de baixado o modelo. | Must | Com a rede desligada e o modelo já baixado, a transcrição é concluída. | 🟡 |
| RF-10 | O sistema não deve enviar áudio, texto nem dado do usuário pela rede em nenhuma etapa. | Must | Durante 10 transcrições, o registro de rede da extensão não mostra nenhuma requisição além do download do modelo, que não carrega dado do usuário. | 🟡 |
| RF-11 | O sistema não deve manter cópia do áudio nem do texto além do que o núcleo já guarda em memória na sessão. | Must | Depois de 10 transcrições e de fechada a aba, o armazenamento da extensão não contém áudio nem texto transcrito. | 🟡 |
| RF-12 | O sistema deve manter o modelo carregado entre transcrições enquanto houver uma aba do WhatsApp Web aberta. | Must | A segunda transcrição da sessão não inclui tempo de carregamento do modelo no registro de desempenho. | 🟡 |
| RF-13 | O sistema deve processar um pedido por vez, na ordem de chegada. | Must | Três pedidos feitos em sequência rápida são respondidos na ordem dos cliques. | 🟡 |
| RF-14 | O sistema deve devolver MOTOR_INDISPONIVEL, com motivo e instrução, quando o modelo não estiver baixado ou o computador não tiver recursos para carregá-lo, e FALHA_NA_TRANSCRICAO, com motivo, quando o áudio não puder ser decodificado. | Must | Sem modelo baixado, a janela mostra o motivo e a instrução para concluir a preparação; com um arquivo corrompido, a janela mostra "áudio ilegível". | 🟡 |
| RF-15 | O sistema deve, num computador sem aceleração gráfica disponível no navegador, seguir no modo sem aceleração se o teste da premissa mostrar que esse modo cumpre a meta de latência vigente para o notebook de referência; caso contrário, deve declarar a incompatibilidade antes de qualquer download. | Must | O registro do teste da premissa traz a medição do modo sem aceleração e o veredito; num computador sem aceleração, o usuário recebe a resposta correspondente antes do primeiro download. | 🟡 |
| RF-16 | O sistema deve mostrar, durante o carregamento do modelo, o estado "preparando" na janela flutuante e no painel da extensão, em vez de erro. | Must | Ao clicar no ícone logo depois de abrir o WhatsApp Web, a janela mostra "preparando" e, em seguida, a transcrição. | 🟡 |
| RF-17 | A página de boas-vindas deve conduzir o caminho sem aplicativo auxiliar: privacidade, verificação de compatibilidade, download do modelo com progresso, transcrição de teste com o áudio sintético e a mensagem final "Pronto: abra o WhatsApp Web". | Must | Num notebook Windows recém-preparado, o fluxo termina sem nenhum passo de instalação fora do navegador. | 🟡 |
| RF-18 | A verificação de compatibilidade deve usar os requisitos do motor no navegador: sistema operacional (Windows 10/11 de 64 bits ou macOS em Mac com Apple Silicon), memória total e espaço para o modelo. | Must | Um computador abaixo de algum requisito recebe o aviso, com o requisito citado, antes de qualquer download. | 🟡 |
| RF-19 | O sistema deve manter o aplicativo auxiliar como modo de desempenho no Mac: quando ele estiver instalado e pronto, atende aos pedidos; nos demais casos, inclusive quando deixar de responder, o motor no navegador assume, sem intervenção do usuário. O painel informa qual motor atendeu. | Must | Num Mac com o auxiliar pronto, o painel mostra o motor local; com o auxiliar desligado ou encerrado à força, o pedido seguinte é transcrito pelo motor no navegador. | 🟡 |
| RF-22 | O sistema deve liberar a fila quando o núcleo encerrar um pedido por tempo-limite, atendendo normalmente os pedidos seguintes. | Must | Com um pedido forçado a exceder o tempo-limite do núcleo, o pedido seguinte é transcrito sem reabrir a aba. | 🟡 |
| RF-20 | O sistema deve gravar, num registro local sem conteúdo, a data, a duração do áudio, o tempo de processamento e o modelo de cada pedido. | Should | O registro contém essas quatro colunas por pedido e nenhuma palavra transcrita. | 🟡 |
| RF-21 | A extensão deve ser publicada na loja como item não listado, com o nome "Silente", sem as marcas "WhatsApp" e "Whisper", ficha descritiva, política de privacidade em endereço público, declaração de uso de dados (categoria "comunicações pessoais", processamento só local) e justificativa de cada permissão. | Must | O item é aprovado pela revisão da loja e instala-se pelo link num computador que nunca teve a extensão. | 🟡 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | ≤ 10 s de processamento por minuto de áudio, com o modelo carregado, no Mac do autor e no notebook Windows de referência do piloto. Se o teste da premissa mostrar que o notebook Windows não alcança essa meta com nenhum modelo, a meta para ele é revista antes do plano. | `_reversa_sdd/prd.md#3-métricas-de-sucesso` (meta sem hardware de referência) | 🟡 |
| Desempenho | ≤ 15 min da instalação pelo link até a primeira transcrição, com conexão de 50 Mbps, incluindo o download do modelo. | `_reversa_sdd/sdd/compatibilidade-instalacao.md#3-goals-objetivos` (G-01) | 🟡 |
| Desempenho | A página do WhatsApp Web continua respondendo durante a transcrição: rolar a conversa e digitar uma mensagem respondem em até 200 ms, limite de boa responsividade da métrica de latência de interação (INP) do navegador. | A transcrição dentro do navegador disputa recursos com a página | 🟡 |
| Qualidade | ≥ 95% das transcrições compreendidas sem ouvir o áudio, aferidas pelo registro diário do autor durante a semana sem o aplicativo auxiliar. | `_reversa_sdd/prd.md#3-métricas-de-sucesso` | 🟡 |
| Segurança | Todo código executável do motor vai dentro do pacote publicado; o que se baixa é apenas o arquivo de pesos, com integridade conferida (RF-07). | Regra da plataforma de extensões que proíbe executar código baixado; `options.md#fatos-verificados-que-delimitam-o-espaço` | 🟡 |
| Privacidade | A promessa da página de boas-vindas ("zero envio para a nuvem") continua verdadeira. A política de privacidade descreve o download do modelo, sua origem e o fato de nenhum dado do usuário sair da máquina. | `extension/onboarding/index.html` (etapa de privacidade); `_reversa_sdd/sdd/compatibilidade-instalacao.md#12-segurança-e-privacidade` | 🟢 |
| Observabilidade | Sem telemetria remota; a aferição usa o registro local sem conteúdo (RF-20) e os relatos do grupo piloto. | `_reversa_sdd/sdd/compatibilidade-instalacao.md#4-non-goals-fora-do-escopo` (NG-06) | 🟡 |
| Compatibilidade | Chrome estável no Windows 10/11 de 64 bits e no macOS em Mac com Apple Silicon. Mac com Intel e Linux ficam fora desta entrega. | `_reversa_sdd/sdd/compatibilidade-instalacao.md#4-non-goals-fora-do-escopo` (NG-01) e `extension/src/dominio/compatibilidade.ts` | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Autor usa só o motor no navegador no Mac
  Dado o Mac do autor com o aplicativo auxiliar desligado e o modelo já baixado
  Quando ele clica no ícone de transcrição de uma mensagem de voz de paciente
  Então a transcrição aparece na janela flutuante sem nenhum processo fora do navegador
  E o registro local mostra o tempo de processamento sem nenhuma palavra transcrita

Cenário: Colega com Windows instala pelo link e transcreve sem ajuda
  Dado um notebook com Windows 10 ou 11 de 64 bits que nunca teve a extensão
  Quando o colega abre o link não listado, instala a extensão e segue a página de boas-vindas
  Então a página verifica a compatibilidade, baixa o modelo com progresso e conclui a transcrição de teste
  E o colega lê no próprio WhatsApp Web a transcrição de um áudio real, sem instalar mais nada

Cenário: Segunda sessão reaproveita o modelo
  Dado o modelo já baixado numa sessão anterior
  Quando o usuário reabre o navegador e transcreve um áudio
  Então nenhum byte do modelo é baixado de novo

Cenário: Transcrição sem rede
  Dado o modelo já baixado e a rede desligada
  Quando o usuário clica no ícone de uma mensagem de voz
  Então a transcrição é concluída

Cenário: Nenhum dado do usuário sai da máquina
  Dado o registro de rede da extensão aberto
  Quando o usuário faz 10 transcrições
  Então nenhuma requisição além do download do modelo aparece no registro

Cenário: Clique durante o carregamento do modelo
  Dado o WhatsApp Web recém-aberto e o modelo ainda carregando
  Quando o usuário clica no ícone de uma mensagem de voz
  Então a janela mostra "preparando" e, em seguida, a transcrição

Cenário: Download interrompido
  Dado o download do modelo em andamento na página de boas-vindas
  Quando a rede cai no meio do download
  Então a página informa a falha em linguagem simples e oferece nova tentativa
  E, restabelecida a rede, o download continua do ponto em que parou

Cenário: Modelo corrompido
  Dado um arquivo de modelo adulterado no armazenamento da extensão
  Quando o motor se prepara para transcrever
  Então o arquivo é descartado, nenhuma transcrição usa o modelo adulterado e o download recomeça

Cenário: Computador incompatível
  Dado um computador abaixo de algum requisito mínimo
  Quando a página de boas-vindas faz a verificação
  Então o aviso cita cada requisito não atendido, sem jargão técnico
  E nenhum download é iniciado

Cenário: Áudio ilegível
  Dado um arquivo de áudio corrompido
  Quando o núcleo pede a transcrição
  Então o motor devolve FALHA_NA_TRANSCRICAO e a janela mostra "áudio ilegível"
Cenário: Formatos e idioma
  Dado uma mensagem de voz em português, um áudio em inglês, um arquivo MP4/AAC e um MP3
  Quando o núcleo pede a transcrição de cada um
  Então todos são transcritos sem erro
  E o idioma devolvido é "pt" para o primeiro e "en" para o segundo

Cenário: Modelo padrão justificado por medição
  Dado o teste da premissa concluído no Mac do autor e no notebook Windows de referência
  Quando o modelo padrão é fixado
  Então o registro da decisão traz, por modelo testado, os segundos por minuto de áudio e os erros que mudam o sentido nas amostras

Cenário: Modelo permanece carregado
  Dado uma primeira transcrição concluída na aba do WhatsApp Web
  Quando o usuário transcreve um segundo áudio
  Então o registro de desempenho não mostra tempo de carregamento do modelo nesse pedido

Cenário: Pedidos em sequência rápida
  Dado três mensagens de voz na conversa
  Quando o usuário clica nos três ícones em menos de 2 s
  Então as transcrições chegam na ordem dos cliques

Cenário: Pedido que excede o tempo-limite
  Dado um pedido forçado a exceder o tempo-limite do núcleo
  Quando o núcleo encerra esse pedido
  Então o pedido seguinte é transcrito normalmente, sem reabrir a aba

Cenário: Computador sem aceleração gráfica
  Dado um computador em que o navegador não oferece aceleração gráfica
  Quando a página de boas-vindas faz a verificação
  Então o usuário recebe, antes do primeiro download, a resposta que a medição do modo sem aceleração definiu: seguir nesse modo ou declarar incompatibilidade (RF-15)

Cenário: Mac com o aplicativo auxiliar pronto e depois desligado
  Dado o Mac do autor com o aplicativo auxiliar instalado e pronto
  Quando ele transcreve um áudio
  Então o aplicativo auxiliar atende e o painel mostra o motor local
  E, desligado o auxiliar, o pedido seguinte é transcrito pelo motor no navegador sem intervenção do usuário
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01, RF-02, RF-04 | Must | Núcleo da opção B: transcrever sem aplicativo auxiliar, no formato do WhatsApp, com detecção de idioma. |
| RF-05 | Must | O modelo padrão decide qualidade, velocidade e tamanho do download, que são a premissa central em `risks.md`. |
| RF-06, RF-07, RF-08, RF-09 | Must | Sem download confiável e reaproveitado, o leigo não chega à primeira transcrição dentro de 15 min. |
| RF-10, RF-11 | Must | Mantêm a promessa de privacidade local, decisiva para médicos e advogados. |
| RF-12, RF-13, RF-14, RF-16, RF-22 | Must | Paridade com o contrato e o comportamento do motor atual, que o núcleo e a janela já esperam. |
| RF-15, RF-19 | Must | RF-15 decide quem pode usar o produto sem aceleração gráfica; RF-19 preserva o desempenho que o autor já tem no Mac. |
| RF-17, RF-18 | Must | O critério de pronto do colega com Windows passa pela página de boas-vindas sem instalador. |
| RF-21 | Must | Sem publicação não listada não há piloto. |
| RF-03 | Should | As mensagens de voz são Ogg/Opus; os outros formatos são áudios encaminhados, menos frequentes. |
| RF-20 | Should | Dá base à métrica de latência, mas o piloto funciona sem ele. |
| RNF de desempenho (latência) | Must | Faz parte da premissa central; sem ele, o motor no navegador não substitui o atual. |
| RNF de responsividade da página | Should | Atraso na página prejudica o uso, mas não impede a transcrição. |

## 9. Esclarecimentos

### Sessão 2026-10-04

- **Q:** O que acontece com o aplicativo auxiliar nesta entrega?
  **R:** Fica como modo de desempenho no Mac: é usado quando está pronto; nos demais casos, entra o motor do navegador (opção a). Consequência aceita: a permissão de comunicação com aplicativos nativos continua no manifesto, com o aviso que o Chrome exibe a todos na instalação, inclusive no Windows, e com a justificativa exigida na revisão da loja. Aplicado no RF-19.
- **Q:** Num computador em que o navegador não oferece aceleração gráfica, o que a extensão faz?
  **R:** Decide pela medição: segue no modo sem aceleração se o teste da premissa mostrar velocidade aceitável, entendida como a meta de latência vigente para o notebook de referência; senão, declara incompatibilidade (opção d). Aplicado no RF-15.
- **Q:** Que nome vai na ficha da loja?
  **R:** O agente propôs três candidatos, conferidos em 2026-10-04 na loja, nos domínios .com, .com.br e .app, no INPI e no USPTO: Voz Lida, Ouvi Lendo e Silente. O usuário escolheu **Silente** (opção c). A checagem não achou extensão homônima na loja nem marca nas classes 9 e 42; há registro SILENTE no USPTO só na classe 20 (assentos). O silente.com e o silente.com.br pertencem a terceiros e o silente.app estava livre. Aplicado no RF-21.
- **Q:** De onde a extensão baixa o modelo?
  **R:** Do repositório público em que o modelo já está publicado (opção a), depois de o agente explicar que a escolha dispensa custo e manutenção, mas depende de terceiro e precisa constar da política de privacidade. Aplicado na RN-03.
- **Q:** O BUG-20261002-YUB4 ainda acontece no uso do autor?
  **R:** Não acontece mais; pode ser encerrado como não reproduzido (opção a). Aplicado na RN-07; o encerramento formal cabe ao fluxo de bugs.

## 10. Lacunas

- 🟡 Nenhuma dúvida aberta. A checagem do nome não cobriu semelhança fonética no INPI ("Silent") nem as bases da OMPI e do EUIPO; convém repeti-la antes da listagem pública.

🟡 Pontos do `pre-spec.md` resolvidos por inferência, revisáveis no `/reversa-clarify`:
- **Safari:** fica fora desta entrega, porque exige a conta da Apple, fora do orçamento declarado.
- **Tolerância do critério da semana:** é a meta do PRD, de ≥ 95% de transcrições compreendidas.
- **Grupo piloto:** 5 a 10 pessoas, com pelo menos uma no Windows, conforme o plano de rollout da spec.
- **Política de privacidade:** fica num endereço público gratuito.
- **BUG-20261002-YUB4:** resolvido no esclarecimento de 2026-10-04 (não ocorre mais); resta o encerramento formal do registro (RN-07).

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-10-04 | Versão inicial gerada por `/reversa-requirements` a partir do `pre-spec.md` da sessão de ideação 001 | reversa |
| 2026-10-04 | Sessão de esclarecimentos: RF-15, RF-19, RF-21, RN-03 e RN-07 atualizados; as três dúvidas resolvidas, com o nome Silente escolhido entre três candidatos | reversa-clarify |
