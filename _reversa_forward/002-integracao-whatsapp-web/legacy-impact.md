# Impacto no legado: Integração com WhatsApp Web

> Identificador: `002-integracao-whatsapp-web`
> Data: 2026-10-01
> Feature greenfield, sem legado pré-existente. Âncora: prd.md + specs SDD.
> Política de edição no momento da execução: `.reversa/reversa-config.json` com `allowLegacyEdits: true` e `allowedPaths` vazio, isto é, liberação irrestrita do projeto. Nenhum arquivo foi apagado.

## 1. Arquivos afetados

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|---|---|---|---|---|
| `extension/src/dominio/fonte-de-audio.ts` | Porta FonteDeAudio | componente-novo | HIGH | Formalização da interface hexagonal para desacoplamento do núcleo. |
| `extension/src/content/configuracao-estruturas.ts` | Configuração de Estruturas | componente-novo | HIGH | Centralização e isolamento de todos os seletores de DOM do WhatsApp Web. |
| `extension/src/content/extrator-audio.ts` | Adaptador WhatsApp Web | componente-novo | HIGH | Obtenção dos bytes de áudio descriptografados diretamente do blob da página sem som. |
| `extension/src/content/botao-transcricao.ts` | Adaptador WhatsApp Web | componente-novo | MEDIUM | Componente visual do botão de transcrição com suporte a acessibilidade e estados de UI. |
| `extension/src/content/detector-mensagens.ts` | Adaptador WhatsApp Web | componente-novo | HIGH | Observer otimizado para inserção idempotente e detecção de mensagens de voz. |
| `extension/src/content/rastreador-ancora.ts` | Adaptador WhatsApp Web | componente-novo | MEDIUM | Cálculo dinâmico de coordenadas e visibilidade do balão de mensagem para a janela flutuante. |
| `extension/src/content/monitor-degradacao.ts` | Adaptador WhatsApp Web | componente-novo | HIGH | Monitoramento de integridade estrutural e desligamento preventivo em caso de quebra de layout. |
| `extension/src/adaptadores/adaptador-whatsapp-web.ts` | Adaptador WhatsApp Web | componente-novo | HIGH | Implementação da porta FonteDeAudio integrando todos os submódulos da página. |
| `extension/src/content/index.ts` | Content Script | componente-novo | MEDIUM | Ponto de entrada do script injetado em web.whatsapp.com. |
| `extension/src/content/estilos.css` | Content Script | componente-novo | LOW | Folha de estilos dos botões e animações do Whispper. |
| `extension/src/background.ts` | Service Worker | componente-alterado | MEDIUM | Roteamento de mensagens do content script para o MotorDeTranscricao local. |
| `extension/manifest.json` | Extensão MV3 | componente-alterado | HIGH | Registro dos content_scripts e permissões para web.whatsapp.com. |
| `extension/package.json`, `tsconfig.json` | Infraestrutura de Build | componente-alterado | LOW | Adição de bibliotecas de DOM e cópia de CSS no build. |
| `extension/test/configuracao-estruturas.test.ts`, `extrator-audio.test.ts`, `detector-mensagens.test.ts`, `monitor-degradacao.test.ts` | Testes | componente-novo | LOW | Bateria de testes unitários do content script e do adaptador. |

## 2. Diff conceitual por componente

**Porta FonteDeAudio:** Define o contrato que desacopla completamente o núcleo de transcrição e a janela flutuante de qualquer detalhe do DOM do WhatsApp.

**Content Script e Adaptador WhatsApp Web:** Injeta botões acessíveis em balões de áudio do WhatsApp Web, captura os buffers decifrados sem som através de `fetch` em blob URLs locais e notifica o service worker. Fornece salvaguardas robustas: se um seletor quebrar após uma atualização do WhatsApp, o sistema entra em estado degradado sem poluir o console ou impactar a navegação do usuário.

## 3. Preservadas

Feature greenfield, sem regras de legado pré-existente para preservar.

## 4. Modificadas

Feature greenfield, sem regras de legado pré-existente modificadas.
