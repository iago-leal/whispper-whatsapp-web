# Interface: Protocolo do documento offscreen e do worker

> Identificador da feature: `007-motor-whisper-navegador`
> Tipo: mensagens `chrome.runtime` (service worker e documento offscreen) e `postMessage` (documento offscreen e worker)
> Lados: `extension/src/adaptadores/motor-navegador/` (service worker), `extension/src/offscreen/servidor-motor.ts` (documento), `extension/src/offscreen/trabalhador-whisper.ts` (worker)
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

O documento offscreen só dispõe da API `runtime` (🟢), por isso fala com o service worker por mensagens. O adaptador do service worker usa um canal injetável, como `CanalNativo` no motor local, para que a bateria de contrato rode no Node com um canal simulado.

## 1. Criação e encerramento do documento (service worker)

```
chrome.offscreen.createDocument({
  url: "dist/offscreen/index.html",
  reasons: ["WORKERS"],
  justification: "Executar localmente o modelo de transcrição em um worker, sem enviar o áudio a servidores."
})
```

- 🟢 Um documento por extensão. Antes de criar, o service worker consulta `chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] })` e guarda a promessa de criação em curso, para que pedidos simultâneos não tentem criar dois.
- 🟡 Fechamento por `chrome.offscreen.closeDocument()` 2 min depois de não restar aba do WhatsApp Web, desde que `estado` informe nenhum download nem pedido em curso (D-09).
- 🟡 Documento ausente no envio (fechado ou derrubado): o adaptador recria e reenvia uma vez; o pedido passa por "iniciando".

## 2. Envelope

Toda mensagem entre service worker e documento leva `para: "offscreen"` ou `para: "service-worker"`, `protocolo: 1` e, quando há correlação, `id`. Mensagem com protocolo diferente recebe `{ tipo: "erro", codigo: "VERSAO_INCOMPATIVEL" }`, o que só acontece se uma atualização da extensão encontrar um documento da versão anterior; nesse caso o service worker fecha o documento e recria.

## 3. Service worker para documento

| Tipo | Campos | Resposta |
|------|--------|----------|
| `verificar` | `dispositivoPreferido: "webgpu" \| "wasm"`, `idModelo` | `estado` |
| `carregar` | `idModelo`, `dispositivo` | `estado` ao terminar ("pronto" ou "indisponivel") |
| `transcrever` | `id`, `audioBase64`, `tipoDeMidia` | `resultado` com o mesmo `id` |
| `cancelar` | `id` | `cancelado` com o mesmo `id`, ou nada se o pedido já tiver respondido |
| `preparar_modelo` | `idModelo` | `estado_modelo`; o progresso segue por difusão `progresso_modelo` |
| `estado_modelo` | `idModelo` | `estado_modelo` |
| `estado` | nenhum | `{ downloadEmCurso: boolean, pedidosEmCurso: number, modeloCarregado: idModelo \| null }` |

## 4. Documento para service worker

| Tipo | Campos |
|------|--------|
| `estado` | `estado: "pronto" \| "iniciando" \| "indisponivel"`, `modelo`, `dispositivo`, `motivo?`, `instrucao?` |
| `resultado` | `id`, mais os campos de `ResultadoDaTranscricao`, incluindo `carregamentoMs` e `modelo` |
| `cancelado` | `id` |
| `estado_modelo` | `EstadoDoModelo` (`mensagens-service-worker.md`) |

## 5. Documento e worker (`postMessage`)

| Sentido | Tipo | Campos |
|---------|------|--------|
| documento → worker | `iniciar` | `idModelo`, `dispositivo`, `urlBaseRuntime` (prefixo `chrome-extension://<id>/dist/ort/`, porque o worker não tem `chrome.runtime`) |
| documento → worker | `transcrever` | `id`, `amostras: Float32Array` (transferida), `duracaoSeg` |
| documento → worker | `interromper` | `id` |
| documento → worker | `baixar` | `idModelo` |
| worker → documento | `pronto` / `falhou` | `carregamentoMs` ou `motivo` |
| worker → documento | `resultado` | `id`, `texto`, `idioma`, `processamentoMs`, `janelas` |
| worker → documento | `progresso_download` | `EstadoDoModelo` |
| worker → documento | `dispositivo_perdido` | `motivo` |

## 6. Regras de execução

- 🟢 Um pedido de transcrição por vez, na ordem de chegada (RF-13); os demais aguardam na fila do documento.
- 🟢 Decodificação no documento: `OfflineAudioContext(1, …, 16000)` com `decodeAudioData`; exceção na decodificação vira `FALHA_NA_TRANSCRICAO` com o motivo "áudio ilegível" (RF-14); áudio sem amostras devolve texto vazio, como o EC-05 do motor local.
- 🟡 Idioma: o worker detecta sobre os primeiros 30 s e transcreve com `language` explícito (D-03).
- 🟡 Cancelamento: pedido na fila sai dela; pedido em execução recebe `interromper`. Sem `resultado` ou `cancelado` em 10 s, o documento encerra o worker, cria outro e responde `cancelado`; o pedido seguinte paga a recarga e passa por "iniciando" (D-10).
- 🔴 Reciclagem preventiva do worker depois de N janelas ou X min ocioso, com N e X fixados na Fase 0 (D-13).
- 🟡 Perda do dispositivo de GPU: o pedido em curso devolve `MOTOR_INDISPONIVEL`; o documento recria o worker em WASM se o catálogo o permitir, ou fica "indisponivel" com o motivo de recursos (D-12).
- 🟢 Nenhum áudio, amostra ou texto é gravado no OPFS ou em outro armazenamento; as referências são soltas ao fim de cada pedido (RF-11).
- 🟢 Rede: só o worker, só em `baixar`, só para as URLs de `download-pesos-modelo.md`; a transcrição não faz pedido de rede (RF-09, RF-10).
