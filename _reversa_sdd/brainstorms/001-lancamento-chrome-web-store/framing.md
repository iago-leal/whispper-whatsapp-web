# Framing, lancamento-chrome-web-store

> Selo 🟡 PLANEJADO em todos os itens, sujeito a validação.

## Classificação da entrada
🟡 Solução disfarçada de problema. A entrada enumera quatro respostas (publicar na Chrome Web Store, monetizar por anúncios ou por assinatura, trocar o nome, levar o produto ao Safari) sem nomear a dor que elas resolvem. O enquadramento mostrou duas dores distintas: a do usuário final, já resolvida no Mac com Apple Silicon, e a de quem lança o produto, que é aproveitar uma janela de oportunidade que tende a ser curta.

## Problema
🟡 **Dor do usuário final, validada no uso próprio.** Áudios recebidos pelo WhatsApp são prolixos: um recado que caberia em 10 segundos ocupa um minuto e meio, e ouvi-lo consome todo esse tempo. O WhatsApp Web não transcreve áudios, e o usuário avalia que a transcrição nativa do aplicativo de celular tem qualidade baixa (percepção, não medida). A extensão resolveu essa dor no uso diário do próprio usuário, que deixou de abrir áudios e passou a poupar tempo de forma perceptível.

🟡 **Dor de quem lança, objeto desta sessão.** O produto hoje beneficia apenas o seu autor. O usuário espera que a Meta integre a transcrição às próprias aplicações em breve, o que encurtaria a janela para mostrar o produto e gerar receita.

🟡 **Episódio real.** O episódio é o próprio uso: a constatação de que a extensão poupa tempo todos os dias. Não houve episódio externo, como pedido de terceiro, demonstração a colegas ou lista de espera. A demanda de outros profissionais é hipótese do usuário ("acho que isso é muito comum"), ainda sem evidência.

🟡 **Soluções candidatas trazidas na entrada**, registradas como tais e não como problema:
- 🟡 Publicação na Chrome Web Store.
- 🟡 Monetização por anúncios (Google Ads) ou por assinatura.
- 🟡 Troca do nome, motivada pela referência ao Whisper, da OpenAI.
- 🟡 Versão para o Safari.

## Quem sente
🟡 **Quem sofre a dor:** profissionais que atendem clientes pelo WhatsApp no computador e recebem muitos áudios. O usuário citou três perfis: médico (ele próprio, que recebe áudios de pacientes), advogado e vendedor. Observação do usuário: pessoas de menor instrução tendem a mandar mais áudios.

🟡 **Quem paga:** [INDEFINIDO, validar com usuário]. O usuário não sabe. Se houver compra, a tendência indicada é a empresa (clínica, escritório, empresa de vendas) pagar, e não o profissional. Os anúncios aparecem como hipótese de monetização, mas, nesse modelo, quem paga é o anunciante, o que configura outro modelo de negócio. A resposta não escolheu entre os dois.

🟡 **Plataforma do público:** [INDEFINIDO, validar com usuário]. O usuário não sabe a proporção entre Mac e Windows nesses perfis. O PRD presume Windows para o usuário leigo.

🟡 **Quem sofre a janela de oportunidade:** o próprio usuário, como autor e fundador do produto.

## Quando dói
🟡 **Para o usuário final:** sempre, a cada áudio recebido. O gatilho é a prolixidade do remetente. Sem a transcrição, o profissional adia a resposta até ter tempo de ouvir; com ela, identifica o assunto de imediato e responde mais rápido.

🟡 **Para quem lança:** agora, enquanto o recurso não é nativo no WhatsApp Web. O prazo de uma eventual integração pela Meta é estimativa do usuário ("muito brevemente"), sem fonte.

## Custo de não fazer
🟡 Perder a oportunidade de mostrar o produto e, com ela, a receita, caso a Meta integre a transcrição antes do lançamento. O usuário não deu número para a perda nem prazo para a integração.

🟡 Efeito sobre o enquadramento: se a janela é curta, o prazo pesa tanto quanto o alcance. Cada frente adicional (Windows, Safari, troca de nome, cobrança) consome tempo dessa janela.

## Job to be done
🟡 Quando eu tenho um produto que já me poupa tempo todos os dias e uma janela curta antes de a Meta oferecer o mesmo recurso, eu quero colocá-lo nas mãos de outros profissionais que recebem muitos áudios de clientes, para conseguir validar a demanda e gerar receita antes que a janela se feche.

(Rascunho proposto pelo framer a partir das respostas e aprovado pelo usuário sem alteração.)

## Fora de escopo declarado
🟡 **Alcance imediato do público-alvo:** o usuário aceitou que um MVP só para Mac com Apple Silicon não o alcance de imediato e que, ainda assim, serve como primeira versão publicada. Não excluiu o Windows; apenas deixou de tratá-lo como condição do primeiro lançamento.

🟡 [INDEFINIDO, validar com usuário] Nada mais foi excluído explicitamente nesta sessão.

🟡 Exclusões herdadas do PRD (seção 5), não reafirmadas aqui: aplicativos de celular do WhatsApp, outros mensageiros, transcrição automática sem clique; transcrição em nuvem fora da primeira versão.

## Âncoras no legado
🟡 **`_reversa_sdd/prd.md`.** A seção 4 já previa a "etapa posterior: distribuição", com publicação na Chrome Web Store, instalação guiada e suporte a máquinas sem Apple Silicon. A seção 5 deixa Firefox e Safari fora da primeira versão. A persona leiga ("profissional autônomo ou de pequeno negócio, provavelmente com Windows") coincide em parte com os perfis citados agora. A linha de compliance (seção 6) trata só do art. 4º, I, da LGPD.

🟡 **`_reversa_sdd/sdd/compatibilidade-instalacao.md`.** Pendências abertas e diretamente ligadas a esta sessão:
- 🟡 OQ-02: adaptador do motor para Windows (whisper.cpp ou faster-whisper).
- 🟡 OQ-03: orçamento para a assinatura dos instaladores (programa de desenvolvedor da Apple, certificado para Windows) e para a hospedagem de instaladores e modelos.
- 🟡 OQ-04: aviso de privacidade, política de privacidade e declaração de uso de dados na loja.
- 🟡 RNF-03 exige zero alertas de desenvolvedor não identificado, o que depende do instalador do macOS assinado e notarizado.
- 🟡 A estratégia de lançamento já prevista é: item não listado na loja, acessível por link, para 5 a 10 pessoas leigas; listagem pública só depois que pelo menos 4 de 5 concluírem a instalação sem ajuda.
- 🟡 NG-06 veda telemetria.
- 🟡 O aplicativo auxiliar aceita conexão só da extensão identificada pelo seu identificador na loja.

🟡 **`_reversa_sdd/sdd/motor-transcricao-local.md`.** NG-01 adia o Whisper no navegador (WebGPU ou WebAssembly); NG-02 adia os adaptadores para máquinas sem Apple Silicon para a etapa de distribuição.

🟡 **`_reversa_sdd/addenda/005-compatibilidade-instalacao.md`.** A página de boas-vindas em seis etapas, a verificação de hardware e a instalação no escopo do usuário estão implementadas.

🟡 **`extension/src/dominio/compatibilidade.ts`.** Aceita macOS 14 ou posterior com Apple Silicon e Windows 10/11 de 64 bits, com pelo menos 8 GB de RAM; recusa Mac com Intel. Para Windows, sugere o arquivo `whispper-windows-x64.exe`, que ainda não existe.

🟡 **`extension/src/onboarding/onboarding.ts`.** O instalador `.pkg` vai embutido no pacote da extensão (`dist/instaladores/`), porque a hospedagem continua em aberto (OQ-03). Na falta do instalador, a página informa a falha e oferece nova tentativa.

🟡 **`extension/manifest.json`.** Nome `whispper-whatsapp-web`, título da ação "Whispper", versão 0.1.0. Permissões: `nativeMessaging`, `storage` e `tabs`. Há um script de conteúdo no mundo MAIN de `web.whatsapp.com` e o campo `key`, que fixa o identificador da extensão. O nome alude a dois produtos de terceiros, o Whisper, da OpenAI, e o WhatsApp, da Meta; a entrada do usuário mencionou só o primeiro.

🟡 **Dados sensíveis do público citado.** Médicos e advogados recebem dados sob sigilo profissional, e a informação de saúde é dado pessoal sensível (LGPD, art. 5º, II, e art. 11). A transcrição local pode ser um diferencial para esse público, mais do que foi no uso pessoal. O legado ainda não trata o tema.

---
Gerado por reversa-framer em 2026-10-04T18:33:35-03:00
Sessão: 001-lancamento-chrome-web-store
