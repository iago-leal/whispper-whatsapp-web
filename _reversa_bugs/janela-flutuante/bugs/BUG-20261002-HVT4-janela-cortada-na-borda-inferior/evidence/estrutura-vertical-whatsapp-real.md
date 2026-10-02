# Estrutura vertical da conversa no WhatsApp Web real

| Campo | Valor |
|---|---|
| Data | 2026-10-02, 18:46 -03 |
| Quem | iago abriu a conversa na aba do WhatsApp Web, movida para o grupo da automação; leitura do agente |
| Instrumento | um script de leitura na aba, que devolveu só retângulos (px CSS), `data-testid`, `role`, `data-tab`, `overflow-y`, `display` e alturas de rolagem; nenhum texto |
| Tela | 1299 × 726 |
| Objetivo | saber qual elemento delimita, na vertical, a área visível das mensagens, para a medida do `obterAreaConversa` (plano, seção 3.1) e para a página falsa dos testes de integração (CHG-003) |

## Filhos do `#main`

`#main` é `div[data-testid="conversation-panel-wrapper"]`, `display: flex`, de y = 0 a 726 (a altura da tela).

| Filho | `data-testid` | y | Altura |
|---|---|---|---|
| `DIV` | `conversation-background-default_chat_wallpaper` | 0 a 726 | 726 (fundo, atrás de tudo) |
| `HEADER` | `conversation-header` | 0 a 64 | 64 |
| `DIV` | `conversation-panel-body` | 64 a 662 | 598 |
| `DIV` | — | 662 | 0 |
| `FOOTER` (contém `compose-box`) | — | 662 a 726 | 64 |
| `SPAN` | — | 64 | 0 |

## Da lista de mensagens até o `#main`

| Elemento | `data-testid` | `overflow-y` | y | Altura (rolagem / visível) |
|---|---|---|---|---|
| `DIV[data-tab="8"]` (casa `containerMensagens`; sem `role`) | — | `visible` | −1583 a 1696 | 3279 |
| `DIV` | `conversation-panel-messages` | **`scroll`** | **64 a 662** | 3356 / 598 |
| `DIV` | — | `visible` | 64 a 662 | 598 |
| `DIV` | — | `visible` | 64 a 662 | 598 |
| `DIV` | `conversation-panel-body` | `visible` | 64 a 662 | 598 |
| `DIV#main` | `conversation-panel-wrapper` | `visible` | 0 a 726 | 726 |

O seletor `containerMensagens` casa um só elemento no `#main`.

## Leitura

- A lista (`data-tab="8"`) é o conteúdo rolado: tem a altura de todas as mensagens carregadas e passa das
  bordas da tela. Não pode limitar a área.
- Quem recorta é o pai dela, `conversation-panel-messages`, o único ancestral até o `#main` com
  `overflow-y` diferente de `visible`. O retângulo dele, de 64 a 662, vai exatamente do fim do cabeçalho ao
  começo da caixa de escrita.
- A interseção do plano (o `#main`, a tela e os ancestrais da lista que a recortam) dá 64 a 662 sem
  depender de nenhum `data-testid`; a lista só entraria se recortasse.
- Coerente com a aceitação do A4MZ, numa tela de 907: área das mensagens até 844 = 907 − 63.
- Dois balões de voz (`msg-container`) medidos: 336 × 67 px, x de 646 a 982; um deles visível, em
  y = 284 a 351.

A página falsa dos testes de integração (CHG-003) copia esta cadeia: `#main` em coluna com a altura da
tela, cabeçalho de 64 px, `conversation-panel-body` > dois `div` > `conversation-panel-messages` rolável >
lista `div[data-tab="8"]`, e rodapé de 64 px com `compose-box`.
