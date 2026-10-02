# Aceitação no WhatsApp Web real e execução do reparo: BUG-20261002-XDL5

| Campo | Valor |
|---|---|
| Build | `npm run build` sobre `4d892ea` + CHG-001 a 003 (árvore não commitada), 2026-10-02 20:16; saída em `build-aceitacao.txt` |
| Preparação | iago recarregou a extensão em `chrome://extensions` e a aba do WhatsApp da automação (carregada às 20:19:23) e abriu uma conversa com áudios já atingidos |
| Instrumento | registro do motor (`desempenho.tsv`, só instante, duração e resultado) e, na aba da automação, só tamanhos: entradas do Cache Storage `lru-media-array-buffer-cache`, `size` e `duration` dos modelos, bytes devolvidos pelo download da página sem transferência. Nenhum texto de mensagem lido |

## 1. Testes do usuário com o build corrigido (antes da varredura)

Registro do motor depois do build:

| Instante | Duração do áudio | Processamento | Resultado |
|---|---|---|---|
| 20:19:03 | 24,3 s | 4.139 ms | ok |
| 20:19:09 | 7,7 s | 1.948 ms | ok |
| 20:19:36 | 24,3 s | 2.993 ms | ok |

Antes da correção, as falhas tinham duração 0,0 em 0 a 5 ms (de 19:24 a 19:32, nas aceitações do HVT4/OW7G). Os
áudios da conversa com o botão da extensão incluem o 9DA900 (24 s, estado `concluido` na aba) e o 36E726 (7 s). O
pedido das 20:19:36 veio depois da recarga da aba às 20:19:23: o mesmo áudio de 24 s transcrito antes e depois de
recarregar (critério 1 do bug).

Cache da página, contado na aba antes da varredura:

| Medida | Dry-run das 20:14 (build antigo) | Depois dos testes do usuário |
|---|---|---|
| Entradas | 284 | 284 |
| Vazias | 31 | **29** |
| 9DA900 no cache | (não medido individualmente) | 60.799 bytes = `size` do modelo |
| 36E726 no cache | (não medido individualmente) | 19.268 bytes = `size` do modelo |

Duas entradas vazias deixaram de ser vazias com o total parado: eram entradas que já existiam vazias e foram curadas
pela ponte nova (apagadas pelo `LruMediaStore.del` e regravadas íntegras pelo novo download). Se fossem áudios nunca
baixados, o total teria subido e as vazias continuariam 31. Isso confirma no WhatsApp real a cura do CHG-002 e que o
`del` do `LruMediaStore` apaga o buffer, e não só os metadados (senão o segundo download receberia o vazio de novo).

## 2. Execução do reparo (CHG-005), 2026-10-02 cerca de 20:22 -03

Script `fix/CHG-005-reparo-cache-vazio.js`, com a extensão corrigida já carregada.

| Medida | Dry-run | Execução |
|---|---|---|
| Entradas antes | 284 | 284 |
| Vazias antes | 29 | 29 |
| Reconhecidas pelo `LruMediaStore` | 29 | 29 |
| Sem `filehash` legível | 0 | 0 |
| Impressão digital das vazias | `64e85056f878da73` | `64e85056f878da73` |
| Apagadas pelo `LruMediaStore` | 0 | **29** |
| Apagadas direto no Cache Storage | 0 | **0** |
| Entradas depois | 284 | 255 |
| Vazias depois | 29 | **0** |

As condições aprovadas no Gate 2 valeram: todas as vazias reconhecidas, nenhuma chave malformada; a impressão
digital da execução é a do dry-run imediatamente anterior. A primeira contagem (31, `4b74ec2ee1d28360`, em
`reparo-dry-run.md`) mudou para 29 pelas duas curas do item 1.

## 3. Conferência depois do reparo

Download da própria página, sem transferir o buffer, de dois áudios da conversa que estavam vazios:

| Mensagem | Bytes devolvidos | Assinatura | Tempo | `size` do modelo | Cache depois |
|---|---|---|---|---|---|
| 988DAC | 14.499 | `OggS` | 49 ms | 14.499 | 14.499 |
| DA97DD | 62.182 | `OggS` | 38 ms | 62.182 | 62.182 |

A página baixou os dois de novo do servidor e os regravou íntegros.

## Critérios do bug

| Critério | Resultado |
|---|---|
| 1. O mesmo áudio duas vezes, com recarga entre as duas, produz texto nas duas | passou: 24,3 s às 20:19:03 e às 20:19:36, com a aba recarregada às 20:19:23; também no teste de reprodução |
| 2. A obtenção não deixa objeto da página vazio: o buffer segue com o tamanho | passou: 9DA900 e 36E726 com o `size` do modelo no cache depois da transcrição; também no teste de reprodução |
| 3. Página com 0 bytes: AUDIO_INDISPONIVEL legível, sem ir ao motor | provado nos testes de regressão; no WhatsApp real, não houve caso (todas as vazias foram curadas ou apagadas) |
| 4. Teste que falha no código atual e passa com a correção, com página que reaproveita o buffer | passou: `gate1-vermelho.txt` (5 falhas) e `gate2-verde-suite.txt` |
