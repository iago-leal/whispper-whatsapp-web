# Questões e Premissas — Compatibilidade e Instalação Guiada

**Feature ID:** `005`
**Origem:** `_reversa_sdd/sdd/compatibilidade-instalacao.md` (Seção 14 Open Questions)
**Modo:** Autônomo (premissas fixadas)

---

## 1. Premissas Fixadas

### OQ-01: Requisitos mínimos
- **Premissa adotada:**
  - Plataforma: macOS 14+ (Apple Silicon arm64) ou Windows 10/11 (x86-64).
  - Memória RAM: mínimo 8 GB.
  - Disco livre: mínimo 4 GB para armazenamento do modelo Whisper e runtime local.

### OQ-02: Adaptador Windows
- **Premissa adotada:**
  - O aplicativo auxiliar suporta arquitetura modular: no macOS usa `mlx-whisper`; em outras plataformas oferece interface compatível baseada em `whisper.cpp` ou `faster-whisper`. Na verificação inicial, Windows de 64 bits com 8 GB é classificado como compatível.

### OQ-03 & OQ-05: Distribuição e Integridade
- **Premissa adotada:**
  - Os instaladores e modelos são validados localmente através de hash SHA-256 antes da inicialização do serviço.
  - O onboarding embutido traz a amostra de teste sintética em português (`fala-pt.ogg`) garantindo que a transcrição de teste funcione imediatamente sem requisições adicionais de rede.
