# Cápsula de reprodução: BUG-20261002-OW7G

| Campo | Valor |
|---|---|
| Commit base | `525ac3b` (branch `main`), árvore de `extension/` sem alterações |
| Ambiente | macOS 27.0.1 (Darwin 27.0.0, arm64); Node v26.10.0; Chrome for Testing do cache do Playwright (`chromium-1243`) |
| Script | o do plano único com o BUG-20261002-HVT4: `../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/reproduzir-hvt4-ow7g.ts`, cenário 3 |
| Geometria | a do WhatsApp real na aceitação do K3DY: tela de 1624 × 907, área da conversa de x = 551 a 1624, quatro balões de voz recebidos de 336 × 68 px em x = 613 e y = 149, 244, 339 e 434 |
| Data | 2026-10-02 |

## Comando

```bash
cd extension
node ../_reversa_bugs/janela-flutuante/bugs/BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/reproduzir-hvt4-ow7g.ts
```

- Exit code: 0 (o script mede; não faz asserção)
- Taxa: 4/4 execuções com saídas idênticas; saída integral em
  `../BUG-20261002-HVT4-janela-cortada-na-borda-inferior/evidence/reproduzir-hvt4-ow7g.saida.txt`
- Determinismo: **determinístico**

## Resultado: cenário 3, quatro áudios com os estados da aceitação do K3DY

Estados: erro, texto longo, erro, erro. Para cada janela, o script procura qualquer coisa que a ligue ao
balão: elemento no container além das janelas, filho com "seta" na classe, pseudoelemento `::before` ou
`::after` com conteúdo. E pergunta ao posicionador, com as mesmas alturas, se a janela foi deslocada.

| Janela | Balão (y) | Janela (y) | Abaixo do balão | Centro do balão ao lado da janela | `deslocadaPorColisao` | Seta ou ligação |
|---|---|---|---|---|---|---|
| S1 | 149 | 149 | 0 | sim | false | nenhuma |
| S2 | 244 | 296 | 52 | não | **true** | nenhuma |
| S3 | 339 | 546 | 207 | não | **true** | nenhuma |
| S4 | 434 | 693 | 259 | não | **true** | nenhuma |

Elementos no container além das janelas: 0.

A sequência repete a do WhatsApp real (janelas 32, 187 e 219 px abaixo dos balões, com a janela de erro de
119,5 px; aqui ela tem 139, pela fonte do navegador de teste). Nas três deslocadas, o centro do balão nem
fica à altura da janela: uma ponta de seta presa à borda da janela, à moda de um balão de diálogo, só
alcançaria o balão certo na S1.

## Leitura

O posicionador calcula `deslocadaPorColisao` e o devolve em cada `PosicaoCalculada`, mas
`GerenciadorDeJanelas.recalcularPosicoes` lê só `visivel`, `x` e `y`; nenhum outro consumidor existe. A
janela (`janela-elemento.ts`) e a folha de estilos (`janela-flutuante.css`) não têm elemento, classe nem
pseudoelemento de seta, e a palavra não aparece em `extension/src`. Desde o primeiro commit das janelas
(`bab1e53`), o requisito Must foi entregue sem a seta.
