# Ações de Implementação — Núcleo de Transcrição

**Feature ID:** `004`
**Componente:** `nucleo-transcricao`
**Status:** Concluído

---

### Ações

- [X] **ACT-004-01**: Criar porta `ArmazenamentoNavegador` em `extension/src/dominio/armazenamento-navegador.ts`.
- [X] **ACT-004-02**: Implementar `GerenciadorContadores` em `extension/src/dominio/contadores.ts` com cálculo de adoção e qualidade e classificação única por áudio recebido.
- [X] **ACT-004-03**: Implementar adaptador `ArmazenamentoChrome` em `extension/src/adaptadores/armazenamento-chrome.ts` e `ArmazenamentoMemoria` para testes.
- [X] **ACT-004-04**: Implementar `CacheSessao` em `extension/src/dominio/cache-sessao.ts` para textos transcritos em memória volátil.
- [X] **ACT-004-05**: Implementar `FilaDeTranscricao` em `extension/src/dominio/fila-transcricao.ts` com suporte a execução sequencial FIFO, cálculo de posições, timeout e cancelamento.
- [X] **ACT-004-06**: Implementar classe `NucleoDeTranscricao` em `extension/src/dominio/nucleo.ts` orquestrando as portas `FonteDeAudio`, `MotorDeTranscricao`, `ExibicaoDeTranscricao` e `ArmazenamentoNavegador`.
- [X] **ACT-004-07**: Integrar `NucleoDeTranscricao` no `extension/src/content/index.ts` e registrar rotas de consulta de status no `extension/src/background.ts`.
- [X] **ACT-004-08**: Criar suíte de testes unitários em `extension/test/nucleo-transcricao.test.ts` cobrindo 100% dos fluxos de fila, concorrência, cache, contadores e erros.
- [X] **ACT-004-09**: Validar compilação (`npm run build`) e execução de testes (`npm test` e `pytest`).
