# Cápsula de reprodução: BUG-20261002-IXWO

| Campo | Valor |
|---|---|
| Commit base | `25a57bb` (branch `main`), árvore de `extension/` sem alterações |
| Ambiente | macOS 27.0.1 (Darwin 27.0.0, arm64); Node v26.10.0; Chrome for Testing 153.0.8010.12 (`chromium-1243`, sem interface) |
| Página | página falsa de `web.whatsapp.com` servida pelo protocolo DevTools (`test/suporte/navegador-cdp.ts`), com um balão de voz `data-id="A"` |
| Data | 2026-10-02 |

## Comando 1: reprodução do relato

```bash
cd extension
node <scratchpad>/diag.ts   # cópia de evidence/diagnostico-clique-navegador-de-teste.ts com SAIDA no scratchpad
```

- Exit code: 0 (o script observa; não faz asserção)
- Taxa: 3/3 execuções com a janela no DOM, classe `whispper-janela-oculta`, opacidade 0 e `transform` vazio, 150 ms e 3 s após o clique
- Conteúdo oculto: "Erro: MOTOR_INDISPONIVEL / Falhou após 0 s / Tentar de novo"
- Determinismo: **determinístico**

## Comando 2: experimento causal com a aba em primeiro plano

```bash
cd extension
node ../_reversa_bugs/janela-flutuante/bugs/BUG-20261002-IXWO-janela-invisivel/evidence/experimento-causa-aba-visivel.ts
```

Saída integral em `experimento-causa-aba-visivel.saida.txt`.

1. A aba aberta por `Target.createTarget` nasce em segundo plano (`visibilityState: hidden`) e não desenha quadros: `requestAnimationFrame` não dispara em 1 s. Nessa condição nenhum `scroll` ou `resize` chegaria, o que tornava o primeiro diagnóstico ambíguo.
2. Depois de `Page.bringToFront`, a aba fica `visible` e o `requestAnimationFrame` dispara, como na aba do usuário.
3. Com a aba visível, após o clique a janela continua oculta e sem `transform` aos 150 ms e aos 3 s.
4. Um redimensionamento real (`Emulation.setDeviceMetricsOverride` para 900 × 600, um evento `resize` contado na página), sem nenhuma outra mudança, deixa a janela visível: classe `whispper-janela`, `transform: translate3d(12px, 120px, 0px)`, opacidade 1.

Conclusão: o único insumo que falta à janela é a âncora, e ela só chega por `scroll` ou `resize`.

## Observação lateral (BUG-20261002-A4MZ)

No passo 4, a janela foi para x = 12, à esquerda do balão (x de 340 a 700 numa largura de 900 px): sem 320 px livres à direita, o posicionador usa o lado esquerdo. É o mesmo mecanismo levantado como hipótese no A4MZ, registrado lá como evidência parcial, não como causa.
