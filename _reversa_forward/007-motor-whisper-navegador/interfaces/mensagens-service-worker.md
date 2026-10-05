# Interface: Mensagens para o service worker

> Identificador da feature: `007-motor-whisper-navegador`
> Tipo: mensagens `chrome.runtime.sendMessage`, entre contextos da extensão
> Servidor: `extension/src/background.ts`
> Clientes: script de conteúdo (`motor-cliente-content.ts`), painel (`popup.ts`), página de boas-vindas (`onboarding.ts`)
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

As mensagens `verificar_motor` e `transcrever_audio` já existem (🟢 `extension/src/background.ts`); esta feature acrescenta campos opcionais e quatro mensagens. As mensagens vindas do documento offscreen (`protocolo-offscreen.md`) não usam este canal de pedidos: o service worker as distingue pelo campo `para`.

## 1. Pedidos e respostas

| Mensagem | Pedido | Resposta | Quem envia |
|----------|--------|----------|------------|
| `verificar_motor` | `{ tipo: "verificar_motor" }` | `{ ok: true, resultado: EstadoDoMotor }` | conteúdo, painel, boas-vindas |
| `transcrever_audio` | `{ tipo: "transcrever_audio", idPedido: string, audioBase64: string, tipoDeMidia: string, preferencia?: "navegador" }` | `{ ok: true, resultado: ResultadoDaTranscricao }` | conteúdo, boas-vindas |
| `cancelar_transcricao` (nova) | `{ tipo: "cancelar_transcricao", idPedido: string }` | `{ ok: true }`, sempre, inclusive para pedido já concluído ou desconhecido | conteúdo |
| `preparar_modelo` (nova) | `{ tipo: "preparar_modelo" }` | `{ ok: true, estado: EstadoDoModelo }`; o progresso chega depois por `progresso_modelo` | boas-vindas, painel |
| `estado_modelo` (nova) | `{ tipo: "estado_modelo" }` | `{ ok: true, estado: EstadoDoModelo }` | boas-vindas, painel |
| `exportar_registro` (nova) | `{ tipo: "exportar_registro" }` | `{ ok: true, linhas: LinhaDoRegistroDeDesempenho[] }` | painel |

```
EstadoDoModelo =
  | { estado: "ausente"; bytesTotais: number }
  | { estado: "baixando"; bytesGravados: number; bytesTotais: number; restanteSeg: number | null }
  | { estado: "conferindo" }
  | { estado: "verificado" }
  | { estado: "falhou"; motivo: string; podeTentarDeNovo: boolean }
```

## 2. Difusão

| Mensagem | Conteúdo | Origem | Ouvintes |
|----------|----------|--------|----------|
| `progresso_modelo` | `{ tipo: "progresso_modelo", estado: EstadoDoModelo }` | documento offscreen, no máximo a cada 500 ms | página de boas-vindas e painel, se abertos |

## 3. Regras

- 🟢 `idPedido` é gerado pelo cliente (`crypto.randomUUID()`) e correlaciona `transcrever_audio` com `cancelar_transcricao`; o service worker mantém o mapa `idPedido → AbortController` só enquanto o pedido estiver em curso.
- 🟡 `preferencia: "navegador"` só é usada pela transcrição de teste da página de boas-vindas (D-16): o motor composto pula o auxiliar, para que o teste valide o modelo baixado.
- 🟢 Falha prevista nunca vira `ok: false`: o erro viaja dentro de `resultado` (DT-11 da feature 001). `ok: false` fica para exceção de programação, como hoje.
- 🟡 Limite de tamanho: o áudio acima de 48 MiB antes da codificação em base64 é recusado pelo cliente com `FALHA_NA_TRANSCRICAO` e o motivo "áudio maior que o limite", sem envio, porque a mensagem do Chrome tem teto de 64 MiB.
- 🟢 Sem prazo próprio no canal: o prazo é do núcleo (RNF-02 do núcleo), que cancela pelo `idPedido`.
- 🟡 `verificar_motor` dispara a preparação do motor no navegador quando o auxiliar não está pronto (D-08); assim, abrir o WhatsApp Web, que já chama `verificar` ao inicializar o núcleo, carrega o modelo antes do primeiro clique.
- 🟡 O `resultado` de `verificar_motor` com o modelo ausente é `indisponivel`, com o motivo "modelo de fala não baixado" e a instrução de concluir a preparação (D-12).
