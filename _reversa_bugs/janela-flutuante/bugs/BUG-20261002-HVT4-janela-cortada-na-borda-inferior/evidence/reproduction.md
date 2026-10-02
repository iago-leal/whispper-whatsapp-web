# Cápsula de reprodução: BUG-20261002-HVT4

| Campo | Valor |
|---|---|
| Commit base | `525ac3b` (branch `main`), árvore de `extension/` sem alterações |
| Ambiente | macOS 27.0.1 (Darwin 27.0.0, arm64); Node v26.10.0; Chrome for Testing do cache do Playwright (`chromium-1243`) |
| Página | página neutra (`https://exemplo.test/`, servida pelo protocolo DevTools) com `janela-flutuante.css` e o `GerenciadorDeJanelas` montado do código-fonte |
| Geometria | a do WhatsApp real nas aceitações do A4MZ e do K3DY: tela de 1624 × 907, área da conversa de x = 551 a 1624, área das mensagens até y = 844 (abaixo dela, a caixa de escrita), balões de voz recebidos de 336 × 68 px em x = 613 |
| Data | 2026-10-02 |

O script reproduz também o BUG-20261002-OW7G (cenário 3), corrigido no mesmo plano.

## Comando

```bash
cd extension
node ../_reversa_bugs/janela-flutuante/bugs/BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/reproduzir-hvt4-ow7g.ts
```

- Exit code: 0 (o script mede; não faz asserção)
- Taxa: 4/4 execuções com saídas idênticas; saída integral em `reproduzir-hvt4-ow7g.saida.txt`
- Determinismo: **determinístico**

O script mede o retângulo-alvo de cada janela: a posição do `translate3d` aplicado e o tamanho
desenhado. A transição do `transform` só anima o caminho até esse alvo.

## Resultado

### Cenário 1: o último áudio da conversa, no pé da área das mensagens (critérios 1 e 2)

Balão em y = 739 a 807, como na aceitação do A4MZ.

| Estado da janela | Altura | Janela (y) | Além do fim das mensagens (844) | Além da tela (907) |
|---|---|---|---|---|
| texto longo, no limite do RF-07 | 242 | 739 a 981 | **137 px** | **74 px** |
| erro | 139 | 739 a 878 | **34 px** | 0 |

A medida do texto longo repete a do WhatsApp real (739 a 981, 73 px abaixo da tela na aceitação do
A4MZ). Mesmo a janela de erro, a mais baixa que termina um pedido, cobre a caixa de escrita.

### Cenário 2: cinco áudios consecutivos, a 95 px um do outro (EC-05)

Estados: erro, texto longo, erro, erro, texto médio.

| Janela | Balão (y) | Janela (y) | Altura | Além do fim das mensagens |
|---|---|---|---|---|
| C1 | 149 | 149 a 288 | 139 | 0 |
| C2 | 244 | 296 a 538 | 242 | 0 |
| C3 | 339 | 546 a 685 | 139 | 0 |
| C4 | 434 | 693 a 832 | 139 | 0 |
| C5 | 529 | 840 a 1030 | 190 | **186 px** (123 além da tela) |

A pilha soma 891 px com os vãos; a área das mensagens, da borda do cabeçalho até 844, tem cerca de 785.
Mesmo que coubesse, nada no cálculo a limitaria: o posicionador não recebe borda vertical alguma.

## Leitura

O `calcularPosicoesJanelas` recebe só as bordas horizontais da área (`direitaDaArea`, `esquerdaDaArea`) e
devolve `y` igual ao topo do balão, ao topo do balão mais a altura dele (RF-02) ou ao fim da janela de
cima (colisão). Nenhum dos três caminhos compara o fim da janela com uma borda inferior, que nem chega
ao posicionador: `AdaptadorWhatsAppWeb.obterAreaConversa` devolve só `left` e `right` do `#main`, e o
tipo `FaixaHorizontal` não tem `topo` nem `fundo`.
