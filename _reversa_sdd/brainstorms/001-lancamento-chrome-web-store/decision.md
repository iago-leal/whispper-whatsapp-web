# Decision, lancamento-chrome-web-store

> Selo 🟡 PLANEJADO. Decisão humana registrada, sujeita a revisão.

## Problema de referência
🟡 Quando eu tenho um produto que já me poupa tempo todos os dias e uma janela curta antes de a Meta oferecer o mesmo recurso, eu quero colocá-lo nas mãos de outros profissionais que recebem muitos áudios de clientes, para conseguir validar a demanda e gerar receita antes que a janela se feche.

## Placar
| Opção | Job to be done | Esforço | Risco residual | Custo no legado | Total |
|---|---|---|---|---|---|
| A, MVP Mac com aplicativo auxiliar empacotado | 4 | 3 | 4 | 4 | 15 |
| B, extensão autossuficiente com Whisper no navegador | 3 | 1 | 3 | 3 | 10 |
| C, nuvem paga com aviso expresso de risco | 3 | 3 | 2 | 2 | 10 |
| Não construir | 2 | 5 | 3 | 5 | 15 |
| Usar algo pronto | 2 | 5 | 3 | 5 | 15 |

🟡 **Empate triplo em 15 pontos, entre A, "não construir" e "usar algo pronto".** A soma sem ponderação favorece quem não constrói: as duas opções obrigatórias somam 10 pontos só em esforço e em custo no legado. Na prática, desempata o critério que mede o job to be done, em que A tem 4 e as outras duas têm 2, porque nenhuma delas gera receita com o produto do usuário.

🟡 **Evidência considerada no placar.** O repositório comprova que o produto funciona no Mac do usuário: 40 commits, 24 arquivos de teste na extensão e 14 no aplicativo auxiliar, aceitações no WhatsApp real (HVT4, TTLJ e ME3Q) e uso diário. Há duas ressalvas. O portão de latência com áudios reais (T025) foi adiado (`_reversa_forward/001-motor-transcricao-local/poc-latencia.md`). Além disso, o BUG-20261002-YUB4 continua aberto no registro.

## Recomendação do Arbiter
🟡 **Opção A, com 15 pontos.** É a única opção que preserva os dois diferenciais frente aos concorrentes gratuitos, a privacidade local e a qualidade do modelo grande, e a que melhor responde à manchete "ninguém pagou". Usa o motor já validado no uso diário, e o ponto sem volta pode ser adiado com uma publicação inicial não listada.

## O que se perde ao escolher ela
🟡 Ao escolher A, perde-se o Windows, que reúne cerca de 85% dos desktops no Brasil e provavelmente a maior parte do público citado. Adia-se o Safari. O leigo passa pelo alerta de instalador não notarizado, porque o orçamento exclui a conta da Apple. E o instalador precisa ser refeito para embutir o ambiente Python.

## Em que condição a recomendação muda
- 🟡 **B passa à frente** se a enquete com colegas mostrar maioria no Windows e o teste de qualidade do Whisper no navegador funcionar.
- 🟡 **C passa à frente** se, além de maioria no Windows, os compradores da pré-venda aceitarem a nuvem.
- 🟡 **A morre com o orçamento atual** se menos de 3 em 5 colegas com Mac instalarem um `.pkg` não notarizado sem ajuda.
- 🟡 **"Não construir" passa à frente** se a pré-venda a 10 a 20 profissionais tiver zero pagantes.

## Decisão do usuário
🟡 **Opção B, extensão autossuficiente com Whisper no navegador.** Decidida por iago em 2026-10-04T19:26:28-03:00, com as palavras: "esse é o melhor caminho, apesar de demorar mais um pouco, mas acho que vale a pena".

Motivação declarada pelo usuário:
- 🟡 levar o motor para dentro da extensão;
- 🟡 dispensar o aplicativo auxiliar;
- 🟡 facilitar a futura versão para o Safari.

🟡 Conforme a descrição da opção B em `options.md`, o aplicativo auxiliar com mlx-whisper pode continuar como modo de desempenho no Mac. A decisão não o descarta.

## Divergência registrada
🟡 **A recomendação era a opção A (15 pontos contra 10 de B).** A fundamentação estava em três pontos:
- A preserva os dois diferenciais, privacidade local e qualidade do modelo grande, sem engenharia nova de motor.
- O esforço de A é médio, contra alto em B, num cenário de janela de oportunidade curta.
- A premissa de qualidade de B (português informal num modelo que caiba no navegador) ainda não foi testada.

A escolha do usuário é a decisão. A divergência fica registrada como informação.

## A validar antes de comprometer
🟡 **Teste da premissa central de B, de um a dois dias e sem código do produto:**
1. Rodar uma demonstração pública de Whisper no navegador (transformers.js com WebGPU, ou whisper.cpp em WebAssembly) num notebook comum com Windows e no Mac do usuário.
2. Usar os áudios não sensíveis de `amostras/`.
3. Comparar com a transcrição do mlx-whisper, registrando os erros que mudam o sentido e os segundos de processamento por minuto de áudio nos modelos base e small.

🟡 **Testes complementares, que valem para qualquer opção (`risks.md`):**
- **Pré-venda:** link de pagamento oferecido a 10 a 20 profissionais.
- **BUG-20261002-YUB4:** confirmar se o botão ▶ do WhatsApp Web ainda deixa de tocar com a extensão ativa.

## Riscos aceitos conscientemente
- 🟡 **Prazo.** Esforço alto numa janela que o próprio usuário estima curta: cada semana de engenharia do novo motor é uma semana sem produto publicado.
- 🟡 **Qualidade.** Modelos que cabem no navegador erram mais em português: no conjunto FLEURS, 13,0% no base e 7,3% no small, e áudio informal tende a errar mais.
- 🟡 **Velocidade.** A velocidade medida varia muito: de 5 a 27 s por minuto de áudio para o modelo base num Mac M2.
- 🟡 **Sinal de mercado.** As extensões concorrentes que já transcrevem localmente no navegador têm 111 e 185 usuários, uma delas com nota 1,0.
- 🟡 **Arquitetura do novo motor.** O documento offscreen é único por extensão e só dispõe da API `runtime`, o que obriga a reorganizar a orquestração hoje dividida entre o service worker e o host nativo.
- 🟡 **Hardware sem cobertura.** Placas de vídeo e drivers do Windows formam uma matriz que nenhum teste do projeto cobre; o E2E roda no Mac.
- 🟡 **Specs a revisar.**
  - A NG-01 da spec `motor-transcricao-local` deixa de valer.
  - A unidade `compatibilidade-instalacao` precisa ser revista.
  - O alvo de latência do PRD continua sem hardware de referência.
- 🟡 **Ponto sem volta.** Ele está na publicação para Windows; daí em diante, o produto se compromete com hardware heterogêneo.
- 🟡 **Riscos transversais que seguem.**
  - Mantenedor único.
  - Integração com uma página que muda sem aviso, além do BUG-20261002-YUB4.
  - Declaração de privacidade obrigatória na loja.
  - Direito de arrependimento (CDC, art. 49) e enquadramento fiscal, se houver cobrança.
- 🟡 **Safari.** Ele continua exigindo a conta da Apple (US$ 99/ano), e o suporte do Safari ao documento offscreen não foi confirmado.

---
Gerado por reversa-arbiter em 2026-10-04T19:26:28-03:00
Sessão: 001-lancamento-chrome-web-store
