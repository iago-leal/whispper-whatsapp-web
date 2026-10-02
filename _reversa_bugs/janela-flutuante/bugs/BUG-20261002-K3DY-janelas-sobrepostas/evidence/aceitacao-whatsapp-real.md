# Aceitação no WhatsApp Web real: BUG-20261002-K3DY

| Campo | Valor |
|---|---|
| Data | 2026-10-02, cerca de 18:05–18:10 -03 |
| Quem conferiu | iago, na própria conta; medidas do agente |
| Build | `npm run build` de 2026-10-02 sobre `75e027c` + CHG-001 a CHG-005 (árvore não commitada); saída em `build-aceitacao.txt` |
| Preparação | extensão recarregada em `chrome://extensions` e aba do WhatsApp Web recarregada |
| Instrumento | print do usuário (3306 × 1822 px, tela Retina: 2 px reais por px CSS). Esta sessão não alcançava a aba da automação, e abrir outro WhatsApp Web tomaria a sessão da aba do usuário; por isso, as bordas foram medidas em colunas e linhas de pixels do print, com `ffmpeg`, por limiar de luminância, sem ler texto. Cópia desfocada, local e fora do git: `aceitacao-whatsapp-real-desfocado.png` |

O usuário abriu uma conversa com quatro áudios recebidos consecutivos e clicou nos ícones. Três janelas
terminaram em erro (`FALHA_NA_TRANSCRICAO`, "Falhou após 0 s") e uma com o texto, no limite de altura e
com rolagem interna.

## Medidas (px CSS)

Balões medidos na coluna x = 826; janelas, na coluna x = 1002, junto à borda esquerda e fora do texto.

| Áudio | Balão (y) | Janela (y) | Altura | Posição | Vão até a janela de cima |
|---|---|---|---|---|---|
| 1 | 149,0 a 217,0 | 149,0 a 268,5 | 119,5 (erro) | topo alinhado ao balão | — |
| 2 | 244,0 a 311,0 | 276,0 a 518,0 | **242,0** (texto, no limite do RF-07) | deslocada pela 1 | 7,5 |
| 3 | 339,0 a 406,0 | 526,0 a 645,5 | 119,5 (erro) | deslocada pela 2 | 8,0 |
| 4 | 434,0 a 501,0 | 653,0 a 772,5 | 119,5 (erro) | deslocada pela 3 | 7,5 |

Na horizontal (linha y = 152,5), o balão do áudio 1 vai de x = 653 a 987, e a janela de 997 a 1317: folga de
8 a 10 px, conforme a borda de 1 px e o antisserrilhado caiam abaixo ou acima do limiar; dentro da
tolerância de 4 px do RF-01.

Com o código anterior, a janela 3 desceria só até 317 + 168 = 485 e cobriria 74 px da janela 2
(276 a 518 na medida real; 317 a 559 no cálculo antigo). Na medida real, ela começa 8 px abaixo do fim da 2.

## Critérios de aceitação

| Critério | Resultado |
|---|---|
| 1. Janelas consecutivas sem sobreposição, com alturas diferentes e uma no limite de 240 px | passou no WhatsApp real com quatro áudios (dois tamanhos, 119,5 e 242 px; vãos de 7,5 a 8 px) e no navegador de teste com cinco |
| 2. A janela que cresce ao concluir desloca as de baixo | passou no navegador de teste; no WhatsApp real, o estado final é compatível (a janela de texto concluiu em 3,1 s, depois das de erro, e as de baixo estão sob ela), mas o print não mostra a ordem dos eventos |
| 3. Teste que falha com a altura fixa e passa com a correção | passou: `gate1-vermelho.txt` e `gate2-verde-suite.txt` |
| RF-01 da janela (sem regressão) | topo da janela 1 alinhado ao balão; folga lateral de 8 a 10 px |

## Achados fora do escopo, na mesma conferência

1. **Seta do RF-05 ausente.** As janelas 2, 3 e 4 ficaram 32, 187 e 219 px abaixo dos seus balões, sem
   nenhuma ligação visual a eles; a 4 fica abaixo de todos os balões de voz, ao lado das mensagens
   enviadas. O RF-05 e a seção 8 da spec pedem
   "uma seta que a liga ao balão de origem", e o código não tem seta (nenhuma ocorrência de seta no
   script de conteúdo nem na folha de estilos). Com a altura real, os deslocamentos ficaram maiores, e a
   falta da seta, mais visível. Candidato a bug no contexto `janela-flutuante`.
2. **Erro em áudios já transcritos (XDL5).** O usuário relatou que só um dos quatro áudios ainda não tinha
   sido transcrito; os outros três falharam com `FALHA_NA_TRANSCRICAO` após 0 s, mesmo com a extensão e a
   aba recarregadas. Dado para o diagnóstico do BUG-20261002-XDL5, cuja hipótese (o `ArrayBuffer`
   esvaziado pela transferência na ponte) vale dentro de uma mesma carga da página; não está claro se as
   transcrições anteriores foram antes ou depois da recarga.
