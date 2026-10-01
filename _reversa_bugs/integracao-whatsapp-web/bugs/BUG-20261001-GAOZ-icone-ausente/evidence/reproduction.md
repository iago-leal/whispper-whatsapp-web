# Cápsula de reprodução: BUG-20261001-GAOZ

| Campo | Valor |
|---|---|
| Data | 2026-10-01 14:24 -03 |
| Commit base | `9dbd731` (branch `main`) |
| Ambiente | macOS 27.0.1 (26A434), Apple Silicon; Node 24.13.0; esbuild 0.28.2; Google Chrome for Testing 153.0.8010.12 (cache do Playwright, `chromium-1243`), headless |
| Isolamento | Extensão copiada para o scratchpad da sessão, com `dist/content/index.js` reconstruído do HEAD por esbuild; perfil temporário; a página `https://web.whatsapp.com/` é servida por interceptação do protocolo DevTools (`Fetch.fulfillRequest`), sem rede e sem a conta do usuário |
| Script | `evidence/reproduzir.ts` |
| Comando | `node reproduzir.ts <cópia da extensão>` |
| Exit code | 0 nas duas tentativas (o script mede e imprime; não faz asserções) |
| Taxa | 2/2 tentativas reproduziram os dois cenários |
| Determinismo | `deterministic` |

## Página simulada

Estrutura mínima modelada na inspeção de `evidence/console-e-inspecao.md`: `#main` > `div[data-tab="8"][role="application"]` > `div[role="row"]` > `[data-testid="conv-msg-<id>"]` > `[data-testid="msg-container"]` > `button[aria-label="Reproduzir mensagem de voz"]`. Abrir uma conversa remove o `#main` vigente e insere um novo, como o relato descreve para a troca de conversa.

## Saída (idêntica nas duas tentativas)

```text
## S1 relatado: carrega sem conversa, depois abre conversa com áudio
ícones antes de abrir: 0
ícones 500 ms após abrir a conversa A: 0
ícones 2,5 s após abrir a conversa A: 0
console (whispper): [
  '[Whispper] Adaptador em estado degradado. Estruturas ausentes: Array(1)'
]

## S2 controle + troca: carrega COM conversa A aberta, depois troca para B
ícones na conversa A (aberta no carregamento): 1
ícones 500 ms após trocar para B: 0
ícones 500 ms após voltar para A: 0
console (whispper): []
```

## Leitura

- **S1** reproduz o relato: o aviso do console é o mesmo da evidência original e nenhum ícone aparece depois que a conversa abre.
- **S2, primeira linha** é o controle: com `#main` presente no carregamento, o detector e o injetor funcionam e o balão de voz recebe 1 ícone. Os seletores de balão e de mensagem de voz não são a causa deste bug.
- **S2, troca de conversa**: quando `#main` é substituído, nenhum ícone aparece na conversa nova nem no retorno à anterior. O observador continua ligado ao `#main` descartado.
