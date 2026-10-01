# Perguntas e Premissas: Integração com o WhatsApp Web

> Feature: `002-integracao-whatsapp-web`
> Data: 2026-10-01
> Modo: autônomo (premissas adotadas sem parada interativa)

## 1. Dúvida 1: Estado de reprodução em download forçado
- **Descrição:** Se o mecanismo interno da página do WhatsApp Web forçar a marcação de áudio como ouvido no momento do download de mídia não pré-carregada, a transcrição deve aceitar essa marcação ou falhar com aviso ao usuário?
- **Premissa adotada no plano:** O extrator priorizará o blob já descriptografado em cache da sessão. Caso a mídia precise ser requisitada e não haja como evitar o disparo de evento de reprodução no servidor sem engenharia reversa profunda e instável da cifra proprietária do WhatsApp, o sistema emitirá aviso ao usuário no primeiro uso ("A obtenção deste áudio pode marcá-lo como ouvido no servidor"), mas prosseguirá com a transcrição para não bloquear a entrega.

## 2. Dúvida 2: Posição do botão de transcrição no balão
- **Descrição:** O botão deve ser posicionado antes do controle de play nativo ou ao final da barra de onda sonora/duração?
- **Premissa adotada no plano:** O botão de transcrição será injetado imediatamente à direita do contador de duração / barra de controle do player, mantendo o botão de play nativo à esquerda desobstruído e respeitando a margem visual nativa do balão.
