# Perguntas e Premissas: Janela Flutuante

> Feature: `003-janela-flutuante`
> Data: 2026-10-01

## 1. Premissas Adotadas no Plano

- **Largura e dimensões:** Largura padrão fixada em 320 px com altura máxima de 240 px e rolagem interna (`overflow-y: auto`), conforme RF-07.
- **Detecção de tema:** A janela inspeciona a classe `dark` no elemento `body` ou `html` do WhatsApp Web para aplicar automaticamente o esquema de cores escuro ou claro, adaptando-se em tempo real via MutationObserver ou CSS variables.
- **Conector visual:** Em caso de deslocamento vertical por colisão com janela adjacente, uma linha/seta SVG conecta suavemente a borda da janela ao balão de origem.
