# Cápsula de reprodução: BUG-20261001-2MOY

| Campo | Valor |
|---|---|
| Data | 2026-10-01 15:30 -03 |
| Commit base | `9eee588` (branch `main`), com o GAOZ já corrigido e travado |
| Ambiente | macOS 27.0.1 (26A434), Apple Silicon; Node 24.13.0 (remoção de tipos nativa) |
| Isolamento | Só o módulo `extension/src/content/extrator-audio.ts` e a configuração de estruturas; sem navegador, sem rede, sem a conta do usuário |
| Script | `evidence/reproduzir.ts` |
| Comando | `cd evidence && node --no-warnings reproduzir.ts` |
| Exit code | 1 nas três tentativas (o script sai com 1 quando a extração falha) |
| Taxa | 3/3 tentativas reproduziram |
| Determinismo | `deterministic` |

## Balão simulado

Modelado na estrutura conferida no WhatsApp Web real em
`../../BUG-20261001-GAOZ-icone-ausente/evidence/conferencia-whatsapp-real.md`, seção 4: a linha de voz
tem o botão "Reproduzir mensagem de voz" e nenhum `<audio>` antes da reprodução. O balão falso só
responde ao seletor do botão; qualquer outro seletor devolve `null`.

## Saída (idêntica nas três tentativas)

```text
consultas ao balão: [ 'audio' ]
fetch chamado: false
ERRO: AUDIO_INDISPONIVEL: elemento de áudio ausente ou sem fonte para a mensagem id-mascarado
```

## Leitura

- O extrator faz uma única consulta ao balão, pelo seletor `tagAudio` (`audio`), e desiste quando ela
  não casa: não há caminho alternativo para obter o áudio.
- Nenhuma requisição é feita; o erro nasce em `extrator-audio.ts:16-18`, antes de qualquer `fetch`.
- O núcleo converte a exceção em `AUDIO_INDISPONIVEL` com a mensagem crua do extrator
  (`nucleo.ts`, `executarTranscricao`), que é o que a janela exibiria.

## Reprodução de ponta a ponta no WhatsApp Web real (2026-10-01 15:38 -03)

Áudio recebido de um segundo aparelho e nunca tocado; clique no ícone do Whispper da linha dele.
A janela abriu com "Erro: AUDIO_INDISPONIVEL"; nenhum `<audio>` existia antes nem depois do clique,
e o player seguiu como "Reproduzir mensagem de voz". Taxa 1/1. Detalhes em `prova-de-conceito.md`,
seção 1.
