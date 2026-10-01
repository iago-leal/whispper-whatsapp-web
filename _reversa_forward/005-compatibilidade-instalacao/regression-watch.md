# Monitoramento de Regressão — Compatibilidade e Instalação Guiada

**Feature ID:** `005`
**Componente:** `compatibilidade-instalacao`
**Data:** 2026-10-01

---

## 1. Verificações Automatizadas

| Alvo | Comando | Resultado |
|---|---|---|
| Suíte da extensão (Node.js) | `npm test` em `extension/` | 83 testes (82 aprovados, 1 skipped) |
| Suíte do aplicativo auxiliar | `pytest auxiliar/tests` | 127 testes (121 aprovados, 6 skipped) |
| Compilação e empacotamento | `npm run build` em `extension/` | Sucesso (código de saída 0) |

## 2. Invariantes Críticas Monitoradas
- **Aviso prévio:** computadores incompatíveis são barrados antes de qualquer download.
- **Linguagem sem jargão:** mensagens para o usuário leigo nunca usam siglas ou termos crípticos sem contextualização.
- **Escopo de usuário:** instalação sem necessidade de `sudo` ou privilégios elevados.
