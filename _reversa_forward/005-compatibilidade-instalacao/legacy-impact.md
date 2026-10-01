# Impacto no Legado — Compatibilidade e Instalação Guiada

**Feature ID:** `005`
**Componente:** `compatibilidade-instalacao`
**Data:** 2026-10-01

---

## 1. Arquivos Criados
- `extension/src/dominio/compatibilidade.ts` (regras puras de validação de hardware)
- `extension/src/onboarding/onboarding.ts` (controlador da jornada do usuário leigo)
- `extension/onboarding/index.html` e `extension/onboarding/onboarding.css` (UI de onboarding em 6 etapas)
- `auxiliar/instalar_usuario.sh` (instalador amigável sem privilégios de administrador)
- `auxiliar/desinstalar_usuario.sh` (desinstalador limpo)
- `extension/test/compatibilidade.test.ts` (testes de compatibilidade)

## 2. Arquivos Modificados
- `extension/package.json`: inclusão de `dist/onboarding` e assets estáticos no build.
- `extension/src/background.ts`: inclusão do listener `chrome.runtime.onInstalled` para abertura automática da tela de onboarding.
- `extension/popup/index.html` e `extension/src/popup/popup.ts`: botão para reabrir a verificação de compatibilidade sob demanda.

## 3. Avaliação de Risco e Quebra
- Zero regressão. O onboarding e a verificação de compatibilidade são aditivos e não alteram a comunicação em tempo de execução das demais portas do WhatsApp Web ou do Motor de Transcrição.
