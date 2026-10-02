# Aceitação no WhatsApp Web real: BUG-20261002-HVT4 e BUG-20261002-OW7G

| Campo | Valor |
|---|---|
| Quem conferiu | iago, na própria conta; medidas do agente |
| Build | `npm run build` sobre `525ac3b` + HVT4 CHG-001 a 008 + OW7G CHG-001 a 006 (árvore não commitada); saída em `build-aceitacao.txt` |
| Preparação | extensão recarregada em `chrome://extensions` e aba do WhatsApp Web recarregada |
| Instrumento | prints do usuário. A aba do WhatsApp não estava no grupo da automação desta sessão (o grupo antigo se perdeu com a compactação do contexto); as bordas foram medidas em colunas de pixels do print, com `ffmpeg`, por limiar de luminância, sem ler texto. Cópias desfocadas, locais e fora do git (`.gitignore`: `_reversa_bugs/**/*.png`) |

## Rodada 1: área estreita, modo abaixo (2026-10-02, cerca de 19:25 -03)

Print de 3306 × 1822 px. A janela flutuante de 320 px CSS mede cerca de 802 px no print: cerca de 2,5 px
por px CSS. Nesta janela do navegador, a página tem cerca de 1299 px CSS de largura, como na leitura do DOM
das 18:46 (`estrutura-vertical-whatsapp-real.md`), e a área da conversa fica com cerca de 715 px. O modo
lateral do RF-01 precisa de 726 (62 de margem, 336 do balão, 8 de vão, 320 da janela): faltam 11 px, e
toda janela cai no modo abaixo do RF-02. Cópia desfocada: `aceitacao-modo-abaixo-desfocado.png`.

O usuário transcreveu os três últimos áudios recebidos da conversa, rolada até o fim: um com texto, dois
com erro (`FALHA_NA_TRANSCRICAO`, "Falhou após 0 s").

| Medida (px do print) | Valor |
|---|---|
| Fim do cabeçalho (início da primeira mensagem visível) | cerca de 186 |
| Janelas, na coluna x = 1700 | 730 a 1044 (texto), 1073 a 1358 (erro), 1387 a 1673 (erro) |
| Vãos entre janelas | 28 e 28 (cerca de 11 px CSS, com as bordas de 1 px) |
| Início da caixa de escrita (pílula de texto em 1727; rodapé por volta de 1700) | a janela de baixo termina antes dela |
| Ícones dos três áudios (coluna x = 1590), centros | 1080, 1318, 1611 |
| Borda esquerda das janelas | na coluna dos balões (modo abaixo: x da janela igual ao do balão) |

| Critério | Resultado |
|---|---|
| HVT4 1. A janela do áudio no pé da conversa fica inteira na área das mensagens | passou: as três janelas ficam entre o cabeçalho e a caixa de escrita |
| HVT4 2. Rodapé com "Copiar" visível sem rolar | passou na janela com texto |
| HVT4 3. Sem regressão do RF-05/K3DY | passou: nenhuma janela sobreposta |
| OW7G. Seta até o balão certo | **não verificável neste modo**: a seta do modo abaixo é vertical, entre a janela e o balão, e a pilha que subiu para caber cobre os próprios balões; a seta fica por trás das janelas |

### Achado: no modo abaixo, a pilha que sobe para caber cobre os próprios balões

Os centros dos ícones (1080, 1318, 1611) caem dentro da pilha (730 a 1673): as janelas cobrem os balões, e
não só os seguintes. Antes da correção, a pilha do modo abaixo também cobria os balões seguintes (cada
janela abaixo do seu balão, sobre o próximo), mas descia para fora da tela; com a subida do HVT4, cobre
também o próprio balão, e a seta vertical do OW7G fica escondida. O plano tratou a janela única do modo
abaixo no pé da conversa (abre acima do balão, se couber), mas não a pilha. Decisão do usuário (19:27):
fechar HVT4 e OW7G com a aceitação no modo lateral e registrar o modo abaixo com pilha como bug novo,
ligado aos dois, com plano próprio.

## Rodada 2: área larga, modo lateral (2026-10-02, cerca de 19:31 -03)

Zoom da página a 100%: print de 3306 × 1822 px, 2 px por px CSS. Outra conversa, com dois áudios recebidos
consecutivos, seguidos de mensagens; o usuário transcreveu os dois: o de cima terminou em erro, o de baixo
com texto. Cópia desfocada: `aceitacao-modo-lateral-desfocado.png`.

| Medida (px do print; entre parênteses, px CSS) | Valor |
|---|---|
| Balão 1, na coluna x = 1966 | 928 a 1059; centro 993,5 (≈ 497) |
| Borda direita dos balões (queda de luminância) | x ≈ 1977 (988,5) |
| Janela 1 (erro), na coluna x = 2003 | 926 a 1164 (463 a 582; altura 119); topo alinhado ao do balão |
| Borda esquerda das janelas | x = 1992 (996): corredor de 15 px (7,5), dentro da tolerância de 4 px do RF-01 |
| Balão 2 | 1118 a 1249; centro 1183,5 |
| Janela 2 (texto) | 1180 a 1475 (590 a 737,5): deslocada pela janela 1, 15 px (7,5) abaixo dela |
| Seta 1 (pixels verdes #00a884) | reta: linha em y = 992 a 994, de x = 1977 (borda do balão) a 1991 (borda da janela), à altura do centro do balão 1 |
| Seta 2 | cotovelo: ponta em (1977, 1183), no centro do balão 2; trilho em x = 1986 a 1988 (≈ 993,5 CSS; calculado 994,25), de y = 1182 a 1200; cauda entra na janela 2 em y = 1199 a 1200, 20 px (10) abaixo do topo dela |

| Critério | Resultado |
|---|---|
| OW7G (RF-05). Cada janela tem uma seta até o seu balão, inclusive a deslocada | passou: seta reta na janela alinhada, cotovelo na deslocada; as duas pontas no centro do balão certo, na borda dele; o traçado fica no corredor |
| OW7G. A seta fica atrás das janelas e não cobre balão nem janela | passou no print: o traçado termina na borda de cada um; a camada sem cliques e a ordem de pintura são provadas no navegador de teste |
| OW7G. Na rolagem, a seta acompanha | não conferido no WhatsApp real (sem print rolado); provado no navegador de teste ("na rolagem, cada seta acompanha o seu balão e a sua janela") |
| HVT4 3 / RF-01 / RF-05 (sem regressão) | passou: topo da janela 1 alinhado ao balão; janelas sem sobreposição, a 8 px |

Neste print, os dois áudios não estão no pé da conversa; o limite inferior do HVT4 foi conferido na rodada 1.

## Conclusão

- HVT4: critérios 1 a 3 cumpridos no WhatsApp real (rodada 1, modo abaixo, pé da conversa; rodada 2,
  modo lateral, sem regressão), além dos testes automatizados.
- OW7G: seta conferida no WhatsApp real no modo lateral (rodada 2). No modo abaixo com pilha, ela fica
  escondida porque as janelas cobrem os balões: achado da rodada 1, registrado como bug novo por decisão do
  usuário.
