# Reprodução do BUG-20261004-TTLJ no WhatsApp Web (whatsapp-cft)

- Data: 2026-10-04, cerca de 15:57 -03.
- Instrumento: MCP `whatsapp-cft` (Chrome for Testing, perfil `~/.cache/whispper-cft-perfil`, extensão
  carregada de `extension/`), build de 2026-10-02 20:47:22, commit 4518b43
  (`extension/dist/carimbo-build.txt`).
- Conversa: grupo de teste com cinco mensagens de voz enviadas pela conta (balões à direita).
- Viewport de 1200 × 832 px CSS. Área da conversa (`#main`) com 656 px de largura, abaixo dos 726 do modo
  lateral do RF-01: toda janela abre no modo abaixo (RF-02).
- Área das mensagens (Adição 1 do adendo do HVT4): y = 64 (fim do cabeçalho) a 768 (começo da caixa de
  escrita), 704 px. Lista rolada a 318 de 448 px (130 px antes do fim).

## Passos

1. Abrir o grupo: os cinco áudios recebem o ícone "Transcrever áudio".
2. Clicar nos cinco ícones: 11 s depois, os cinco estão em "Áudio transcrito", com cinco janelas.
3. Medir com `evaluate_script`: `getBoundingClientRect` do `msg-container` de cada áudio, das janelas
   (`.whispper-janela`) e de cada seta (`g[data-whispper-seta-de]`); `elementFromPoint` no centro do ▶ e
   em nove pontos ao longo de cada seta.

## Resultado (px CSS)

Balões em x = 807 a 1143; janelas em x = 807 a 1129, na coluna dos balões (RF-02).

| Áudio | Balão (y) | Janela (y) | Balão coberto pela pilha | ▶ sob uma janela |
|---|---|---|---|---|
| 1 | 293 a 382 | 64 a 296 | 87% | sim |
| 2 | 410 a 500 | 304 a 475 | 87% | sim |
| 3 | 528 a 617 | 483 a 694 | 96% | sim |
| 4 | 645 a 735 | 702 a 944 | 87% | não |
| 5 | 763 a 852 | 952 a 1184 | 96% | sim |

| Seta | Caixa (y), em x = 964 a 971 | Pontos visíveis de 9 |
|---|---|---|
| 1 | 289 a 296 | 1 |
| 2 | 406 a 475 | 0 |
| 3 | 483 a 621 | 0 |
| 4 | 702 a 739 | 0 |
| 5 | 768 a 952 | 6, sobre a caixa de escrita e fora da tela |

- Pilha: alturas 232, 171, 211, 242 e 232, com quatro vãos de 8: 1120 px, mais alta que a área (704).
  Pela Adição 2, começa no topo da área (64) e só o excesso passa do fim: as janelas 4 e 5 passam de 768,
  e a 5 fica inteira abaixo da tela (832).
- Cada balão fica coberto quase sempre pela janela do áudio seguinte, que subiu para caber; a seta
  vertical de cada janela corre por trás dela e da vizinha.
- Classificação: determinística na geometria medida (1/1 nesta sessão; o mesmo padrão no print da
  aceitação do HVT4, rodada 1).

## Arquivos

- `modo-abaixo-pilha.png`: print original, recortado à área da conversa; fora do git.
- `modo-abaixo-pilha-desfocado.png`: cópia desfocada (sigma 40); fora do git.
