# Verificação Manual do Motor e Extensão no Chrome (Portão T043)

> Feature: `001-motor-transcricao-local`
> Data: 2026-10-01
> Status: Suíte automatizada validada; etapas interativas descritas em `onboarding.md` preparadas.

## 1. Verificação Automatizada

- **Extensão (TypeScript):** 52 testes unitários e de integração de contratos executados com sucesso via `npm test` em `extension/` (incluindo testes de canal falso do Chrome, serialização de protocolo, tratamento de erros e integridade de tipos).
- **Motor Auxiliar (Python):** 121 testes unitários executados com sucesso via `pytest auxiliar/tests` (incluindo decodificação ffmpeg, subprocessos com timeouts, gestão de descritores, watchdog de inatividade e protocolos nativos).

## 2. Roteiro Manual no Chrome (Conforme `onboarding.md`)

As etapas 3 a 6 do guia [onboarding.md](file:///Users/iagoleal/dev/whispper-whatsapp-web/_reversa_forward/001-motor-transcricao-local/onboarding.md) estão prontas para execução interativa:
1. `auxiliar/motor.sh instalar`: registra o manifesto de Native Messaging do Chrome em `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`.
2. Carregamento da extensão em `chrome://extensions/` no modo desenvolvedor apontando para `extension/`.
3. Verificação do service worker e comando de teste `motorDiagnostico.verificar()`.
4. Transcrição de teste disparando `motorDiagnostico.transcreverAmostra()`.
