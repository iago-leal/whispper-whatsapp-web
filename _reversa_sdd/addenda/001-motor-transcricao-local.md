# Adendo: Motor de transcrição local

> Identificador: `001-motor-transcricao-local`
> Data: 2026-10-01
> Cenário: greenfield

## Vigência

Vigente desde 2026-10-01.

## Resumo da entrega

Implementação do motor de transcrição local operando offline no Apple Silicon, composto pelo aplicativo auxiliar em Python (Native Messaging host com mlx-whisper e large-v3-turbo, decodificação ffmpeg em sandboxing por descritores de arquivo, gerenciamento de ociosidade e protocolo binário enquadrado) e pelo adaptador cliente em TypeScript para a extensão Chrome MV3 sob a interface contratual `MotorDeTranscricao`. Total de 45 ações concluídas, 121 testes unitários em Python e 52 testes unitários em TypeScript validados.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/prd.md` | `## 4. Escopo (in)` | componente-novo | Transcrição local offline implementada via Native Messaging host em Python e adaptador TypeScript na extensão. |
| `_reversa_sdd/sdd/motor-transcricao-local.md` | `## 8. Design e Interface` | componente-novo | Adaptador `AdaptadorMotorLocal`, serviço em background e canal nativo implementados em `extension/src/adaptadores/motor-local/`. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `## 8. Design e Interface` | delta-de-contrato-externo | Contrato `MotorDeTranscricao` com métodos `verificar()` e `transcrever()` formalizado em `extension/src/dominio/motor-de-transcricao.ts`. |
| `_reversa_sdd/sdd/compatibilidade-instalacao.md` | `## 8. Design e Interface` | componente-novo | Módulo de instalação e manifesto de Native Messaging implementados em `auxiliar/whispper_motor/instalacao.py` e `auxiliar/motor.sh`. |

## Regras sob vigilância

IDs dos itens sob vigilância conforme [_reversa_forward/001-motor-transcricao-local/regression-watch.md](file:///Users/iagoleal/dev/whispper-whatsapp-web/_reversa_forward/001-motor-transcricao-local/regression-watch.md):
- W001, W002, W003, W004, W005, W006, W007, W008, W009, W010, W011, W012, W013, W014, W015, W016, W017, W018, W019, W020, W021, W022, W023, W024

## Fontes

- `_reversa_forward/001-motor-transcricao-local/requirements.md`
- `_reversa_forward/001-motor-transcricao-local/roadmap.md`
- `_reversa_forward/001-motor-transcricao-local/actions.md`
- `_reversa_forward/001-motor-transcricao-local/legacy-impact.md`
- `_reversa_forward/001-motor-transcricao-local/regression-watch.md`
- `_reversa_forward/001-motor-transcricao-local/progress.jsonl`
