# Options, lancamento-chrome-web-store

> Selo 🟡 PLANEJADO em todos os itens. Nenhuma opção foi escolhida ainda.

## Problema de referência
🟡 Quando eu tenho um produto que já me poupa tempo todos os dias e uma janela curta antes de a Meta oferecer o mesmo recurso, eu quero colocá-lo nas mãos de outros profissionais que recebem muitos áudios de clientes, para conseguir validar a demanda e gerar receita antes que a janela se feche.

## Restrições ativas
- 🟡 **Orçamento do MVP:** o menor possível, de preferência só a taxa única de registro na Chrome Web Store. A conta de desenvolvedor da Apple (US$ 99/ano) fica fora do MVP, e com ela a notarização do instalador e a publicação no Safari.
- 🟡 **Nuvem:** admitida, desde que o produto declare expressamente que processar dados fora da máquina do usuário traz risco real.
- 🟡 **Forma de venda:** indefinida. Autosserviço e venda direta a empresas continuam no leque.
- 🟡 **Alcance:** um MVP só para Mac é aceito como primeira versão (framing).
- 🟡 **Prazo:** a janela de oportunidade é estimada como curta (framing).

## Fatos verificados que delimitam o espaço
> Levantados na web em 2026-10-04 por dois agentes de pesquisa, com as fontes indicadas. Valem para todas as opções e não favorecem nenhuma.

**Monetização**
- 🟡 O Google AdSense não pode ser usado. A política do AdSense veda anúncios "integrated into a software application (...) including toolbars" (support.google.com/adsense/answer/48182), e a política de anúncios da loja diz: "AdSense may not be used to serve ads in Products" (developer.chrome.com/docs/webstore/program-policies/ads).
- 🟡 Anúncio de outras redes é permitido se tiver divulgação ao usuário e atribuição clara, se não interferir no site de terceiro e se puder ser removido. Injetar anúncio em páginas aparece como exemplo de violação da regra de propósito único. Existe ao menos uma rede voltada a extensões, a ExtAds, que declara CPM de US$ 0,20 a 0,50; a reputação dela não foi verificada.
- 🟡 A própria loja não cobra mais. A criação de itens pagos acabou em 2020-09-21, e a cobrança dos existentes, em 2021-02-01. Assinatura exige intermediário:
  - ExtensionPay: 5% mais a taxa do Stripe; não é *merchant of record*, logo o imposto fica com o autor.
  - Paddle: é *merchant of record*; cobra 5% + US$ 0,50; aceita vendedor no Brasil e Pix.
  - Gumroad: é *merchant of record*; cobra 10% + US$ 0,50; o repasse ao Brasil não foi confirmado.
- 🟡 Como os concorrentes cobram: a Kaption, com 50 mil usuários, é gratuita com compras dentro do produto. O ZapVox, brasileiro e na nuvem, dá 10 transcrições grátis por dia e cobra R$ 29,90/mês pelo plano Pro.

**Mercado**
- 🟡 O WhatsApp Web e o WhatsApp Desktop não transcrevem áudio nativamente, segundo fontes secundárias de julho de 2026. Não se achou anúncio da Meta sobre isso. No celular, a transcrição existe desde 2024-11-21, roda no aparelho e inclui o português.
- 🟡 Há pelo menos oito extensões concorrentes, e a maior, a Kaption, tem 50 mil usuários. As que transcrevem localmente, por WebGPU ou WebAssembly, têm poucos usuários (185 e 111).
- 🟡 Sistemas em desktops no Brasil, setembro de 2026 (StatCounter): Windows 86,75% e macOS 7,92%. Na média de 12 meses, 84,3% e 11,9%; a série oscila muito.
- 🟡 Navegadores em desktops no Brasil, mesmo mês: Chrome 75,68%, Edge 11,97% e Safari 1,27%.

**Loja**
- 🟡 As políticas atuais não proíbem expressamente embutir um executável no pacote da extensão. Em 2016, porém, a equipe do Chromium orientou a não incluir código nativo e a oferecer o instalador para download no site do desenvolvedor. Houve remoções de extensões por isso, aplicadas de forma inconsistente.
- 🟡 A política de privacidade e a declaração de uso de dados são obrigatórias mesmo com processamento só local. "Comunicações pessoais" é uma das categorias a declarar.
- 🟡 A permissão `nativeMessaging` exibe um aviso ao usuário na instalação e exige justificativa na revisão.

**Marcas**
- 🟡 As diretrizes da Meta vedam usar "WhatsApp" como parte do nome de produto de terceiros, sem exceção para a forma "for WhatsApp". A loja proíbe sugerir endosso de outra empresa. Mesmo assim, há extensões publicadas com "WA" ou "WhatsApp" no nome.
- 🟡 A OpenAI pediu o registro de "WHISPER" no USPTO (processo 97815511), que estava suspenso em maio de 2025. Existem outras marcas WHISPER de terceiros. O INPI não foi consultado.
- 🟡 Já existe um produto chamado "Whispper": uma ferramenta de analítica para criadores de conteúdo (whispper.app). O domínio whispper.com está à venda.

**Plataformas**
- 🟡 **Safari:** a extensão vai dentro de um app macOS e exige o Apple Developer Program (US$ 99/ano). O native messaging só fala com a extensão nativa do próprio app contêiner, em sandbox. Scripts de conteúdo com `world: "MAIN"` funcionam desde o Safari 18.
- 🟡 **Windows, assinatura de código:**
  - pela Microsoft Store (MSIX), é gratuita e não gera aviso do SmartScreen;
  - o Azure Artifact Signing não atende pessoa física no Brasil;
  - um certificado OV custa de US$ 150 a 300 por ano;
  - um binário novo mostra aviso do SmartScreen até ganhar reputação.
- 🟡 **Whisper no navegador:**
  - o transformers.js com WebGPU e o whisper.cpp em WebAssembly existem, e o WebGPU vem ativo no Chrome para Windows e Mac;
  - os modelos quantizados vão de 41 MB (tiny) a 249 MB (small);
  - o erro por palavra em português (conjunto FLEURS) é de 13,0% no modelo base e de 7,3% no small;
  - a velocidade medida varia muito: o whisper-base levou de 5 a 27 s para 60 s de áudio num Mac M2.

**Legado**
- 🟡 O `.pkg` atual não traz Python, mlx-whisper nem ffmpeg. O `auxiliar/ferramentas/postinstall.sh` e o `auxiliar/motor.sh` procuram um Python 3.11 ou superior que já importe o mlx-whisper e um ffmpeg no PATH do shell de login; sem eles, a instalação recusa. Na prática, hoje o produto só se instala no Mac de um usuário técnico.

---

## Opção A, MVP Mac com aplicativo auxiliar empacotado
- **Em uma frase:** 🟡 Publicar na Chrome Web Store a extensão atual, só para Mac com Apple Silicon. O instalador passa a embutir Python, mlx-whisper e ffmpeg, fica hospedado fora do pacote da extensão e segue sem notarização.
- **Como resolve o problema:** 🟡 Leva a profissionais com Mac o produto que já funciona, sem mexer no motor e pelo caminho mais curto até a loja. A demanda se mede por instalações e uso. O alcance fica limitado à fatia Apple dos desktops brasileiros (8% a 12%), e, dentro dela, aos Macs com Apple Silicon.
- **Esforço:** 🟡 médio. O motor e a extensão já existem, mas o instalador precisa embutir o ambiente Python, e sobra o trabalho de loja: nome, ficha, política de privacidade e justificativa das permissões. Há uma variante mínima, de esforço baixo: publicar como está, para quem já tem Python e mlx-whisper.
- **Impacto no legado:** 🟡
  - `auxiliar/ferramentas/gerar_pkg.sh` e `postinstall.sh` passam a empacotar o ambiente.
  - `extension/src/onboarding/onboarding.ts` troca o instalador embutido por um download hospedado (OQ-03) e ganha instruções para abrir um instalador não notarizado.
  - `extension/manifest.json` muda de nome e passa a usar o identificador da loja.
  - O `allowed_origins` do host nativo passa a apontar para esse identificador.
  - Motor, núcleo e janela flutuante não mudam.
- **Reversibilidade:** 🟡 fácil. Retirar a extensão da loja ou republicá-la é imediato, e nada muda no motor. Fica apenas a impressão de quem instalou.
- **O que precisa ser verdade para funcionar:** 🟡 Profissionais com Mac Apple Silicon aceitam instalar um aplicativo à parte e contornar o alerta de desenvolvedor não identificado nos Ajustes do Sistema. Além disso, a loja aprova uma extensão que depende de host nativo.
- **Custo fixo de distribuição:** 🟡 a taxa única da loja e uma hospedagem gratuita para o instalador [verificar limites de serviço gratuito, como GitHub Releases].
- **Cobrança compatível:** 🟡 gratuita para validar; depois, assinatura ou compra única por intermediário (Paddle, ExtensionPay). Anúncio só por rede que não seja do Google.
- **Safari nesta opção:** 🟡 exige a conta da Apple, fora do orçamento, e o reempacotamento do aplicativo auxiliar dentro do app contêiner, sob sandbox.

## Opção B, extensão autossuficiente com Whisper no navegador
- **Em uma frase:** 🟡 Acrescentar um adaptador do motor que roda o Whisper dentro da própria extensão, por WebGPU ou WebAssembly e sem aplicativo auxiliar, e publicar para Windows e Mac.
- **Como resolve o problema:** 🟡 A instalação passa a ser um clique na loja, sem instalador, assinatura ou notarização, e chega ao Windows, onde está a maior parte do público. A demanda passa a ser medida no público inteiro, não só no Mac.
- **Esforço:** 🟡 alto. Exige um novo adaptador do motor, download e cache do modelo no navegador, medição de desempenho em máquinas comuns e revisão da verificação de compatibilidade.
- **Impacto no legado:** 🟡
  - Inverte a NG-01 da spec `motor-transcricao-local`, que tratava o Whisper no navegador como adaptador futuro.
  - A porta do motor ganha um segundo adaptador.
  - A unidade `compatibilidade-instalacao` e a página de boas-vindas encolhem, porque não há mais instalador.
  - O `manifest.json` ganha a permissão de documento offscreen.
  - O aplicativo auxiliar com mlx-whisper pode continuar como modo de desempenho no Mac.
- **Reversibilidade:** 🟡 cara. O investimento de engenharia não volta, embora o produto possa ser retirado da loja a qualquer momento.
- **O que precisa ser verdade para funcionar:** 🟡 Um modelo que caiba no navegador (base ou small) transcreve português informal com qualidade aceitável para o público e roda num notebook comum em tempo tolerável.
- **Custo fixo de distribuição:** 🟡 a taxa única da loja. O modelo é baixado de um repositório público [verificar termos de redistribuição dos pesos e do repositório].
- **Cobrança compatível:** 🟡 gratuita, freemium ou assinatura por intermediário, com custo marginal por usuário próximo de zero. Anúncio só por rede que não seja do Google.
- **Safari nesta opção:** 🟡 o porte fica mais leve, porque não há aplicativo auxiliar, mas continua exigindo a conta da Apple. Não se confirmou se o Safari suporta o documento offscreen.

## Opção C, nuvem paga com aviso expresso de risco
- **Em uma frase:** 🟡 Acrescentar um adaptador do motor que, com consentimento expresso, envia o áudio a um serviço hospedado de transcrição por meio de um servidor próprio mínimo, e cobrar assinatura.
- **Como resolve o problema:** 🟡 Funciona em qualquer computador com Chrome, com modelo grande e sem instalação, o que leva o produto de imediato ao público inteiro. A receita acompanha o uso.
- **Esforço:** 🟡 médio. O adaptador é simples, mas é preciso um servidor que guarde a chave da API e controle a cota, cobrança desde o início e documentos de privacidade adequados a dado sensível de saúde.
- **Impacto no legado:** 🟡
  - Revoga a restrição técnica do PRD que exige transcrição local na primeira versão, e também o critério de aceite de processamento só local.
  - Cria um componente fora da extensão, o servidor.
  - A porta do motor ganha um adaptador de nuvem.
  - A unidade `compatibilidade-instalacao` deixa de ser condição para usar o produto.
  - O aplicativo auxiliar local pode continuar como alternativa privada no Mac.
- **Reversibilidade:** 🟡 cara. Desligar o adaptador é fácil, mas o áudio enviado não volta, e os compromissos de privacidade e os contratos com o provedor permanecem.
- **O que precisa ser verdade para funcionar:** 🟡 O público aceita mandar áudio de paciente ou de cliente para a nuvem mesmo avisado do risco, e paga o bastante para cobrir o custo por minuto e o servidor.
- **Custo fixo de distribuição:** 🟡 a taxa única da loja e o servidor [verificar camada gratuita do provedor de hospedagem], mais o custo variável por minuto de áudio no provedor de transcrição.
- **Cobrança compatível:** 🟡 assinatura com franquia gratuita, como fazem os concorrentes de nuvem. Anúncio só por rede que não seja do Google.
- **Safari nesta opção:** 🟡 o porte depende só de chamadas de rede, mas exige a conta da Apple.

---

## Opção sempre presente, não construir
- **Em uma frase:** 🟡 Não publicar agora. Seguir usando a extensão, mostrá-la a colegas médicos e advogados e instalá-la à mão em dois ou três Macs de conhecidos para colher reações.
- **Como resolve o problema:** 🟡 Atende só a parte do job que pede validar a demanda, por conversa e observação, e sem custo. Não gera receita nem aproveita a janela.
- **Esforço:** 🟡 baixo. Nada é construído; o custo é o tempo das demonstrações e das instalações manuais.
- **Impacto no legado:** 🟡 nenhum.
- **Reversibilidade:** 🟡 fácil, porque nenhuma decisão fica tomada.
- **O que precisa ser verdade para funcionar:** 🟡 A janela não se fecha antes de terminar a validação informal, ou o valor do uso pessoal basta.
- **Custo fixo de distribuição:** 🟡 zero.
- **Cobrança compatível:** 🟡 nenhuma.
- **Safari nesta opção:** 🟡 não se aplica.

## Opção sempre presente, usar algo pronto
- **Em uma frase:** 🟡 Em vez de lançar produto próprio, apoiar-se no que já existe. Os colegas usam as extensões prontas, como a Kaption e o ZapVox, e o diferencial do motor local é oferecido, por licença ou parceria, a quem já tem usuários ou já vende para médicos e advogados.
- **Como resolve o problema:** 🟡 Um produto de prateleira atende de imediato a dor dos colegas, e o número de usuários dos concorrentes (50 mil na Kaption) já serve como evidência de demanda. A receita, se houver, vem de licença ou parceria, sem loja própria.
- **Esforço:** 🟡 baixo. Não há engenharia nova; o trabalho é encontrar parceiros.
- **Impacto no legado:** 🟡 nenhum no código. O projeto segue como ferramenta pessoal e como ativo licenciável.
- **Reversibilidade:** 🟡 fácil enquanto não houver contrato; cara se houver licença exclusiva.
- **O que precisa ser verdade para funcionar:** 🟡 Há parceiro que valorize a transcrição local o bastante para licenciá-la [verificar se existe esse interesse no mercado brasileiro], e as soluções prontas, em geral na nuvem, são aceitáveis para os colegas.
- **Custo fixo de distribuição:** 🟡 zero.
- **Cobrança compatível:** 🟡 licença ou participação negociada, sem cobrança ao usuário final.
- **Safari nesta opção:** 🟡 não se aplica.

---

## Decisão transversal, o nome
> O nome não define o caminho: qualquer opção que publique precisa dele. Ficam abertas três variantes, com o mesmo tratamento.

- 🟡 **N1, manter o nome atual** (`whispper-whatsapp-web`). Precisa ser verdade que a Meta e a loja não reajam ao uso de "WhatsApp" no nome, contrário às diretrizes da Meta. Reversibilidade cara depois que houver usuários e avaliações.
- 🟡 **N2, só "Whispper"**, com o WhatsApp mencionado apenas na descrição, como referência ao que a extensão faz. Precisa ser verdade que a semelhança com "Whisper" (pedido de marca da OpenAI, suspenso) e a coincidência com o whispper.app, de outro segmento, não gerem conflito. Reversibilidade cara depois que houver usuários.
- 🟡 **N3, nome novo**, sem referência ao Whisper nem ao WhatsApp. Precisa ser verdade que um nome próprio comunique a função sozinho ou com a ajuda da descrição. Exige a busca de disponibilidade (INPI, loja, domínio), que ainda não foi feita.
- 🟡 Fato comum às três: mudar o nome custa menos antes da primeira publicação do que depois.

---
Gerado por reversa-explorer em 2026-10-04T18:54:51-03:00
Sessão: 001-lancamento-chrome-web-store
Nenhuma recomendação emitida por design. Convergência é papel de /reversa-arbiter.
