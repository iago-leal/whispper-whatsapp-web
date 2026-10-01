# Onboarding — Núcleo de Transcrição

**Feature ID:** `004`
**Componente:** `nucleo-transcricao`

---

## 1. O que este componente faz
O núcleo de transcrição é a camada de aplicação/domínio puro que conecta a detecção de cliques do WhatsApp Web (`FonteDeAudio`), a fila de processamento serial, a comunicação com o motor Whisper (`MotorDeTranscricao`), a exibição visual na tela (`ExibicaoDeTranscricao`) e os contadores anônimos (`ArmazenamentoNavegador`).

## 2. Como rodar os testes
No diretório `extension/`:
```bash
npm test
```
Os testes do núcleo rodam diretamente sobre Node.js utilizando mocks leves das portas hexagonais, sem precisar de navegador ou processos externos.

## 3. Arquitetura de Classes/Módulos
- `extension/src/dominio/armazenamento-navegador.ts`: Contrato da porta de persistência de contadores.
- `extension/src/dominio/contadores.ts`: Domínio dos contadores anônimos e métricas de adoção/qualidade.
- `extension/src/dominio/cache-sessao.ts`: Cache de transcrições em memória da aba indexado por `idAudio`.
- `extension/src/dominio/fila-transcricao.ts`: Fila sequencial (FIFO) com transições de estado, timeout e posições.
- `extension/src/dominio/nucleo.ts`: Fachada hexagonal orquestradora que une as portas.
- `extension/src/adaptadores/armazenamento-chrome.ts`: Adaptador concreto que consome `chrome.storage.local`.
