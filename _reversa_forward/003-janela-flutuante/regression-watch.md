# Vigilância de regressão: Janela Flutuante de Transcrição

> Identificador: `003-janela-flutuante`
> Criado em: `2026-10-01`
> Feature greenfield: não há regras 🟢 extraídas de código existente, por isso o watch principal começa vazio. Os requisitos implementados ficam em "Observações", sem peso de regressão, até que uma extração `/reversa` futura sobre o código novo os confirme como 🟢.

## Watch principal

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|

## Observações

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|
| W201 | `requirements.md#RF-01` | Janela posicionada ao lado do balão com topo alinhado. | presença | Janela desalinhada ou distante do balão. |
| W202 | `requirements.md#RF-05` | Resolução de colisão vertical com gap mínimo de 8 px. | presença | Janelas sobrepondo o texto de outras janelas. |
| W203 | `requirements.md#RF-07` | Dimensões limitadas a 320 px de largura e 240 px de altura máxima. | presença | Janela extrapolando a altura de 240 px sem barra de rolagem. |
| W204 | `requirements.md#RF-09` | Fechamento individual por botão X ou tecla Esc. | presença | Falha ao fechar janela pelo teclado ou clique. |
| W205 | `requirements.md#RF-12` | Adaptação automática ao tema claro e escuro do WhatsApp Web. | presença | Cores ilegíveis no modo escuro. |

## Histórico de re-extrações

<!-- Preenchido pelo agente reverso quando /reversa rodar de novo sobre o código desta feature. -->

## Arquivadas

<!-- Itens que deixaram de valer, com a data e o motivo. -->
