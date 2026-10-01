# Interface: Porta `MotorDeTranscricao`

> Identificador da feature: `001-motor-transcricao-local`
> Tipo: interface TypeScript interna da extensão, consumida pelo núcleo (feature futura)
> Base: `_reversa_sdd/sdd/nucleo-transcricao.md#10. Integrações e Dependências`, contrato da porta `MotorDeTranscricao`
> Implementações nesta feature: adaptador do motor local e adaptador simulado

Este contrato é registrado como interface porque atravessa features: o núcleo, a janela e o painel dependerão dele sem conhecer o aplicativo auxiliar.

## 1. Tipos

Local: `extension/src/dominio/motor-de-transcricao.ts`. Identificadores sem acento; textos para o usuário com acento.

```ts
export type CodigoDeErroDoMotor =
  | "MOTOR_INDISPONIVEL"
  | "VERSAO_INCOMPATIVEL"
  | "FALHA_NA_TRANSCRICAO";

export type EstadoDoMotor =
  | { estado: "pronto"; modelo: string; versaoApp: string; protocolo: number }
  | { estado: "iniciando"; modelo?: string; versaoApp?: string; protocolo?: number }
  | {
      estado: "indisponivel";
      codigo: "MOTOR_INDISPONIVEL" | "VERSAO_INCOMPATIVEL";
      motivo: string;
      instrucao?: string;
    };

export type ResultadoDaTranscricao =
  | { ok: true; texto: string; idioma: string; duracaoAudioSeg: number; processamentoMs: number }
  | { ok: false; codigo: CodigoDeErroDoMotor; motivo: string; instrucao?: string };

export interface MotorDeTranscricao {
  verificar(): Promise<EstadoDoMotor>;
  transcrever(audio: Uint8Array, tipoDeMidia: string): Promise<ResultadoDaTranscricao>;
}
```

As promessas nunca são rejeitadas por falha prevista (DT-11); só erro de programação, como argumento de tipo errado, lança exceção.

## 2. Tradução feita pelo adaptador do motor local

### 2.1 `verificar()`

| Situação no canal ou no protocolo | Resultado na porta |
|-----------------------------------|--------------------|
| `estado` com `protocolo` diferente de 1 | `indisponivel`, `VERSAO_INCOMPATIVEL`, motivo "versão de protocolo incompatível (extensão 1, aplicativo N)", instrução de atualizar o aplicativo auxiliar |
| `estado: "carregando"` | `iniciando` |
| `estado: "pronto"` | `pronto` |
| `estado: "erro"` | `indisponivel`, `MOTOR_INDISPONIVEL`, motivo recebido; o adaptador fecha a porta, para que a próxima chamada inicie um host novo que releia a configuração |
| `lastError` "Specified native messaging host not found" | `indisponivel`, `MOTOR_INDISPONIVEL`, "aplicativo auxiliar não instalado", instrução de instalação |
| `lastError` "Access to the specified native messaging host is forbidden" | `indisponivel`, `MOTOR_INDISPONIVEL`, "extensão não autorizada no aplicativo auxiliar", instrução de reinstalação |
| `lastError` "Native host has exited" ou "Failed to start native messaging host" | `indisponivel`, `MOTOR_INDISPONIVEL`, "aplicativo auxiliar encerrou" ou "aplicativo auxiliar não iniciou" |
| Sem resposta em 10 s | `indisponivel`, `MOTOR_INDISPONIVEL`, "sem resposta"; porta fechada (RF-19) |

Instrução de instalação: "Instale o aplicativo auxiliar com: auxiliar/motor.sh instalar".

### 2.2 `transcrever(audio, tipoDeMidia)`

| Situação | Resultado na porta |
|----------|--------------------|
| Mensagem serializada acima de 64 MiB | `FALHA_NA_TRANSCRICAO`, "áudio maior que o limite", sem envio (RF-18) |
| Sem conexão | Uma tentativa de conexão; se falhar, `MOTOR_INDISPONIVEL` com o motivo da tabela 2.1 (RF-10) |
| `resultado` | `ok: true`, campos copiados |
| `erro` com `FALHA_NA_TRANSCRICAO`, `VERSAO_INCOMPATIVEL` ou `MOTOR_INDISPONIVEL` | `ok: false`, mesmo código e motivo |
| `erro` com `MENSAGEM_INVALIDA` | `FALHA_NA_TRANSCRICAO`, "mensagem inválida"; indica defeito do adaptador e vai para o console |
| Porta fechada com o pedido pendente | `MOTOR_INDISPONIVEL`, "aplicativo auxiliar encerrou durante a transcrição"; a chamada seguinte reconecta uma vez (RF-10, RN-07) |

## 3. Garantias

- Ordem: resultados de `transcrever` chegam na ordem das chamadas (RF-07).
- Concorrência: chamadas simultâneas são aceitas; o adaptador serializa o envio e correlaciona por `idPedido`.
- Prazo de transcrição: responsabilidade do núcleo (RNF-02 do núcleo) e, como proteção, do host (RF-24); o adaptador não impõe prazo próprio a `transcrever`.
- Idempotência: nenhuma; o núcleo guarda os textos já obtidos.
- Rede: nenhuma chamada da porta gera tráfego de rede (RN-01).

## 4. Adaptador simulado

Local: `extension/src/adaptadores/motor-simulado.ts`. Recebe um roteiro de respostas e atrasos por chamada, registra as chamadas recebidas e implementa exatamente os mesmos tipos. Serve à bateria de contrato desta feature e aos testes do núcleo.

## 5. Bateria de contrato

Local: `extension/test/contrato-motor.ts`. Função que recebe uma fábrica de `MotorDeTranscricao` e um controlador de cenário, e verifica: estados `iniciando` e `pronto`; resultado com texto, idioma, duração e tempo; texto vazio sem erro; cada código de erro; ordem de três chamadas simultâneas; reconexão após queda. Executada contra o adaptador simulado sempre, e contra o adaptador real ligado ao host verdadeiro quando `MOTOR_REAL=1` (critério do RF-01).
