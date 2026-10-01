# Cápsula de reprodução — BUG-20261001-RMLU

- **Commit base:** `0fcc93a` (branch `main`), árvore de trabalho sem alterações em `extension/`
- **Ambiente:** macOS 27.0.1, Node v24.13.0, Chrome for Testing do cache do Playwright (headless, perfil temporário), extensão desempacotada de `extension/` após `npm run build`
- **Comando:** `node evidence/repro-rmlu.ts [caminho-da-página]` (sem argumento, usa o `default_popup` do manifesto): abre a extensão pelo `Navegador` de `extension/test/suporte/navegador-cdp.ts`, navega até `chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/<página>`, espera 3 s, lê `#motor-status` e `#integracao-status`, clica em "Verificar compatibilidade" e lista as abas novas
- **Exit code:** 0 nas duas execuções (o script observa; não afirma)
- **Taxa:** 3/3 no registro e na reprodução (2 no intake, 1 aqui)
- **Determinismo:** `deterministic`

## Execução 1: a página que o manifesto declara (`popup/index.html`)

```text
default_popup: popup/index.html
motor-status: Verificando o motor…
integracao-status: Verificando…
```

O script não roda: os rótulos ficam no texto estático do HTML. A aba de boas-vindas presente na lista foi aberta pelo `onInstalled` do service worker, não pelo botão, que não tem ouvinte.

## Execução 2: a cópia que o build gera (`dist/popup/index.html`)

```text
default_popup: dist/popup/index.html
motor-status: Indisponível: aplicativo auxiliar não instalado
integracao-status: Aguardando WhatsApp Web
abas novas após o clique: [ 'chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/dist/onboarding/index.html' ]
```

O script roda, consulta o motor e a aba ativa, e o botão abre a página de boas-vindas. O `chrome.tabs.create({ url: 'dist/onboarding/index.html' })` de `src/popup/popup.ts` resolve o caminho a partir da raiz da extensão, de modo que ele não precisa mudar. O motor aparece indisponível porque o Chrome for Testing procura o host nativo em pasta própria, fora do escopo deste bug.

## Prova estática

`extension/test/manifesto.test.ts` (rascunho rodado numa cópia descartável de `extension/`) falha com o manifesto atual (`actual: [ 'popup/popup.js' ]`) e passa com `"default_popup": "dist/popup/index.html"`.
