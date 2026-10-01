# Roadmap: Integração com o WhatsApp Web

> Identificador: `002-integracao-whatsapp-web`
> Data: 2026-10-01
> Requirements: `_reversa_forward/002-integracao-whatsapp-web/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A integração com o WhatsApp Web é implementada como um content script modular e desacoplado na extensão. Ele divide-se em quatro responsabilidades: (1) `configuracao-estruturas.ts` para isolar seletores de DOM com versionamento; (2) `detector-mensagens.ts` baseado em `MutationObserver` refinado para inserção idempotente do botão de transcrição; (3) `extrator-audio.ts` para capturar os bytes do blob decifrado sem disparar áudio audível; e (4) `adaptador-whatsapp-web.ts` que implementa a porta `FonteDeAudio` e gerencia a emissão de eventos e âncoras para o núcleo da extensão.

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|---|---|---|
| I. Longevidade e Manutenibilidade | Isola 100% dos seletores de DOM instáveis em um único arquivo de configuração versionado. | respeita |
| II. Baixo Acoplamento | Expõe a porta `FonteDeAudio` em TypeScript; o resto da extensão ignora a estrutura da página. | respeita |
| III. Privacidade Estrita | Não acessa, não copia e não armazena mensagens de texto, contatos ou imagens do WhatsApp. | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|---|---|---|---|---|
| D-01 | Injeção via Content Script isolado configurado no `manifest.json` com `matches: ["https://web.whatsapp.com/*"]`. | Padrão seguro de extensões MV3 sem poluir contexto global desnecessariamente. | Injeção via `chrome.scripting.executeScript` sob demanda ao clicar no ícone da extensão. | 🟢 |
| D-02 | Captura de áudio decifrado diretamente do elemento `<audio>` / blob URL da página via `fetch()`. | Evita re-implementar a cifra Signal Protocol / Noise do WhatsApp na extensão. | Captura de pacotes de rede via webRequest/debugger (invasivo e complexo). | 🟡 |
| D-03 | Observação restrita de mutações de DOM com `debounce` e marcação `data-whispper-injected`. | Atende o RNF-01 de zero tarefas longas (> 50 ms), garantindo que a rolagem permaneça a 60 fps. | MutationObserver global sem filtro (causa travamentos). | 🟢 |
| D-04 | Detecção de estado degradado com desligamento automático em falha de seletores críticos. | Protege a integridade do WhatsApp Web contra crashes em caso de atualizações de interface. | Deixar lançar exceção não capturada ou tentar seletores em loop infinito. | 🟢 |

## 4. Premissas

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|---|---|---|
| O áudio descriptografado está acessível via URL blob do elemento de áudio nativo sem disparar som. | `requirements.md#RF-06`, `questions.md` | Se o WhatsApp revogar o blob ou não mantiver URL em cache, pode ser necessário simular o clique de download. |
| O botão deve ser inserido à direita da barra de reprodução e contador. | `requirements.md#RF-14`, `questions.md` | Ajuste cosmético de CSS caso haja variação em telas pequenas. |

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|---|---|---|---|
| Extensão Manifest | `extension/manifest.json` | contrato-alterado | Adiciona `content_scripts` para `https://web.whatsapp.com/*` e CSS base. |
| Porta FonteDeAudio | `_reversa_sdd/sdd/nucleo-transcricao.md` | contrato-novo | Formaliza a interface `FonteDeAudio` em `extension/src/dominio/fonte-de-audio.ts`. |
| Adaptador WhatsApp Web | `_reversa_sdd/sdd/integracao-whatsapp-web.md` | componente-novo | Implementa content script, detecção de mensagens, injeção e extração de mídia. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Entidades puramente voláteis em memória da aba (`MensagemDeVoz`, `CoordenadasAncora`, `EstadoIntegracao`).
- Detalhe completo em: `_reversa_forward/002-integracao-whatsapp-web/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|---|---|---|
| `FonteDeAudio` | Interface TypeScript (Porta Hexagonal) | `_reversa_forward/002-integracao-whatsapp-web/interfaces/porta-fonte-de-audio.md` |

## 8. Plano de migração

Não se aplica (feature greenfield em nova extensão).

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Mudança de classes CSS e markup pelo WhatsApp | alto | alto | Seletores semânticos em `configuracao-estruturas.ts` + `MonitorDegradacao` para desligamento seguro. |
| Renderização virtualizada causando injeções duplicadas | médio | alto | Atributo `data-whispper-injected="true"` no nó do botão e `Map` de IDs conhecidos. |
| Disparo de som acidental ao obter mídia | alto | baixo | Leitura direta do buffer via `fetch(blobUrl)` sem invocar `.play()`. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Testes unitários do content script e do adaptador passando no `npm test`
- [ ] `legacy-impact.md` e `regression-watch.md` gerados
- [ ] Adendo gerado em `_reversa_sdd/addenda/002-integracao-whatsapp-web.md` via `/reversa-sync`

## 11. Histórico de alterações

| Data | Alteração | Autor |
|---|---|---|
| 2026-10-01 | Versão inicial gerada por `reversa-forward-autonomous` | reversa-plan |
