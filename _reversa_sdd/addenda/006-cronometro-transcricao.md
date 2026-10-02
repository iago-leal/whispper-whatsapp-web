# Adendo: Indicador de espera com cronômetro na transcrição

> Identificador: `006-cronometro-transcricao`
> Data: 2026-10-02
> Cenário: greenfield

## Vigência

Vigente desde 2026-10-02.

## Resumo da entrega

Ao clicar em transcrever, o próprio ícone do áudio passa a pulsar e mostra ao lado o tempo decorrido desde o clique ("7 s"); a janela flutuante conta o mesmo tempo na fila e durante a transcrição. Na conclusão, o cronômetro para e a janela resume a espera ao lado da duração do áudio, com a parte da fila separada e a comparação com o tempo de ouvir ("Transcrito em 14,1 s (4,4 s na fila) · áudio de 13 s"); no erro, mostra "Falhou após N s". O ícone mantém o estado quando o WhatsApp recria o balão, e o painel da extensão passa a exibir a espera média por minuto de áudio. Foram concluídas 26 de 26 ações.

## Impacto por artefato da extração

A feature evolui código das features 002 a 004; por isso a coluna de tipo usa a taxonomia completa do coding, e não só `componente-novo`, conforme `legacy-impact.md` da feature.

| Artefato | Seção | Tipo de impacto | Delta |
|---|---|---|---|
| `_reversa_sdd/sdd/integracao-whatsapp-web.md` | `### 6.1 Requisitos Principais` | regra-nova | O RF-16 (Could) está entregue como Must: o ícone pulsa em espera, com contador "N s" ao lado, e passa aos indicadores de concluído e de erro; o estado sobrevive à recriação do balão. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `## 10. Integrações e Dependências` | regra-nova | O contrato da porta `FonteDeAudio` ganhou a operação de saída `refletirEstadoPedido(idAudio, estado)`, chamada pelo núcleo em cada transição, inclusive com a janela fechada. |
| `_reversa_sdd/sdd/janela-flutuante.md` | `### 6.1 Requisitos Principais` | regra-alterada | O tempo decorrido do RF-06 avança de fato; o estado concluído traz o resumo com tempo total, parte na fila, duração do áudio e comparação; o erro traz "Falhou após N s". O leitor de tela é avisado só no início e no fim da espera (RF-14). |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `## 10. Integrações e Dependências` | regra-alterada | A porta `ExibicaoDeTranscricao` recebe `inicioEsperaEm` nos estados de espera, em vez de `segundosDecorridos`, e calcula o tempo no próprio cronômetro; "concluido" carrega `tempos` e "erro" carrega `falhouAposMs`. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `### 6.1 Requisitos Principais` | regra-alterada | RF-08: novo clique num pedido em andamento com a janela fechada reabre a janela no estado atual, sem reiniciar a contagem. RF-10: fechar a janela de um pedido na fila devolve o ícone ao ocioso. "Tentar de novo" preserva a direção do áudio e inicia contagem nova. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `## 9. Modelo de Dados` | delta-de-dados | O pedido carrega três instantes (clique, início da transcrição, fim) num relógio monotônico; o cache da sessão guarda os tempos; `ContadoresPersistidos` ganhou `esperaAcumuladaMs` e `audioAcumuladoMs`, lidos como 0 em registro antigo. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `### 6.1 Requisitos Principais` | regra-nova | RF-15 a RF-17: o painel exibe "Espera média: N,N s por minuto de áudio", ponderada pela duração, só de áudios recebidos e concluídos e sem a parte da fila; o zeramento a inclui, e cada registro relê o armazenamento antes de gravar. |
| `_reversa_sdd/sdd/nucleo-transcricao.md` | `## 8. Design e Interface` | componente-novo | Funções puras de tempo em `extension/src/dominio/tempo-de-espera.ts` e cronômetro único do script de conteúdo em `extension/src/content/cronometro-espera.ts`, com tique de 500 ms que para sem contadores registrados. |
| `_reversa_sdd/prd.md` | `## 3. Métricas de sucesso` | regra-nova | A latência medida do clique ao texto passa a ser visível ao usuário, áudio a áudio e na média do painel. |
| `_reversa_sdd/addenda/003-janela-flutuante.md` | `## Resumo da entrega` | regra-alterada | O adendo declara entregue o estado "transcrevendo com cronômetro", mas o código o mantinha parado em 0 s; o cronômetro só passa a existir com esta feature. |

## Regras sob vigilância

Watch principal vazio (cenário greenfield). Observações sem peso de regressão em `_reversa_forward/006-cronometro-transcricao/regression-watch.md`: W001 a W015.

## Fontes

- `_reversa_forward/006-cronometro-transcricao/requirements.md`
- `_reversa_forward/006-cronometro-transcricao/roadmap.md`
- `_reversa_forward/006-cronometro-transcricao/actions.md`
- `_reversa_forward/006-cronometro-transcricao/legacy-impact.md`
- `_reversa_forward/006-cronometro-transcricao/regression-watch.md`
- `_reversa_forward/006-cronometro-transcricao/progress.jsonl`
