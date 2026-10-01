# Ações de Implementação — Compatibilidade e Instalação Guiada

**Feature ID:** `005`
**Componente:** `compatibilidade-instalacao`
**Status:** Concluído

---

### Ações

- [X] **ACT-005-01**: Implementar módulo de domínio `extension/src/dominio/compatibilidade.ts` com regras de compatibilidade inicial e mensagens sem jargão.
- [X] **ACT-005-02**: Criar interface visual de boas-vindas em `extension/onboarding/index.html` e `extension/onboarding/onboarding.css` cobrindo as 6 etapas.
- [X] **ACT-005-03**: Implementar controlador `extension/src/onboarding/onboarding.ts` gerenciando o ciclo de vida, persistência da etapa, polling do motor e teste fim-a-fim.
- [X] **ACT-005-04**: Integrar gatilho de instalação no `extension/src/background.ts` (`chrome.runtime.onInstalled`) e botão "Verificar compatibilidade" no popup.
- [X] **ACT-005-05**: Criar scripts de instalação e desinstalação de escopo de usuário sem root em `auxiliar/instalar_usuario.sh` e `auxiliar/desinstalar_usuario.sh`.
- [X] **ACT-005-06**: Atualizar script de build em `extension/package.json` para empacotar a página de onboarding.
- [X] **ACT-005-07**: Criar suíte de testes unitários em `extension/test/compatibilidade.test.ts`.
- [X] **ACT-005-08**: Validar compilação (`npm run build`) e execução de testes (`npm test` e `pytest`).
