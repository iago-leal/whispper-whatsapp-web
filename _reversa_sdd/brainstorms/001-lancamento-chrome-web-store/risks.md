# Risks, lancamento-chrome-web-store

> Selo 🟡 PLANEJADO em todos os itens. Documento adversarial por design.

## Premortem
> Outubro de 2027. O projeto foi lançado e fracassou. As manchetes estão em ordem de severidade; o usuário escolheu a primeira como a que mais assusta.

🟡 **1. "Os usuários gostaram, mas ninguém pagou: concorrentes gratuitos com 50 mil usuários e a chegada da transcrição ao WhatsApp Web zeraram a receita."** Causa raiz: falta de um diferencial pelo qual o público aceite pagar, num mercado que já oferece transcrição de graça.

🟡 **2. "Uma atualização do WhatsApp Web quebra o ícone e o player, a extensão acumula notas de uma estrela, e o único mantenedor, entre plantões, leva semanas para corrigir."** Causa raiz: dependência da estrutura de uma página de terceiro que muda sem aviso, sustentada por uma pessoa só.

🟡 **3. "Um ano na loja e poucas dezenas de instalações: o produto só rodava em Mac com Apple Silicon e pedia um instalador barrado pelo macOS."** Causa raiz: atrito de instalação e alcance de cerca de 10% dos desktops brasileiros.

🟡 **4. "Áudios de pacientes vazam de um servidor de transcrição, e os médicos que usavam a extensão respondem à ANPD e ao CRM."** Causa raiz: dado de saúde processado fora da máquina, num produto sem estrutura de conformidade.

**Manchete que mais assusta o usuário:** 🟡 a 1, "ninguém pagou".

---

## Opção A, MVP Mac com aplicativo auxiliar empacotado
- **Premissa que mata:** 🟡 Profissionais leigos com Mac Apple Silicon conseguem e aceitam instalar um aplicativo à parte, sem notarização, liberando-o nos Ajustes do Sistema. Se ninguém passa dessa etapa, ninguém chega a usar o produto, e muito menos a pagar por ele.
- **Teste barato da premissa:** 🟡 Em algumas horas, entregue a 3 a 5 colegas com Mac um `.pkg` não notarizado qualquer, acompanhado só das instruções que a página de boas-vindas daria, e conte quantos concluem sem ajuda. No mesmo contato, pergunte quantos dos 10 profissionais mais próximos que recebem muitos áudios usam Mac com Apple Silicon.
- **Custo escondido:** 🟡
  - **O instalador terá de ser refeito.** O atual depende do PATH do shell de login para achar Python, mlx-whisper e ffmpeg (`auxiliar/ferramentas/postinstall.sh` e `auxiliar/motor.sh`), e precisa passar a embutir um ambiente Python completo.
  - **O download fica pesado.** O modelo proposto em OQ-01 da spec `motor-transcricao-local` é o large-v3-turbo, com cerca de 1,6 GB, e ele pressiona a meta G-01 da spec `compatibilidade-instalacao`: chegar à primeira transcrição em até 15 minutos.
  - **A licença do ffmpeg pode impor obrigações.** Redistribuí-lo pode gerar obrigações de licenciamento, conforme o tipo de compilação usada. 🟡 [inferido, sem âncora no legado]
  - **O vínculo de identificador muda.** O `.pkg` embute a `key` da extensão (comentário em `postinstall.sh`), e o host nativo só aceita a origem `chrome-extension://<id>/` (`auxiliar/whispper_motor/instalacao.py`). Por isso, o identificador atribuído pela loja precisa casar com o do instalador.
  - **O suporte cai numa pessoa só.** Cada instalação que falhar vira um pedido de suporte, e a NG-05 da spec `compatibilidade-instalacao` exclui canal de atendimento.
- **Ponto sem volta:** 🟡 A primeira listagem pública. A partir dela, o nome e as avaliações ficam presos ao item da loja. Além disso, cada aplicativo auxiliar instalado continua na máquina do usuário mesmo se o produto for retirado.

## Opção B, extensão autossuficiente com Whisper no navegador
- **Premissa que mata:** 🟡 Um modelo que caiba no navegador (base ou small) transcreve áudio informal em português bem o bastante para dispensar a escuta, e rápido o bastante num notebook comum com Windows. Se a qualidade cair abaixo da que hoje justifica o uso, o produto deixa de valer a pena, e ninguém paga por ele.
- **Teste barato da premissa:** 🟡 Em um ou dois dias, sem escrever código do produto, rode uma demonstração pública de Whisper no navegador (transformers.js ou whisper.cpp em WebAssembly) num notebook comum com Windows. Use os áudios não sensíveis de `amostras/` e compare com a transcrição do mlx-whisper, registrando erros que mudam o sentido e segundos por minuto de áudio.
- **Custo escondido:** 🟡
  - **Respaldo na pesquisa.** As extensões concorrentes que já transcrevem localmente no navegador têm 111 e 185 usuários, uma delas com nota 1,0.
  - **Limites do documento offscreen.** Só pode haver um por extensão, e ele só dispõe da API `runtime`. Isso obriga a reorganizar a orquestração, hoje no service worker e no host nativo.
  - **Hardware a cobrir.** Placas de vídeo e drivers do Windows formam uma matriz de hardware que nenhum teste do projeto cobre hoje; o E2E roda em Chrome for Testing no Mac. 🟡 [inferido, sem âncora no legado]
  - **Specs a revisar.** A NG-01 da spec `motor-transcricao-local` passa a ser revista, e o alvo de latência de 10 s/min do PRD continua sem hardware de referência (PRD, seção 3).
- **Ponto sem volta:** 🟡 A publicação para Windows. Daí em diante, o produto se compromete com hardware heterogêneo; recuar significaria abandonar a base que justificou o investimento.

## Opção C, nuvem paga com aviso expresso de risco
- **Premissa que mata:** 🟡 Há motivo para pagar a este produto, e não aos concorrentes de nuvem já estabelecidos (Kaption, com 50 mil usuários e plano gratuito; ZapVox, por R$ 29,90/mês), quando ele abre mão do único diferencial que tem, a transcrição local. É a manchete 1 em estado puro.
- **Teste barato da premissa:** 🟡 Em poucos dias, faça uma pré-venda. Uma página de uma tela com preço e um link de pagamento (Paddle ou similar) é oferecida a 10 a 20 profissionais. Conte quantos pagam, e não quantos dizem que pagariam.
- **Custo escondido:** 🟡
  - **Promessa pública contrariada.** A página de boas-vindas (`extension/onboarding/index.html`, linhas 53 e 56) declara a privacidade local "princípio inegociável" e promete "zero envio para a nuvem". A opção contradiz o texto que já está pronto.
  - **Papel de operador na LGPD.** O autor passa a tratar dado de saúde de terceiros (art. 11). Isso traz contrato com o profissional, registro das operações, segurança, comunicação de incidente (art. 48) e, se o provedor estiver no exterior, regras de transferência internacional (art. 33). Hoje a spec `compatibilidade-instalacao` (seção de segurança) afirma que "o desenvolvedor não acessa os dados".
  - **Contas e cota de uso.** O servidor guarda a chave do provedor e precisa de contas de usuário para medir a cota. Isso cria um fluxo de autenticação que hoje não existe.
  - **Custo por minuto contra preço fixo.** Num plano de preço fixo, quem usa muito corrói a margem. 🟡 [inferido, sem âncora no legado]
- **Ponto sem volta:** 🟡 O primeiro áudio real de paciente enviado ao servidor. O dado tratado não se "destrata", e as obrigações de operador nascem nesse momento.

## Opção sempre presente, não construir
- **Premissa que mata:** 🟡 A janela não se fecha enquanto a validação é informal. O job inclui gerar receita, e esta opção não gera nenhuma; se a Meta lançar a transcrição no Web nesse meio-tempo, a oportunidade se perde de vez.
- **Teste barato da premissa:** 🟡 `[sem teste barato disponível]` para prever o prazo da Meta. O máximo que se pode fazer é acompanhar sinais, como os betas do WhatsApp Desktop noticiados pelo WABetaInfo, o que custa minutos por semana mas não antecipa a decisão da empresa.
- **Custo escondido:** 🟡
  - **Instalar à mão é caro.** Cada instalação em Mac de colega exige Homebrew, Python 3.11 ou superior, mlx-whisper e ffmpeg, além da extensão em modo de desenvolvedor (`auxiliar/motor.sh`, linhas 37 a 62).
  - **As máquinas não se atualizam sozinhas.** Cada correção, num ritmo de 14 bugs em quatro dias (`_reversa_sdd/traceability/bugs.md`), exige nova visita a cada máquina.
  - **O suporte não gera receita.** Ele consome horas do autor sem trazer evidência de que alguém pagaria.
- **Ponto sem volta:** 🟡 O dia em que a transcrição nativa chegar ao WhatsApp Web, se chegar. A partir daí, não publicar deixa de ser adiamento e vira decisão definitiva.

## Opção sempre presente, usar algo pronto
- **Premissa que mata:** 🟡 O ativo tem valor licenciável, isto é, não pode ser replicado em poucas semanas a partir de componentes abertos. O mlx-whisper e os modelos Whisper são públicos. O que é próprio é a integração com a página e a janela flutuante, justamente a parte que quebra quando o WhatsApp muda. Além disso, a baixa adesão às extensões locais (111 e 185 usuários) sugere que o mercado ainda não paga por transcrição local.
- **Teste barato da premissa:** 🟡 Em poucos dias, envie uma proposta de uma página com um vídeo de demonstração a 3 a 5 interessados possíveis: os autores da Kaption e do ZapVox e um fornecedor de software para clínicas ou escritórios. Resposta ou silêncio já respondem à premissa.
- **Custo escondido:** 🟡
  - **Exposição da solução.** Demonstrar a solução a concorrentes sem acordo de confidencialidade a entrega.
  - **Contrato.** Uma licença exige revisão contratual.
  - **Risco transferido aos colegas.** Recomendar aos colegas extensões de nuvem transfere a eles o risco que a opção C atribuiria ao autor: dado de paciente fora da máquina. 🟡 [inferido, sem âncora no legado]
- **Ponto sem volta:** 🟡 A demonstração detalhada a um concorrente sem acordo de confidencialidade, ou a assinatura de uma licença exclusiva.

---

## Riscos transversais
🟡 **Dependência de uma pessoa só.** O autor é o único desenvolvedor e é médico em atividade. O projeto registrou 14 bugs em quatro dias, 12 deles P0 ou P1, a maioria na integração com a página e na janela flutuante (`_reversa_sdd/traceability/bugs.md`). Num produto publicado, cada quebra da página pede correção rápida, e a NG-05 da spec `compatibilidade-instalacao` dispensa canal de suporte. Vale para A, B e C.

🟡 **Dados sensíveis e obrigação regulatória.**
- **Dados de saúde e sigilo.** O público citado recebe dados de saúde e informações sob sigilo profissional (LGPD, art. 5º, II, e art. 11).
- **Declaração na loja.** Mesmo com processamento local, a loja exige política de privacidade e a declaração da categoria "comunicações pessoais".
- **Opção C.** O autor passa a operador de dado sensível.
- **Venda pela internet.** Toda opção paga (A, B e C) atrai o direito de arrependimento em sete dias para contratação fora do estabelecimento (CDC, art. 49).
- **Impostos.** A receita exige um enquadramento fiscal do autor, ainda não definido. 🟡 [inferido, sem âncora no legado]

🟡 **Integração com sistemas de terceiros fora de controle.**
- **WhatsApp Web.** A página muda sem aviso (spec `integracao-whatsapp-web`, seções 2 e 7). Um bug P1 continua aberto: o BUG-20261002-YUB4 relata que o botão de reprodução do próprio WhatsApp Web deixou de tocar as mensagens de voz, com suspeita na obtenção do áudio pela extensão. Publicar com esse defeito expõe o produto a avaliações que nenhuma correção posterior apaga.
- **Chrome Web Store.** As políticas da loja sobre marca de terceiros no nome, executável no pacote e `nativeMessaging` são aplicadas por revisão humana, de forma inconsistente.
- **Meta.** A Meta controla tanto a página quanto a marca "WhatsApp".

🟡 **Fluxo de permissão sendo tocado.** O host nativo autoriza conexões só da origem registrada (`auxiliar/whispper_motor/instalacao.py`, verificação de `allowed_origins`). Publicar muda o identificador da extensão e exige alinhar o instalador e a instalação atual do próprio autor. A opção C cria, além disso, um fluxo de contas e de autenticação que hoje não existe; a cobrança por intermediário (ExtensionPay ou Paddle), em A ou B, cria um fluxo de verificação de licença.

🟡 **Compromisso de disponibilidade e desempenho não declarado.** Cobrar transforma uma ferramenta pessoal num serviço do qual se espera funcionamento contínuo. Nenhuma meta de prazo de correção foi declarada, e o PRD ainda não define o hardware de referência da métrica de latência (seção 3). Na opção C, a disponibilidade do servidor entra no rol.

## O que precisa ser respondido antes de decidir
1. 🟡 **Alguém paga, e quanto?** Uma pré-venda com link de pagamento a 10 a 20 profissionais responde à manchete que mais assusta, independentemente da opção.
2. 🟡 **Por qual diferencial se paga, frente a concorrentes gratuitos: privacidade local ou qualidade do modelo grande?** No Mac, a opção A mantém os dois; a B mantém a privacidade e perde qualidade; a C mantém a qualidade e perde a privacidade.
3. 🟡 **Quantos dos profissionais-alvo próximos usam Mac com Apple Silicon e quantos usam Windows?** Uma enquete com 10 colegas basta para uma primeira ordem de grandeza.
4. 🟡 **O BUG-20261002-YUB4 é causado pela extensão?** Se for, nenhuma opção que publique deveria ir à loja antes de corrigi-lo.
5. 🟡 **Quantas horas por semana o autor pode dar a manutenção e suporte de um produto publicado, cuja integração quebra sem aviso?**

---
Gerado por reversa-challenger em 2026-10-04T19:13:07-03:00
Sessão: 001-lancamento-chrome-web-store
