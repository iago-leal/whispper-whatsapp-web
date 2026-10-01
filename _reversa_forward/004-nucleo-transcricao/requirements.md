# Requisitos — Núcleo de Transcrição

**Feature ID:** `004`
**Nome curto:** `nucleo-transcricao`
**Origem:** `_reversa_sdd/sdd/nucleo-transcricao.md` e `_reversa_sdd/prd.md`
**Data:** 2026-10-01
**Status:** Aprovado

---

## 1. Visão Geral

O núcleo de transcrição é o coração do domínio da extensão Whispper. É agnóstico ao navegador, à interface do WhatsApp Web e aos detalhes de implementação do motor de IA Whisper. Suas responsabilidades são:

1. Orquestrar os pedidos de transcrição disparados pelo usuário.
2. Garantir atendimento sequencial estrito (FIFO), evitando concorrência e sobrecarga de GPU/NPU.
3. Gerenciar o ciclo de vida dos pedidos (`na_fila`, `transcrevendo`, `concluido`, `erro`).
4. Manter cache em memória durante a sessão da aba para reexibição imediata (≤ 200 ms) sem retrabalho.
5. Manter os contadores locais anônimos de métricas de adoção e qualidade persistidos via porta do navegador (`chrome.storage.local`).
6. Prover o estado operacional do motor e da integração ao popup/painel e às janelas flutuantes.
7. Comunicar-se estritamente através de portas hexagonais:
   - `FonteDeAudio` (adaptador WhatsApp Web)
   - `MotorDeTranscricao` (adaptador Native Messaging / mlx-whisper)
   - `ExibicaoDeTranscricao` (adaptador Janela Flutuante)
   - `ArmazenamentoNavegador` (adaptador Chrome Storage)

---

## 2. Requisitos Funcionais

- **RF-01:** Criar pedido de transcrição exclusivamente a partir de evento disparado pelo clique do usuário em um áudio sem pedido ativo e sem cache em memória.
- **RF-02:** Atender pedidos estritamente um por vez, na ordem cronológica de cliques (FIFO).
- **RF-03:** Gerenciar transições válidas de estado (`na_fila` → `transcrevendo` → `concluido` / `erro`; `erro` → `na_fila`; `na_fila` → `removido`), notificando a exibição a cada mudança.
- **RF-04:** Calcular e informar à janela flutuante a posição exata de espera na fila (ex: "1 à frente").
- **RF-05:** Requisitar os bytes do áudio pela porta `FonteDeAudio` apenas ao iniciar a transcrição, liberando o buffer de memória imediatamente após o término (sucesso ou erro).
- **RF-06:** Armazenar em cache em memória da aba o texto transcrito indexado por `idAudio` até o reload da aba.
- **RF-07:** Reabertura imediata (≤ 200 ms) ao clicar em áudio já transcrito cuja janela foi fechada, sem reenviar ao motor.
- **RF-08:** Destacar janela existente se o usuário clicar repetidamente no mesmo áudio com janela já aberta.
- **RF-09:** Suportar repetição de pedidos em erro (ação "Tentar de novo"), reinserindo-os no fim da fila.
- **RF-10:** Cancelar pedido na fila caso o usuário feche a janela antes do início do processamento. Se já estiver transcrevendo, concluir e salvar em cache sem forçar reabertura.
- **RF-11:** Aplicar timeout configurável (máx. 60 s ou 30 s por minuto de áudio) abortando com erro `TEMPO_ESGOTADO` e avançando a fila.
- **RF-12:** Classificar áudios recebidos como "lido" (se transcrito antes de tocar) ou "ouvido" (se tocado antes da transcrição), apenas uma vez por sessão.
- **RF-13:** Registrar como "lido e tocado" o áudio lido tocado subsequentemente pelo usuário.
- **RF-14:** Persistir contadores agregados (`lidos`, `ouvidos`, `lidosETocados`, `inicioContagem`) no armazenamento local do navegador de forma 100% anônima.
- **RF-15:** Disponibilizar ao popup/painel os indicadores consolidados (taxa de adoção %, taxa de qualidade %, status das portas).
- **RF-16:** Permitir zeramento dos contadores com confirmação expressa.
- **RF-17:** Ignorar áudios de direção enviada (`direcao: 'enviado'`) nos contadores de adoção/qualidade.
- **RF-18:** Consultar e expor o estado de prontidão do motor (`pronto`, `iniciando`, `indisponivel`).
- **RF-19:** Caso o motor retorne indisponível, falhar imediatamente a fila com erro `MOTOR_INDISPONIVEL`.

---

## 3. Requisitos Não-Funcionais

- **RNF-01:** Overhead interno do núcleo ≤ 100 ms por transição de estado.
- **RNF-02:** Isolamento arquitetural pleno: zero importações ou dependências de APIs do Chrome (`chrome.*`) ou DOM (`document`, `window`) no código do domínio puro do núcleo.
- **RNF-03:** Privacidade absoluta: zero persistência de áudio ou texto em disco ou armazenamento de longo prazo; zero tráfego de rede externa.
- **RNF-04:** 100% de cobertura de testes unitários nas regras de negócio e transições de estado da máquina de fila e contadores.
