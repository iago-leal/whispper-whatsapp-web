# Adendo: Núcleo de Transcrição

> Identificador: `004-nucleo-transcricao`
> Data: 2026-10-01
> Cenário: greenfield

## Vigência

Vigente desde 2026-10-01.

## Resumo da entrega

Implementação do núcleo de domínio da extensão Whispper. A solução orquestra a comunicação entre a interface do WhatsApp Web (`FonteDeAudio`), o processamento pelo motor Whisper (`MotorDeTranscricao`), a visualização visual ancorada (`ExibicaoDeTranscricao`) e a persistência local anônima (`ArmazenamentoNavegador`). Implementa fila estritamente sequencial (FIFO) sem concorrência de hardware, timeout individual por pedido, cache volátil em memória da aba para reexibição instantânea (≤ 200 ms), cancelamento ao fechar janelas pendentes, contadores de métricas de adoção e qualidade e popup da extensão para visualização de integridade operacional. Total de 9 ações concluídas e validadas por 76 testes unitários no ecossistema da extensão e 121 testes no aplicativo auxiliar.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/prd.md` | `## 4. Escopo (in)` | componente-novo | Orquestrador hexagonal, controle de fila FIFO e contadores anônimos de metas implementados. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `## 6. Requisitos Funcionais` | componente-novo | Módulos `nucleo.ts`, `fila-transcricao.ts`, `contadores.ts`, `cache-sessao.ts`, `armazenamento-chrome.ts` e popup implementados. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `## 10. Integrações e Dependências` | componente-novo | Porta `ArmazenamentoNavegador` formalizada e adaptadores conectados às demais 3 portas. |

## Regras sob vigilância

IDs dos itens sob vigilância conforme [_reversa_forward/004-nucleo-transcricao/regression-watch.md](file:///Users/iagoleal/dev/whispper-whatsapp-web/_reversa_forward/004-nucleo-transcricao/regression-watch.md):
- W301, W302, W303, W304, W305

## Fontes

- `_reversa_forward/004-nucleo-transcricao/requirements.md`
- `_reversa_forward/004-nucleo-transcricao/roadmap.md`
- `_reversa_forward/004-nucleo-transcricao/actions.md`
- `_reversa_forward/004-nucleo-transcricao/legacy-impact.md`
- `_reversa_forward/004-nucleo-transcricao/regression-watch.md`
- `_reversa_forward/004-nucleo-transcricao/progress.jsonl`
