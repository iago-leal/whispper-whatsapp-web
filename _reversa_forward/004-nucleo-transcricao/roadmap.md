# Roadmap — Núcleo de Transcrição

**Feature ID:** `004`
**Componente:** `nucleo-transcricao`
**Status:** Planejado

---

## Fases de Implementação

### Fase 1: Portas e Domínio dos Contadores
- Definir a porta `ArmazenamentoNavegador`.
- Implementar `GerenciadorContadores` com suporte a métricas de adoção, qualidade, classificação de sessão e persistência desacoplada.
- Criar adaptador `ArmazenamentoChrome` e implementação em memória para testes.

### Fase 2: Cache de Sessão e Fila de Transcrição
- Implementar `CacheSessao` volátil para textos transcritos.
- Implementar `FilaDeTranscricao` com garantia de execução estritamente sequencial (1 áudio por vez), cálculo de posição relativa dos itens e temporizador de timeout (RNF-02).

### Fase 3: Orquestrador Hexagonal do Núcleo
- Implementar `NucleoDeTranscricao` amarrando as portas `FonteDeAudio`, `MotorDeTranscricao`, `ExibicaoDeTranscricao` e `ArmazenamentoNavegador`.
- Cobrir todos os casos de uso: clique, sequência fragmentada, reabertura de cache ≤ 200 ms, clique repetido (destaque), cancelamento ao fechar janela, erro com repetição, mensagem apagada para todos e motor indisponível.

### Fase 4: Integração com Background e Content Script
- Conectar o `NucleoDeTranscricao` ao ciclo de vida de `extension/src/content/index.ts`.
- Expor mensagens para consulta do estado do motor e contadores no `background.ts`.
- Construir testes automatizados de unidade cobrindo 100% das transições e comportamentos de domínio.
