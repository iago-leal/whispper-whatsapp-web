# Adendo: Integração com WhatsApp Web

> Identificador: `002-integracao-whatsapp-web`
> Data: 2026-10-01
> Cenário: greenfield

## Vigência

Vigente desde 2026-10-01.

## Resumo da entrega

Implementação da integração da extensão com o WhatsApp Web (`web.whatsapp.com`). O content script injeta um botão acessível de transcrição em mensagens de áudio ativas, intercepta e entrega o fluxo de áudio decifrado à porta hexagonal `FonteDeAudio` sem emitir som audível, isola 100% dos seletores de DOM em `configuracao-estruturas.ts` e provê monitoramento de estado degradado caso a interface do WhatsApp seja atualizada. Total de 17 ações concluídas, com testes unitários cobrindo seletores, detecção de mensagens, extração de áudio e âncoras geométricas.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/prd.md` | `## 4. Escopo (in)` | componente-novo | Injeção de botão nos áudios do WhatsApp Web e obtenção de mídia decifrada sem reprodução sonora implementadas. |
| `_reversa_sdd/sdd/integracao-whatsapp-web.md` | `## 6. Requisitos Funcionais` | componente-novo | Módulos `configuracao-estruturas.ts`, `detector-mensagens.ts`, `botao-transcricao.ts`, `extrator-audio.ts` e `monitor-degradacao.ts` implementados em `extension/src/content/`. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `## 8. Design e Interface` | componente-novo | Porta hexagonal `FonteDeAudio` implementada em `extension/src/dominio/fonte-de-audio.ts` e adotada por `AdaptadorWhatsAppWeb`. |

## Regras sob vigilância

IDs dos itens sob vigilância conforme [_reversa_forward/002-integracao-whatsapp-web/regression-watch.md](file:///Users/iagoleal/dev/whispper-whatsapp-web/_reversa_forward/002-integracao-whatsapp-web/regression-watch.md):
- W101, W102, W103, W104, W105

## Fontes

- `_reversa_forward/002-integracao-whatsapp-web/requirements.md`
- `_reversa_forward/002-integracao-whatsapp-web/roadmap.md`
- `_reversa_forward/002-integracao-whatsapp-web/actions.md`
- `_reversa_forward/002-integracao-whatsapp-web/legacy-impact.md`
- `_reversa_forward/002-integracao-whatsapp-web/regression-watch.md`
- `_reversa_forward/002-integracao-whatsapp-web/progress.jsonl`
