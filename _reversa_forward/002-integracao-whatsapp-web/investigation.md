# Investigação Técnica: Integração com WhatsApp Web

> Feature: `002-integracao-whatsapp-web`
> Data: 2026-10-01

## 1. Contexto e Desafios

O WhatsApp Web opera como uma Single Page Application (SPA) complexa em React, com virtualização intensa de listas de mensagens (elementos DOM de mensagens fora da viewport são descartados e recriados durante o scroll) e mídias transmitidas em canais cifrados de ponta a ponta (Signal Protocol / Noise).

### Desafio 1: Injeção sem vazamento de memória e sem travar a thread principal
- O DOM é reciclado durante a rolagem. Um `MutationObserver` global ingênuo observando toda a árvore causa Long Tasks (> 50 ms), violando o RNF-01 e degradando a rolagem do usuário.
- **Solução técnica:** O observador restringe sua mira ao container do painel de conversa ativo (`#main` ou container de mensagens). A inserção do botão usa delegação ou identificação por atributo customizado `data-whispper-injected="true"`.

### Desafio 2: Extração de áudio descriptografado sem áudio audível
- Os elementos `<audio>` criados pelo player nativo do WhatsApp apontam para URLs `blob:https://web.whatsapp.com/...`.
- No momento em que uma mensagem de voz é carregada ou quando seu player é inicializado na DOM, o blob URL já contém o fluxo de áudio Ogg/Opus descriptografado pelo WebAssembly interno do WhatsApp.
- Fazer `fetch(blobUrl).then(r => r.arrayBuffer())` dentro do Content Script permite extrair os bytes brutos do áudio instantaneamente em memória, sem chamar `.play()` e sem gerar som.

### Desafio 3: Resiliência a mudanças de classes CSS
- O WhatsApp Web gera classes CSS ofuscadas (ex: `._ak8j`, `._ak8l`) que mudam frequentemente entre releases semanais do WhatsApp.
- **Solução técnica:** Heurísticas baseadas em atributos semânticos estáveis (`[data-id]`, `role="button"`, elementos contendo tags `<audio>`, SVGs com ícones de microfone/fones) encapsulados em `configuracao-estruturas.ts`. Um `MonitorDegradacao` roda na inicialização validando se os seletores essenciais retornam elementos coerentes. Se falhar, muda para estado "degradado" sem lançar exceções não tratadas.
