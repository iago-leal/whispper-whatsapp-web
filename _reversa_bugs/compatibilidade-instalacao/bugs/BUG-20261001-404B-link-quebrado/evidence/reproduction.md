# Cápsula de reprodução · BUG-20261001-404B

## 1. Reprodução no estado atual (2026-10-01, `/reversa-debugger-fix`)

- **Commit base:** `9f0c6a9` (branch `main`), extensão construída em `extension/dist/` (build de 16:16, com o `.pkg` embutido)
- **Ambiente:** macOS 27.0.1 (Apple Silicon), Node v26.10.0, Google Chrome for Testing 147.0.7727.15 headless, perfil temporário, extensão desempacotada `femjlfnijaboogbcdionddnjcjpfmieg`
- **Comando:** `cd extension && node ../_reversa_bugs/compatibilidade-instalacao/bugs/BUG-20261001-404B-link-quebrado/evidence/repro-404b.ts` (script em [repro-404b.ts](repro-404b.ts); não instala nada)
- **Exit code:** 0 em todas as execuções
- **Taxa:** 3/3 execuções com o mesmo resultado nos dois cenários
- **Classificação:** determinístico
- **Saída completa:** [repro-head-9f0c6a9.txt](repro-head-9f0c6a9.txt)

| Cenário | `href` do botão "Baixar Instalador" | Recurso | Download | Aviso na etapa 3 |
|---|---|---|---|---|
| A: macOS (UA nativo) | `chrome-extension://…/dist/instaladores/whispper-macos-apple-silicon.pkg` | HTTP 200 | `completed`, arquivo em Downloads | não precisa |
| B: Windows 64 bits (UA e `navigator.platform` emulados) | `chrome-extension://…/dist/instaladores/whispper-windows-x64.exe` | `fetch` rejeitado (`Failed to fetch`) | `canceled`, nada em Downloads | **nenhum**: sem mensagem de falha, sem "Tentar de novo" |

Conclusões:

1. O sintoma relatado (aba nova com 404 do GitHub) **não se reproduz** no HEAD: nenhum arquivo de `extension/src` ou `extension/onboarding` contém a URL de releases, e o cenário A baixa o `.pkg` embutido. A URL do GitHub nunca foi commitada (`git log -S "releases/latest"` só a encontra no teste e no registro); ela saiu da árvore de trabalho com o CHG-003 do BUG-20261001-MAC1 (commit `6321c4e`).
2. O defeito de fundo **se reproduz**: quando o instalador sugerido não está disponível, o botão leva a um download que falha em silêncio, e a página não informa a falha nem oferece nova tentativa (spec, seções 8 e 10).

## 2. Sondas complementares

Saída em [sonda-head-e-rf16.txt](sonda-head-e-rf16.txt), script em [sonda-404b.ts](sonda-404b.ts).

- `fetch(…, {method: "HEAD"})` num recurso da própria extensão: HTTP 200 quando o arquivo existe; `TypeError: Failed to fetch` quando falta. Mesmo comportamento com `GET`.
- Página reaberta com o progresso salvo na etapa 3 (RF-16): o botão fica com `href` igual a `…/onboarding/index.html#`, sem `download` e com `target="_blank"`, e o nome do instalador continua genérico ("Whispper Auxiliar"). Causa distinta (o link só é montado na etapa 2); por decisão do usuário, vai para bug próprio.

## 3. Reprodução original (registro, 2026-10-01 11:06)

- **Ambiente:** macOS, `curl` simulando a requisição do navegador
- **Comando:** `curl -I https://github.com/whispper-bot/whispper-whatsapp-web/releases/latest/download/whispper-macos-apple-silicon.pkg`
- **Exit code:** 0, com HTTP 404 Not Found
- **Taxa:** 1/1, determinístico

```
HTTP/2 404
date: Thu, 01 Oct 2026 14:05:49 GMT
content-type: text/plain; charset=utf-8
server: github.com
```

Reconferido em 2026-10-01 17:20: a URL continua respondendo 404, mas a extensão já não aponta para ela.
