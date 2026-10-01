# Delta de dados: Indicador de espera com cronômetro na transcrição

> Identificador: `006-cronometro-transcricao`
> Data: `2026-10-01`
> Base: `_reversa_sdd/sdd/nucleo-transcricao.md#9. Modelo de Dados` e `_reversa_forward/004-nucleo-transcricao/interfaces/porta-armazenamento-navegador.md`

## 1. Persistido (`chrome.storage.local`, chave `whispper_contadores`)

| Campo | Situação | Tipo | Regra |
|-------|----------|------|-------|
| `lidos`, `ouvidos`, `lidosETocados`, `inicioContagem` | inalterados | | |
| `esperaAcumuladaMs` | novo | inteiro ≥ 0 | Soma, por transcrição concluída de áudio recebido, de `fimEm - inicioTranscricaoEm`, arredondada ao milissegundo (RN-07) |
| `audioAcumuladoMs` | novo | inteiro ≥ 0 | Soma das durações dos mesmos áudios, em milissegundos (RN-07, D-08) |

Zerar os contadores grava 0 nos dois campos novos e redefine `inicioContagem` (RN-09).

**Migração:** preguiçosa. Registro sem os campos novos, ou com valor não numérico ou negativo, é lido como 0. Nenhuma gravação ocorre só pela leitura; a próxima gravação inclui os campos.

**Privacidade:** o registro passa de 3 inteiros e 1 data para 5 inteiros e 1 data. Nenhum campo identifica áudio, pessoa ou conversa (RN-06).

## 2. Derivado, não persistido

| Nome | Onde | Fórmula |
|------|------|---------|
| `esperaMediaSegPorMinuto` | `MetricasContadores` | `(esperaAcumuladaMs / 1000) / (audioAcumuladoMs / 60000)`, uma casa decimal; `null` quando `audioAcumuladoMs = 0` (RN-08) |

Exemplo do requirements: esperas de 4,3 s e 9,7 s, áudios de 13 s e 47 s, resultam em 14 000 ms / 60 000 ms, isto é, 14,0 s por minuto.

## 3. Memória da aba

| Estrutura | Campo | Situação | Regra |
|-----------|-------|----------|-------|
| `ItemFila` | `inicioEsperaEm` | novo | Instante do relógio monotônico no `enfileirar` ou no `repetir` (RN-01, RN-05) |
| `ItemFila` | `inicioTranscricaoEm` | novo | Instante em que o item sai da fila |
| `ItemFila` | `fimEm` | novo | Instante da conclusão ou do erro |
| `ItemFila` | `criadoEm` | inalterado | Continua em `Date.now()`; não é usado no cálculo |
| `TemposDoPedido` | `esperaTotalMs`, `esperaFilaMs`, `duracaoAudioSeg?` | novo tipo | Derivado do item na conclusão |
| `ItemTranscricaoEmMemoria` (cache) | `tempos?` | novo | `TemposDoPedido` da transcrição original (RN-04) |
| Núcleo | mapa de direção por áudio | novo | Repassa a direção ao `repetir` (D-13) |
| Adaptador do WhatsApp | mapa de estado do ícone por áudio | novo | Reaplica o estado ao botão reinserido (RF-08) |

Todos os instantes da memória da aba vêm do mesmo relógio (`performance.now()` por padrão) e só são comparados entre si.

## 4. Estados de exibição (`EstadoExibicao`)

| Variante | Antes | Depois |
|----------|-------|--------|
| `fila` | `posicaoNaFila` | `posicaoNaFila`, `inicioEsperaEm` |
| `transcrevendo` | `segundosDecorridos` | `inicioEsperaEm` (campo antigo removido) |
| `concluido` | `texto`, `idioma?` | `texto`, `idioma?`, `tempos?` |
| `erro` | `mensagem`, `motivo` | `mensagem`, `motivo`, `falhouAposMs?` |

## 5. Estado do ícone (`EstadoPedidoIcone`, novo)

`{ tipo: 'ocioso' } | { tipo: 'espera'; inicioEsperaEm: number } | { tipo: 'concluido' } | { tipo: 'erro' }`
