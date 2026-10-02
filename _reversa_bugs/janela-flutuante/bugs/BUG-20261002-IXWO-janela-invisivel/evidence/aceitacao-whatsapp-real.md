# Aceitação no WhatsApp Web real: BUG-20261002-IXWO

| Campo | Valor |
|---|---|
| Data | 2026-10-02, relato recebido às 16:03 -03 |
| Quem conferiu | iago, na própria conta, no Chrome do Mac |
| Build | `npm run build` de 2026-10-02 15:56 sobre `25a57bb` + CHG-001 a CHG-006 (árvore não commitada); saída em `build-aceitacao.txt` |
| Preparação | extensão recarregada em `chrome://extensions` e aba do WhatsApp Web recarregada |

## Roteiro e resultado

Conversa com mensagem de voz aberta, sem rolar depois do carregamento; clique no ícone de um áudio ainda não transcrito na aba.

| Item | Esperado | Resultado |
|---|---|---|
| (a) | Sem rolar, a janela aparece na hora, com "Transcrevendo… N s" contando junto com o ícone | passou |
| (b) | O texto surge no mesmo instante em que o ícone fica verde | passou |
| (c) | Rolar leva a janela junto, ela some com o balão fora da tela e volta com o mesmo texto | passou |

Relato do usuário: "a, b e c — funcionaram perfeitamente."

## Cobertura

- Critério 1 (visível sem rolagem) e critério 3 (ícone e texto no mesmo instante), no ambiente real em que o defeito foi relatado.
- Estado concluído (critério 2), que o navegador de teste não alcança porque a página falsa não entrega áudio ao motor.
- Critério 4 (RF-03), sem regressão.

Posição e sobreposição não fizeram parte desta aceitação: seguem abertas no BUG-20261002-A4MZ e no BUG-20261002-K3DY. Não houve gravação de tela, de modo que nenhuma conversa real entrou no repositório.
