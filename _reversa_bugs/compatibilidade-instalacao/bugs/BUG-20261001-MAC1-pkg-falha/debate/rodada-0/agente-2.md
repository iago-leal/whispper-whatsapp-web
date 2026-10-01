---
role: solver
round: 0
status: success
---
## Causa/Estratégia
A extensão não deve servir o `.pkg` pelo seu próprio bundle (limites de tamanho). Devemos criar o build do `.pkg` via `pkgbuild` sem senha de administrador (usando `--install-location "$HOME/Library/..."` e flag de domain local). Atualizar a UI do onboarding para lidar com o download externo e avisos do macOS.
