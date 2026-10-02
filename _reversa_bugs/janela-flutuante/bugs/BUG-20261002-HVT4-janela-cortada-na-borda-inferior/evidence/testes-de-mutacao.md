# Testes de mutação das guardas de abertura (HVT4 e OW7G)

| Campo | Valor |
|---|---|
| Data | 2026-10-02, cerca de 19:05–19:10 -03 |
| Onde | cópia isolada da extensão, fora do projeto, com a correção completa (HVT4 + OW7G) e os testes finais |
| Comando | `node --test --test-reporter=spec test/janelas-no-navegador.test.ts`, com o arquivo inteiro: o filtro `--test-name-pattern` não alcança os subtestes, porque o teste pai não casa o padrão |
| Objetivo | saber se as duas guardas de regressão da abertura falham quando a proteção que defendem é retirada |

Cada mutação foi aplicada ao `gerenciador-janelas.ts` da cópia e desfeita em seguida; o arquivo restaurado
foi conferido byte a byte.

| Mutação | Guarda | Resultado |
|---|---|---|
| 1. Sem `whispper-janela-entrando` no `abrir` (a janela entra com a transição ligada) | "a janela nova aberta no pé da conversa entra na página já no lugar, sem deslizar (RF-01; lição do K3DY)" | **morta**: a guarda falha (10 passam, 2 falham, contando a suíte) |
| 2. Seta desenhada antes de a janela entrar na página (sem `if (!reg.elemento?.isConnected) return;` no `desenharSeta`), com o cenário do rascunho (L1 em 149, L2 em 244) | "a seta da janela nova nasce no lugar…" | **sobreviveu**: a posição provisória da L2 coincidia com a final, e a guarda não era exercida |
| 2'. A mesma mutação com a L2 no pé da conversa (L1 em 149, L2 em 780) | idem | **sobreviveu**: com o fundo da janela preso a 836, a cauda da seta também fica presa ao fundo, igual na posição provisória e na final |
| 2''. A mesma mutação com L1 alta em 560 e L2 em 600 (cenário adotado no teste) | "a seta da janela nova nasce no lugar, mesmo quando a altura medida a move, e fechar a janela leva a seta junto (OW7G)" | **morta**: `{"animacoes":1,"alvo":"path(\"M 957 752 H 954.75 V 634 H 949\")","desenhado":"path(\"M 957 686 H 954.75 V 634 H 949\")"}`; a cauda nasceria em 686 e deslizaria até 752 |

## Leitura

- A guarda do HVT4 discrimina: sem a classe que suspende a transição, a janela recém-entrada no pé da
  conversa desliza da posição calculada com a altura suposta (160 px) até a medida.
- A guarda do OW7G só discrimina quando a cauda da seta depende da altura medida da janela nova. Isso
  ocorre quando a cauda sai a 10 px do topo de uma janela empurrada para baixo do balão e presa ao fundo
  da área. O teste do Gate 1 foi montado nesse cenário depois das mutações 2 e 2'.
- Com a correção completa, as duas guardas passam: `gate2-verde-suite.txt`.
