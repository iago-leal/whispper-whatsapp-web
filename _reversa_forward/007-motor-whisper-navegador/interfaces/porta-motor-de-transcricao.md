# Interface: Porta `MotorDeTranscricao` (delta)

> Identificador da feature: `007-motor-whisper-navegador`
> Tipo: interface TypeScript interna da extensão
> Contrato anterior: `_reversa_forward/001-motor-transcricao-local/interfaces/porta-motor-de-transcricao.md`
> Local: `extension/src/dominio/motor-de-transcricao.ts`
> Implementações: `AdaptadorMotorLocal` (existente), `AdaptadorMotorNavegador` (nova), `MotorComposto` (nova), `MotorClienteContent` (existente, no script de conteúdo), motor simulado (existente)
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

As mudanças são aditivas e opcionais: código que não as usa continua compilando e se comportando como antes.

## 1. Tipos

```ts
export type OrigemDoMotor = "auxiliar" | "navegador";

export type EstadoDoMotor =
  | { estado: "pronto"; modelo: string; versaoApp: string; protocolo: number; origem?: OrigemDoMotor }
  | { estado: "iniciando"; modelo?: string; versaoApp?: string; protocolo?: number; origem?: OrigemDoMotor }
  | {
      estado: "indisponivel";
      codigo: "MOTOR_INDISPONIVEL" | "VERSAO_INCOMPATIVEL";
      motivo: string;
      instrucao?: string;
    };

export type ResultadoDaTranscricao =
  | {
      ok: true; texto: string; idioma: string; duracaoAudioSeg: number; processamentoMs: number;
      origem?: OrigemDoMotor; modelo?: string; carregamentoMs?: number;
    }
  | { ok: false; codigo: CodigoDeErroDoMotor; motivo: string; instrucao?: string };

export interface OpcoesDaTranscricao {
  /** Abortado pelo núcleo no tempo-limite ou no descarte do pedido. */
  sinal?: AbortSignal;
}

export interface MotorDeTranscricao {
  verificar(): Promise<EstadoDoMotor>;
  transcrever(audio: Uint8Array, tipoDeMidia: string, opcoes?: OpcoesDaTranscricao): Promise<ResultadoDaTranscricao>;
}
```

## 2. Garantias novas

- 🟡 **Cancelamento.** Com `sinal` abortado antes da resposta, a promessa resolve com `{ ok: false, codigo: "FALHA_NA_TRANSCRICAO", motivo: "cancelado" }` e o motor fica livre para o pedido seguinte em até 10 s. Sinal já abortado na chamada resolve na hora, sem trabalho. O motor local é exceção declarada: aceita o sinal, mas só resolve quando o host responde, porque o protocolo 1 não tem cancelamento.
- 🟡 **Origem.** `MotorComposto` sempre preenche `origem` em "pronto", "iniciando" e no resultado de sucesso; os adaptadores simples preenchem a própria.
- 🟡 **Carregamento.** `carregamentoMs` é 0 quando o modelo já estava carregado e, no primeiro pedido depois da carga, o tempo dela (RF-12).
- 🟢 Mantidas da feature 001: promessas nunca rejeitadas por falha prevista; resultados na ordem das chamadas; nenhuma idempotência; prazo do pedido a cargo do núcleo.

## 3. Tradução feita pelo motor no navegador

| Situação | Resultado na porta |
|----------|--------------------|
| Modelo ausente ou com download incompleto | `verificar`: `indisponivel`, `MOTOR_INDISPONIVEL`, "modelo de fala não baixado", instrução "Abra o painel do Silente e conclua a preparação"; `transcrever`: o mesmo, como `ok: false` |
| Modelo verificado, carga em curso ou documento offscreen sendo criado | `iniciando`, com `origem: "navegador"` e o modelo |
| Modelo carregado | `pronto`, com `modelo` = id do catálogo, `versaoApp` = versão da extensão, `protocolo` = versão do protocolo do documento offscreen |
| Arquivo corrompido na carga | O arquivo é apagado; `indisponivel`, "modelo de fala corrompido; baixe de novo", com a mesma instrução do modelo ausente (RF-07) |
| Falha de carga ou dispositivo de GPU perdido, sem reserva em WASM | `indisponivel`, `MOTOR_INDISPONIVEL`, "o computador não tem recursos para carregar o modelo" |
| Decodificação impossível | `FALHA_NA_TRANSCRICAO`, "áudio ilegível" |
| Áudio sem fala | `ok: true`, texto vazio |
| Documento offscreen desaparecido durante o pedido | Uma recriação e um reenvio; se falhar de novo, `MOTOR_INDISPONIVEL`, "o motor no navegador encerrou durante a transcrição" |

## 4. Política do `MotorComposto`

| Situação | Quem atende |
|----------|-------------|
| Auxiliar `pronto` e fora de quarentena | auxiliar |
| Auxiliar `iniciando`, `indisponivel` ou em quarentena | navegador |
| `preferencia: "navegador"` (teste da página de boas-vindas) | navegador |
| Auxiliar devolve `MOTOR_INDISPONIVEL` ou `VERSAO_INCOMPATIVEL` num pedido | O mesmo pedido vai uma vez ao navegador; o auxiliar entra em quarentena de 5 min |
| Auxiliar devolve `FALHA_NA_TRANSCRICAO` | O erro volta ao núcleo, sem reencaminhar: o áudio é o problema, não o motor |

- 🟡 O `verificar` do composto devolve o estado do motor que atenderia o próximo pedido; enquanto o auxiliar estiver pronto, o motor no navegador não é preparado.
- 🟡 Cada resultado, de sucesso ou de erro, gera uma linha no registro de desempenho (`data-delta.md`, seção 1.3).
