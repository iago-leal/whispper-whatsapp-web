# Aceitação no WhatsApp Web real: <BUG-ID ou feature>

| Campo | Valor |
|---|---|
| Quem conferiu | <usuário>, na própria conta; medidas do agente |
| Quando | <AAAA-MM-DD HH:MM–HH:MM -03> |
| Build | <conteúdo de extension/dist/carimbo-build.txt> |
| Preparação | extensão recarregada em `chrome://extensions`; aba do WhatsApp Web recarregada |
| Instrumento | <whatsapp-cft · claude-in-chrome · prints medidos com ffmpeg (escala px/px CSS)> |
| Geometria | <largura da área da conversa em px CSS; modo lateral (≥ 726) ou abaixo> |
| Privacidade | só estrutura e estado; do texto, número de palavras; prints desfocados, fora do git |

## Critérios

| # | Critério (como no bug.md ou requirements.md) | Resultado | Medida que sustenta |
|---|---|---|---|
| 1 | <critério> | passou · reprovado · não verificável | <número, contagem, `ack`, coordenada> |

## Rodada 1: <condição> (<hora>)

<O que o usuário fez, o que foi medido, tabelas de medida. Cópias desfocadas: `<nome>-desfocado.png`.>

## Achados laterais

<Candidatos a /reversa-debugger, com contexto provável e relação com este bug. Nenhum corrigido aqui.>
