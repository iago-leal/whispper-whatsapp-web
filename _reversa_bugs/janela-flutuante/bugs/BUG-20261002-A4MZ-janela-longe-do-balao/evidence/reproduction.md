# Cápsula de reprodução: BUG-20261002-A4MZ

| Campo | Valor |
|---|---|
| Commit base | `bb174a2` (branch `main`), árvore de `extension/` sem alterações |
| Ambiente | macOS 27.0.1 (Darwin 27.0.0, arm64); Node v26.10.0; Chrome for Testing 153.0.8010.12 (`chromium-1243`) |
| Página | página falsa de `web.whatsapp.com` servida pelo protocolo DevTools (`test/suporte/navegador-cdp.ts`), com a geometria do print do usuário: tela de 1316 × 806, lista de conversas (`#side`) de x = 0 a 488 e, no `#main`, um áudio recebido (`R`) e um enviado (`E`), cada um com balão de 335 px dentro de uma linha da largura do painel |
| Data | 2026-10-02 |

## Comando

```bash
cd extension
node ../_reversa_bugs/janela-flutuante/bugs/BUG-20261002-A4MZ-janela-longe-do-balao/evidence/reproduzir-a4mz.ts
```

- Exit code: 0 (o script mede; não faz asserção)
- Taxa: 3/3 execuções com saídas idênticas; saída integral em `reproduzir-a4mz.saida.txt`
- Determinismo: **determinístico**

## Resultado

| Áudio | `conv-msg[data-id]` (âncora atual) | Balão visível (`msg-container`) | Janela | Cobre a lista de conversas |
|---|---|---|---|---|
| Recebido | x 488 a 1316 (828 px) | x 550 a 885 | x 160 a 482 | sim |
| Enviado | x 488 a 1316 (828 px) | x 919 a 1254 | x 160 a 482 | sim |

A janela do recebido abre em x = 160, o mesmo valor do print do usuário (janelas entre x ≈ 160 e 480,
balões entre x ≈ 550 e 885). A conta fecha: sem espaço à direita da âncora (1316 − 1316 − 8 < 320), o
posicionador usa o espaço à esquerda medido na tela inteira (488 − 8 = 480 ≥ 320) e põe a janela em
488 − 320 − 8 = 160. O enviado cai no mesmo ramo, e a colisão vertical o empurra para baixo da primeira.

## Conferência no WhatsApp Web real

A medida da âncora no WhatsApp real, que o registro pedia, está em `conferencia-whatsapp-real.md`.
