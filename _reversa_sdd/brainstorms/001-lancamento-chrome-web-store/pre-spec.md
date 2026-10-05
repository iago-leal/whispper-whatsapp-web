# Pre-Spec, lancamento-chrome-web-store

> Selo 🟡 PLANEJADO. Insumo de entrada para o próximo pipeline, não é uma spec.

## Problema
🟡 O produto já poupa tempo ao seu autor todos os dias, mas só funciona num Mac com o aplicativo auxiliar montado à mão. Por isso não chega a outros profissionais que recebem muitos áudios de clientes, enquanto a janela antes de a Meta oferecer o mesmo recurso no WhatsApp Web tende a ser curta.

## Caminho escolhido
🟡 Levar o motor de transcrição para dentro da extensão: o Whisper roda no próprio navegador, sem aplicativo auxiliar, para que a instalação pela loja do Chrome baste no Windows e no Mac. A escolha também prepara uma futura versão para o Safari (opção B de `decision.md`).

## Escopo mínimo da primeira entrega
🟡 A primeira entrega reúne quatro partes:
- um motor de transcrição no navegador, acrescentado como novo adaptador da porta do motor, capaz de transcrever as mensagens de voz do WhatsApp Web no Chrome para Windows e para Mac sem aplicativo auxiliar instalado;
- o download único do modelo, com progresso visível ao usuário;
- a página de boas-vindas ajustada a esse caminho, que dispensa o instalador;
- a publicação na Chrome Web Store como item **não listado**, acessível por link a um grupo piloto, com o que a loja exige: nome, ficha, política de privacidade e declaração de uso de dados.

A fatia entrega valor, porque um colega já usa o produto instalando só a extensão. Também testa a premissa central: a qualidade e a velocidade do modelo que cabe no navegador.

## Não-objetivos
- 🟡 **Cobrança:** nem assinatura nem anúncios nesta entrega. A monetização vem depois de medir o uso.
- 🟡 **Listagem pública:** a publicação é não listada, só por link, para o grupo piloto.
- 🟡 Herdados do PRD e não reabertos nesta sessão:
  - aplicativos de celular do WhatsApp;
  - outros mensageiros;
  - transcrição automática sem clique.

## Restrições ativas
- 🟡 **Prazo:** primeira entrega no piloto em até duas semanas, ou seja, até 2026-10-18.
- 🟡 **Orçamento:** o menor possível, de preferência só a taxa única de registro na Chrome Web Store. A conta de desenvolvedor da Apple não está orçada.
- 🟡 **Manifest V3:** é proibido executar código remoto, então o código do motor vai dentro do pacote da extensão. Só os pesos do modelo, que são dados, podem ser baixados.
- 🟡 **Arquitetura:** o novo motor entra como adaptador da porta já existente (diretriz hexagonal do PRD). Núcleo, fila, janela flutuante e integração com o WhatsApp Web não são redesenhados.
- 🟡 **Privacidade:** a transcrição segue local nesta entrega. Vale a promessa já publicada na página de boas-vindas ("zero envio para a nuvem").
- 🟡 **Exigências da loja:** política de privacidade e declaração da categoria "comunicações pessoais" mesmo com processamento só local; a regra de propósito único.
- 🟡 **Marca:** as diretrizes da Meta vedam "WhatsApp" no nome de produto de terceiros. A regra se aplica ao nome da ficha, mesmo não listada.
- 🟡 **Navegadores:** Chrome e navegadores da mesma base (Chromium), conforme o PRD.

## Critério de pronto
1. 🟡 **Uso do autor sem auxiliar.** O autor desliga o aplicativo auxiliar no próprio Mac e usa só o motor do navegador por uma semana de trabalho, sem precisar voltar a ouvir os áudios para entender o conteúdo. A verificação se faz por registro diário dos casos em que precisou ouvir; ver a dúvida sobre a tolerância.
2. 🟡 **Colega com Windows.** Um colega com notebook Windows instala a extensão pelo link não listado da loja, sem instalar mais nada e sem ajuda do autor, e lê a transcrição de um áudio real recebido no próprio WhatsApp Web.

## Premissa a validar primeiro
🟡 **Premissa:** um modelo que caiba no navegador (base ou small) transcreve áudio informal em português bem o bastante para dispensar a escuta, e rápido o bastante num notebook comum com Windows.

🟡 **Teste barato, de um a dois dias e sem código do produto:**
1. Rodar uma demonstração pública de Whisper no navegador (transformers.js com WebGPU, ou whisper.cpp em WebAssembly) num notebook comum com Windows e no Mac do autor.
2. Usar os áudios não sensíveis de `amostras/`.
3. Comparar com a transcrição do mlx-whisper, registrando os erros que mudam o sentido e os segundos por minuto de áudio.

🟡 Se o teste falhar, valem as condições de `decision.md` para rever a escolha.

## Riscos herdados
- 🟡 **Prazo contra o esforço.** O esforço alto disputa o prazo de duas semanas e a janela de oportunidade.
- 🟡 **Qualidade.** Os modelos pequenos erram mais em português (FLEURS: 13,0% no base e 7,3% no small), e o áudio informal tende a errar mais.
- 🟡 **Velocidade.** A velocidade varia muito com o hardware: de 5 a 27 s por minuto de áudio para o modelo base num Mac M2.
- 🟡 **Documento offscreen.** É único por extensão e só dispõe da API `runtime`, o que exige reorganizar a orquestração hoje feita no service worker com o host nativo.
- 🟡 **Hardware sem cobertura.** Placas de vídeo e drivers do Windows não são cobertos pelos testes; o E2E roda no Mac.
- 🟡 **Bug aberto.** O BUG-20261002-YUB4, em que o botão ▶ do WhatsApp Web não toca as mensagens de voz, segue aberto e, se causado pela extensão, compromete o piloto.
- 🟡 **Mantenedor único.** A integração depende de uma página que muda sem aviso, e só uma pessoa mantém o produto.
- 🟡 **Revisão da loja.** A revisão é humana e aplicada de forma inconsistente quanto a nome, marca e permissões.

## Âncoras no legado
- 🟡 **Porta do motor e adaptadores atuais.** `extension/src/dominio/motor-de-transcricao.ts` é a porta. Os adaptadores atuais são `extension/src/adaptadores/motor-local/` (host nativo) e `extension/src/adaptadores/motor-simulado.ts`, e o `extension/src/background.ts` instancia o `AdaptadorMotorLocal`.
- 🟡 **Instalação e página de boas-vindas.** `extension/src/dominio/compatibilidade.ts`, `extension/src/onboarding/onboarding.ts` e `extension/onboarding/index.html` concentram a verificação de hardware, o fluxo do instalador e a promessa de privacidade.
- 🟡 **Manifesto.** `extension/manifest.json` traz o nome, o campo `key`, as permissões (`nativeMessaging`, `storage`, `tabs`) e os scripts de conteúdo no WhatsApp Web.
- 🟡 **Protocolo com o auxiliar.** `contratos/protocolo-1.json` é o protocolo com o aplicativo auxiliar, que deixa de ser obrigatório.
- 🟡 **Spec `motor-transcricao-local`.**
  - A NG-01 adiava o Whisper no navegador e deixa de valer.
  - A OQ-01 trata do modelo padrão.
- 🟡 **Spec `compatibilidade-instalacao`.**
  - A estratégia não listada com grupo piloto já estava prevista.
  - A OQ-03 trata da hospedagem, e a OQ-04, da política de privacidade e da declaração na loja.
- 🟡 **Spec `integracao-whatsapp-web`.** Traz os requisitos RF-05 a RF-07 e RF-12, ligados ao BUG-20261002-YUB4.
- 🟡 **PRD.** `_reversa_sdd/prd.md` contém a restrição hexagonal, as métricas de latência (≤ 10 s/min) e de qualidade (≥ 95%) e os navegadores Chromium.
- 🟡 **Amostras.** Os áudios para o teste da premissa estão em `amostras/`.

## Dúvidas abertas
- [DÚVIDA] 🟡 O Safari entra na primeira entrega? Não foi marcado como fora de escopo, mas exige a conta da Apple (US$ 99/ano), que não está orçada.
- [DÚVIDA] 🟡 Na primeira entrega, o aplicativo auxiliar com mlx-whisper continua como modo de desempenho no Mac ou sai de vez? A aposentadoria não foi marcada como fora de escopo.
- [DÚVIDA] 🟡 Qual é o modelo padrão, e ele varia conforme a máquina? O tamanho do download pesa contra a qualidade: cerca de 77 MB no base, 249 MB no small e 564 MB no large-v3-turbo quantizado.
- [DÚVIDA] 🟡 Numa máquina sem WebGPU, a extensão recorre ao WebAssembly, mais lento, ou avisa a incompatibilidade?
- [DÚVIDA] 🟡 Qual nome vai na ficha não listada: manter o atual, só "Whispper" ou um nome novo, sem referência ao Whisper nem ao WhatsApp?
- [DÚVIDA] 🟡 No critério "uma semana sem auxiliar", a tolerância é zero áudios ouvidos ou uma fração, como os ≥ 95% de transcrições compreendidas do PRD?
- [DÚVIDA] 🟡 Quem compõe o grupo piloto, e quantas pessoas usam Windows? A spec `compatibilidade-instalacao` previa de 5 a 10 pessoas leigas.
- [DÚVIDA] 🟡 Onde fica hospedada a política de privacidade exigida pela loja, que precisa de um endereço público, dentro do orçamento mínimo?
- [DÚVIDA] 🟡 O BUG-20261002-YUB4 ainda ocorre? Precisa ser corrigido antes do piloto?

---
Gerado por reversa-pre-spec em 2026-10-04T19:30:59-03:00
Sessão: 001-lancamento-chrome-web-store
Destino sugerido: /reversa-requirements
