# Roadmap — Compatibilidade e Instalação Guiada

**Feature ID:** `005`
**Componente:** `compatibilidade-instalacao`
**Status:** Planejado

---

## Fases de Implementação

### Fase 1: Domínio da Compatibilidade e Regras de Negócio
- Implementar `extension/src/dominio/compatibilidade.ts` com regras de avaliação inicial (SO, CPU, RAM) sem jargões.

### Fase 2: Interface da Página de Boas-Vindas
- Criar `extension/onboarding/index.html` e `extension/onboarding/onboarding.css` com navegação visual pelas 6 etapas.
- Implementar `extension/src/onboarding/onboarding.ts` gerenciando o avanço de etapas, polling do motor a cada 3 s e transcrição de teste com o áudio empacotado.

### Fase 3: Gatilhos do Chrome e Painel
- Adicionar escuta de `chrome.runtime.onInstalled` no `background.ts` para abrir `onboarding/index.html` na primeira instalação.
- Adicionar botão "Verificar compatibilidade" no popup da extensão.

### Fase 4: Scripts de Instalação e Testes
- Adicionar scripts de instalação e desinstalação para o usuário local no aplicativo auxiliar (`auxiliar/instalar_usuario.sh` e `auxiliar/desinstalar_usuario.sh`).
- Desenvolver suíte de testes unitários em `extension/test/compatibilidade.test.ts`.
- Validar builds e testes automatizados.
