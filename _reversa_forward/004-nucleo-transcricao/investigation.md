# Investigação Técnica — Núcleo de Transcrição

**Feature ID:** `004`
**Componente:** `nucleo-transcricao`
**Data:** 2026-10-01

---

## 1. Estado Atual da Arquitetura

1. **Portas já existentes em `extension/src/dominio/`:**
   - `FonteDeAudio` (`extension/src/dominio/fonte-de-audio.ts`): fornece `obterAudio`, `aoSolicitarTranscricao`, `aoIniciarReproducao`, `aoRemoverMensagem`, `aoMudarAncora`, `verificarSaude`.
   - `MotorDeTranscricao` (`extension/src/dominio/motor-de-transcricao.ts`): fornece `verificar` e `transcrever`.
   - `ExibicaoDeTranscricao` (`extension/src/dominio/exibicao-de-transcricao.ts`): fornece `abrir`, `definirEstado`, `destacar`, `fechar`, `aoFechar`, `aoReexecutar`.

2. **Porta a introduzir:**
   - `ArmazenamentoNavegador` (`extension/src/dominio/armazenamento-navegador.ts`): abstração pura para persistência e recuperação assíncrona dos contadores anônimos (`lidos`, `ouvidos`, `lidosETocados`, `inicioContagem`). Em produção usa `chrome.storage.local`; em testes usa implementação em memória.

3. **Domínio Puro a Implementar:**
   - `NucleoDeTranscricao`: orquestrador central com arquitetura hexagonal.
   - `FilaDeTranscricao`: fila FIFO estrita com garantia de execução de 1 áudio por vez, cálculo de posições relativas e timeout de proteção.
   - `CacheSessao`: repositório em memória volátil da aba associando `idAudio` -> `ResultadoTranscricao`.
   - `GerenciadorContadores`: lógica de classificação de consumo (`lido` vs `ouvido`, `lidoETocado`), validação de regras de descarte (áudios enviados não pontuam) e cálculos percentuais.

4. **Isolamento de Domínio (RNF-02):**
   - Nenhuma linha dentro de `extension/src/dominio/` importará `chrome.*`, `window` ou `document`.
   - Todos os testes do núcleo rodarão diretamente no runtime Node.js via mocks e fakes das portas.
