# Monitoramento de Regressão — Núcleo de Transcrição

**Feature ID:** `004`
**Componente:** `nucleo-transcricao`
**Data:** 2026-10-01

---

## 1. Verificações Automatizadas

| Alvo | Comando | Resultado |
|---|---|---|
| Testes unitários do núcleo e adaptadores (Node.js) | `npm test` em `extension/` | 76 testes (75 aprovados, 1 skipped de modelo real) |
| Testes do aplicativo auxiliar Python | `pytest auxiliar/tests` | 127 testes (121 aprovados, 6 skipped) |
| Build e empacotamento TypeScript | `npm run build` em `extension/` | Sucesso (código de saída 0) |

## 2. Invariantes Críticas Monitoradas
- **FIFO estrito:** pedidos sucessivos nunca entram em concorrência na porta do motor.
- **Cache volátil:** reabertura de janelas previamente transcritas na sessão responde em tempo de microsegundos sem chamar o motor.
- **Isolamento de Domínio:** `extension/src/dominio/` possui zero referências a APIs de navegador ou DOM.
