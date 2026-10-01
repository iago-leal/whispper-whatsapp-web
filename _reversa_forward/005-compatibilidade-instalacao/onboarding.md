# Onboarding — Compatibilidade e Instalação Guiada

**Feature ID:** `005`
**Componente:** `compatibilidade-instalacao`

---

## 1. O que este componente faz
Conduz a experiência de boas-vindas do usuário leigo: apresenta termos de privacidade, afere compatibilidade do computador antes de qualquer download, entrega o instalador de pacote de usuário (macOS/Windows), acompanha o download do modelo e roda uma transcrição de teste com o áudio sintético.

## 2. Estrutura de Arquivos
- `extension/src/dominio/compatibilidade.ts`: Lógica de regras de compatibilidade puras de hardware.
- `extension/src/onboarding/onboarding.ts`: Controlador da página de boas-vindas.
- `extension/onboarding/index.html` e `onboarding.css`: Interface com as 6 etapas.
- `auxiliar/instalar_usuario.sh` e `auxiliar/desinstalar_usuario.sh`: Scripts para o instalador.
