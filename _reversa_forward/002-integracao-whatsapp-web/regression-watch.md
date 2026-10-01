# Vigilância de regressão: Integração com WhatsApp Web

> Identificador: `002-integracao-whatsapp-web`
> Criado em: `2026-10-01`
> Feature greenfield: não há regras 🟢 extraídas de código existente, por isso o watch principal começa vazio. Os requisitos implementados ficam em "Observações", sem peso de regressão, até que uma extração `/reversa` futura sobre o código novo os confirme como 🟢.

## Watch principal

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|

## Observações

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|
| W101 | `requirements.md#RF-01` | Inserção de botão em todas as mensagens de voz válidas. | presença | Áudios sem o botão do Whispper visível. |
| W102 | `requirements.md#RF-02` | Idempotência: exatamente um botão por mensagem de áudio. | presença | Duplicação de botões ao rolar o histórico. |
| W103 | `requirements.md#RF-06` | Obtenção do áudio decifrado sem emitir som pelos alto-falantes. | ausência | Som reproduzido ao clicar no botão de transcrever. |
| W104 | `requirements.md#RF-11` | Estado degradado seguro quando seletores essenciais falharem. | presença | Erros não tratados ou quebra da página do WhatsApp Web. |
| W105 | `requirements.md#RF-13` | Seletores de DOM isolados exclusivamente em configuracao-estruturas.ts. | ausência | Seletores de classes ou IDs espalhados em outros módulos. |

## Histórico de re-extrações

<!-- Preenchido pelo agente reverso quando /reversa rodar de novo sobre o código desta feature. -->

## Arquivadas

<!-- Itens que deixaram de valer, com a data e o motivo. -->
