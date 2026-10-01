# Adendo: Janela Flutuante de Transcrição

> Identificador: `003-janela-flutuante`
> Data: 2026-10-01
> Cenário: greenfield

## Vigência

Vigente desde 2026-10-01.

## Resumo da entrega

Implementação do sistema de janelas flutuantes de transcrição injetado na interface do WhatsApp Web. A solução dá suporte à visualização ancorada ao balão de áudio, prevenção ativa de colisão vertical com deslocamento para baixo em até 20 janelas simultâneas, scroll suave a 60 fps acelerado por GPU (`translate3d`), quatro estados reativos (fila, transcrevendo com cronômetro, concluído e erro), botão de cópia rápida com feedback, fechamento acessível via tecla Esc ou clique e adaptação aos temas claro e escuro. Total de 11 ações concluídas e validadas por testes unitários.

## Impacto por artefato da extração

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/prd.md` | `## 4. Escopo (in)` | componente-novo | Janela flutuante ancorada e suporte a múltiplas janelas para áudios fragmentados implementadas. |
| `_reversa_sdd/sdd/janela-flutuante.md` | `## 6. Requisitos Funcionais` | componente-novo | Módulos `posicionador-colisoes.ts`, `janela-elemento.ts`, `gerenciador-janelas.ts` e `janela-flutuante.css` implementados. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `## 8. Design e Interface` | componente-novo | Porta hexagonal `ExibicaoDeTranscricao` implementada em `extension/src/dominio/exibicao-de-transcricao.ts`. |

## Regras sob vigilância

IDs dos itens sob vigilância conforme [_reversa_forward/003-janela-flutuante/regression-watch.md](file:///Users/iagoleal/dev/whispper-whatsapp-web/_reversa_forward/003-janela-flutuante/regression-watch.md):
- W201, W202, W203, W204, W205

## Fontes

- `_reversa_forward/003-janela-flutuante/requirements.md`
- `_reversa_forward/003-janela-flutuante/roadmap.md`
- `_reversa_forward/003-janela-flutuante/actions.md`
- `_reversa_forward/003-janela-flutuante/legacy-impact.md`
- `_reversa_forward/003-janela-flutuante/regression-watch.md`
- `_reversa_forward/003-janela-flutuante/progress.jsonl`
