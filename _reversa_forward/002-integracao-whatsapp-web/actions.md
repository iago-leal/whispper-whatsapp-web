# Actions: Integração com o WhatsApp Web

> Identificador: `002-integracao-whatsapp-web`
> Data: 2026-10-01
> Roadmap: `_reversa_forward/002-integracao-whatsapp-web/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 17 |
| Paralelizáveis (`[//]`) | 9 |
| Maior cadeia de dependência | 6 (T001 → T004 → T008 → T013 → T014 → T015 → T016) |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar a porta `FonteDeAudio` em `extension/src/dominio/fonte-de-audio.ts` definindo os tipos de áudio, eventos de clique, reprodução e remoção. | - | `[//]` | `extension/src/dominio/fonte-de-audio.ts` | 🟢 | `[X]` |
| T002 | Criar o módulo de configuração de estruturas `extension/src/content/configuracao-estruturas.ts` isolando todos os seletores de DOM com versionamento. | - | `[//]` | `extension/src/content/configuracao-estruturas.ts` | 🟢 | `[X]` |
| T003 | Atualizar `extension/manifest.json` registrando `content_scripts` para `https://web.whatsapp.com/*` e folha de estilos `dist/content/estilos.css`. | - | `[//]` | `extension/manifest.json` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Escrever testes de unidade para `configuracao-estruturas.ts` em `extension/test/configuracao-estruturas.test.ts` cobrindo resolução de seletores e tolerância a nós ausentes. | T002 | `[//]` | `extension/test/configuracao-estruturas.test.ts` | 🟢 | `[X]` |
| T005 | Escrever testes de unidade para o extrator de áudio em `extension/test/extrator-audio.test.ts` simulando a interceptação de blobs e leitura de ArrayBuffer sem som. | T001 | `[//]` | `extension/test/extrator-audio.test.ts` | 🟡 | `[X]` |
| T006 | Escrever testes de unidade para detecção de mensagens e injeção em `extension/test/detector-mensagens.test.ts` cobrindo inserção idempotente e mutações de DOM. | T001, T002 | `[//]` | `extension/test/detector-mensagens.test.ts` | 🟢 | `[X]` |
| T007 | Escrever testes de unidade para o monitor de degradação e rastreador de âncoras em `extension/test/monitor-degradacao.test.ts`. | T002 | `[//]` | `extension/test/monitor-degradacao.test.ts` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Implementar `extension/src/content/extrator-audio.ts` obtendo bytes decifrados de blob URLs da página sem invocar reprodução de áudio audível. | T001, T005 | - | `extension/src/content/extrator-audio.ts` | 🟡 | `[X]` |
| T009 | Implementar o componente visual e DOM do botão em `extension/src/content/botao-transcricao.ts` com SVG, acessibilidade e prevenção de duplicações. | T002 | `[//]` | `extension/src/content/botao-transcricao.ts` | 🟢 | `[X]` |
| T010 | Implementar `extension/src/content/detector-mensagens.ts` usando MutationObserver otimizado sobre o chat ativo para inserção rápida de botões. | T002, T006, T009 | - | `extension/src/content/detector-mensagens.ts` | 🟢 | `[X]` |
| T011 | Implementar `extension/src/content/rastreador-ancora.ts` para monitoramento de coordenadas e visibilidade das mensagens na tela. | T001, T007 | `[//]` | `extension/src/content/rastreador-ancora.ts` | 🟢 | `[X]` |
| T012 | Implementar `extension/src/content/monitor-degradacao.ts` para verificação de saúde dos seletores e emissão de estado degradado em falhas de layout. | T002, T007 | `[//]` | `extension/src/content/monitor-degradacao.ts` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T013 | Implementar `extension/src/adaptadores/adaptador-whatsapp-web.ts` integrando detector, extrator e monitor sob a porta `FonteDeAudio`. | T001, T008, T010, T011, T012 | - | `extension/src/adaptadores/adaptador-whatsapp-web.ts` | 🟢 | `[X]` |
| T014 | Implementar o ponto de entrada do content script `extension/src/content/index.ts` e arquivo de estilos `extension/src/content/estilos.css`. | T003, T013 | - | `extension/src/content/index.ts` | 🟢 | `[X]` |
| T015 | Atualizar o service worker `extension/src/background.ts` para rotear eventos de clique do content script para o `MotorDeTranscricao` local. | T014 | - | `extension/src/background.ts` | 🟢 | `[X]` |
| T016 | Executar a compilação completa (`npm run build`) e a suíte de testes (`npm test`) em `extension/`, validando 100% dos testes. | T015 | - | `extension/package.json` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T017 | Escrever o guia de arquitetura e manutenção de seletores em `extension/src/content/README.md`. | T016 | `[//]` | `extension/src/content/README.md` | 🟢 | `[X]` |

## Notas de execução

<!-- Anotações preenchidas durante a execução de /reversa-coding -->

## Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-10-01 | Decomposição inicial gerada por `reversa-forward-autonomous` | reversa-to-do |
