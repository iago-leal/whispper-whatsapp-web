# Spec: Integração com o WhatsApp Web

**Versão:** 1.0
**Status:** Rascunho
**Autor:** reversa-spec-sdd
**Data:** 2026-09-30
**Reviewers:** iago (pendente)
**Componente:** `integracao-whatsapp-web` · **Etapa:** primeira (uso pessoal)
**Fonte:** `_reversa_sdd/prd.md`

> Selo 🟡 PLANEJADO em todos os itens.
> Nesta spec, "o sistema" designa o adaptador do WhatsApp Web: a parte da extensão que roda dentro da página web.whatsapp.com e implementa a porta FonteDeAudio declarada em `nucleo-transcricao.md`.

---

## 1. Resumo

🟡 O adaptador é a única parte da extensão que conhece a página do WhatsApp Web. Localiza as mensagens de voz, insere o ícone de transcrição em cada uma, entrega ao núcleo o áudio já decifrado que a página carrega e informa os eventos de que o núcleo precisa: clique no ícone, reprodução pelo player e remoção da mensagem. Concentra num só lugar tudo o que precisa mudar quando o WhatsApp altera a interface.

---

## 2. Contexto e Motivação

**Problema:**
🟡 O WhatsApp Web não oferece interface de programação para extensões. A extensão depende da estrutura da página, que o WhatsApp altera sem aviso, e precisa obter áudios que chegam cifrados de ponta a ponta e só são decifrados dentro da página.

**Evidências:**
🟡 O PRD classifica como fatal a premissa 1: se a extensão não conseguir obter o áudio decifrado, o produto é inviável. O risco de mudança de interface tem impacto alto e probabilidade alta.

**Por que agora:**
🟡 O PRD recomenda validar o acesso ao áudio numa prova de conceito antes de qualquer outra frente. Esta spec define o que essa prova precisa demonstrar.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Ícone presente em 100% das mensagens de voz visíveis, recebidas e enviadas, em ≤ 500 ms após a mensagem aparecer.
- [ ] 🟡 G-02: Áudio decifrado entregue ao núcleo sem nenhum som e sem alterar o estado de reprodução visto pelo remetente.
- [ ] 🟡 G-03: 0 tarefas do adaptador acima de 50 ms na execução da página, para não travar o WhatsApp Web.
- [ ] 🟡 G-04: Quebra causada por mudança de interface sinalizada ao usuário em ≤ 10 s após o carregamento da conversa, em vez de falha silenciosa.
- [ ] 🟡 G-05: 100% dos seletores e referências à estrutura da página concentrados num único módulo de configuração.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| 🟡 Mensagens de voz visíveis com ícone | 🟡 0% | 🟡 100% | 🟡 primeira versão |
| 🟡 Tempo de inserção do ícone, p95 | 🟡 não se aplica | 🟡 ≤ 500 ms | 🟡 primeira versão |
| 🟡 Obtenção de áudio de até 5 min já carregado pela página | 🟡 manual, cerca de 3 passos | 🟡 ≤ 1 s | 🟡 primeira versão |
| 🟡 Tempo até sinalizar quebra de interface | 🟡 não se aplica | 🟡 ≤ 10 s | 🟡 primeira versão |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: 🟡 Áudios de visualização única: não recebem ícone, em respeito à restrição de acesso definida pelo remetente.
- NG-02: 🟡 Arquivos de áudio enviados como documento (anexo exibido como arquivo, e não como mensagem de voz); revisável em versão futura (OQ-02).
- NG-03: 🟡 Áudio de vídeos, de chamadas de voz e de status.
- NG-04: 🟡 Marcar ou desmarcar áudios como reproduzidos: o adaptador não altera o estado de reprodução que o remetente vê.
- NG-05: 🟡 Ler, enviar ou modificar mensagens de texto, contatos ou qualquer dado da conversa além dos áudios clicados e dos eventos listados nesta spec.
- NG-06: 🟡 Atuar em qualquer página além de web.whatsapp.com, inclusive no aplicativo WhatsApp para computador.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 usuário técnico (persona 1 do PRD), com o WhatsApp Web aberto no Chrome ao lado de outras tarefas.

**Usuário secundário:** 🟡 usuário leigo (persona 2), na etapa de distribuição, que atende clientes pelo WhatsApp Web ao longo do dia.

**Jornada atual (sem a feature):**
🟡 Para transcrever, o usuário baixa o áudio da conversa, localiza o arquivo no disco e o entrega ao mlx-whisper; nada na página indica que a transcrição é possível.

**Jornada futura (com a feature):**
🟡 Cada mensagem de voz exibe um ícone de transcrição ao lado do player; o usuário clica, e o áudio segue para o motor sem ser tocado e sem sair da conversa.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve inserir um ícone de transcrição em cada mensagem de voz visível na conversa aberta, recebida ou enviada, em conversa individual ou em grupo, inclusive nas encaminhadas. | Must | 🟡 Numa conversa de teste com 5 mensagens de voz visíveis, uma delas encaminhada e outra num grupo, contam-se 5 ícones. |
| RF-02 | 🟡 O sistema deve manter exatamente um ícone por mensagem, inclusive quando a página redesenhar a mensagem por rolagem, troca de conversa ou retorno à conversa. | Must | 🟡 Após rolar o histórico 3 vezes e voltar à conversa, cada mensagem de voz tem 1 ícone. |
| RF-03 | 🟡 O sistema deve inserir o ícone em até 500 ms após a mensagem aparecer na tela. | Must | 🟡 Em 20 mensagens medidas por marcação de tempo, p95 ≤ 500 ms. |
| RF-04 | 🟡 O sistema deve atribuir a cada mensagem de voz um identificador estável durante a sessão da aba, igual para a mesma mensagem após rolagem ou troca de conversa. | Must | 🟡 Sair da conversa e voltar preserva o identificador, o que se verifica pela janela aberta que reaparece no mesmo áudio. |
| RF-05 | 🟡 O sistema deve, ao clique no ícone, emitir ao núcleo o evento de pedido com o identificador e a direção (recebido ou enviado), sem tocar o áudio e sem acionar o player do WhatsApp. | Must | 🟡 O clique não produz som e não altera o botão de reprodução do WhatsApp. |
| RF-06 | 🟡 O sistema deve, quando o núcleo pedir, entregar os bytes do áudio já decifrado, o tipo de mídia e a duração em segundos, obtendo-o da cópia já carregada pela página ou pelo mecanismo de download da própria página, sem reprodução sonora. | Must | 🟡 Os bytes entregues tocam num player externo com a duração exibida pelo WhatsApp, com tolerância de 1 s; nenhum som é emitido durante a obtenção. |
| RF-07 | 🟡 O sistema deve obter o áudio sem alterar o estado de reprodução visto pelo remetente. | Must | 🟡 Após transcrever um áudio recebido e nunca tocado, o aparelho remetente de teste continua a mostrá-lo como não reproduzido. |
| RF-08 | 🟡 O sistema deve emitir ao núcleo o evento de reprodução iniciada, com identificador e direção, sempre que um áudio começar a tocar pelo player do WhatsApp, inclusive na reprodução automática do áudio seguinte. | Must | 🟡 Tocar A gera 1 evento para A; a reprodução automática de B após A gera 1 evento para B. |
| RF-09 | 🟡 O sistema deve emitir ao núcleo o evento de mensagem removida quando uma mensagem de voz com identificador conhecido for apagada para todos. | Should | 🟡 Apagar para todos, a partir do aparelho remetente de teste, um áudio com janela aberta dispara o evento em ≤ 2 s. |
| RF-10 | 🟡 O sistema deve fornecer à janela flutuante a âncora de cada mensagem (retângulo na tela e visibilidade) e notificá-la quando a posição ou a visibilidade mudar por rolagem, redimensionamento ou troca de conversa. | Must | 🟡 Rolar a conversa altera a posição informada; trocar de conversa marca a âncora como invisível; voltar a marca como visível. |
| RF-11 | 🟡 O sistema deve verificar, ao carregar a página e a cada troca de conversa, se as estruturas de que depende existem, e informar ao núcleo o estado "ativa" ou "degradada", com o nome de cada estrutura ausente. | Must | 🟡 Com um seletor propositalmente quebrado no módulo de configuração, o painel mostra "degradada" e o nome do item em ≤ 10 s. |
| RF-12 | 🟡 O sistema deve, em estado degradado, parar de inserir ícones sem interferir no funcionamento do WhatsApp Web. | Must | 🟡 Com um seletor quebrado, enviar mensagem e tocar áudio continuam funcionando, e nenhum erro não tratado aparece no console da página. |
| RF-13 | 🟡 O sistema deve manter todos os seletores e referências à estrutura da página num único módulo de configuração, versionado e separado da lógica. | Must | 🟡 Inspeção do código: nenhum seletor fora do módulo; o módulo declara a data da última verificação contra o WhatsApp Web. |
| RF-14 | 🟡 O sistema não deve inserir ícone em mensagens de voz de visualização única. | Must | 🟡 Uma mensagem de voz de visualização única recebida no teste não exibe ícone. |
| RF-15 | 🟡 O sistema deve dar ao ícone o rótulo acessível "Transcrever áudio" e permitir acioná-lo pelo teclado, com Enter ou Espaço. | Should | 🟡 Leitor de tela anuncia o rótulo; Tab alcança o ícone; Enter emite o pedido. |
| RF-16 | 🟡 O sistema deve refletir no ícone o estado do pedido informado pelo núcleo: transcrevendo, concluído ou erro. | Could | 🟡 Durante a transcrição, o ícone mostra indicador de progresso; após a conclusão, indicador de concluído. |

### 6.2 Fluxo Principal (Happy Path)

1. 🟡 O usuário abre uma conversa que contém um áudio recebido.
2. 🟡 O sistema detecta a mensagem de voz, atribui o identificador e insere o ícone ao lado do player.
3. 🟡 O usuário clica no ícone.
4. 🟡 O sistema emite ao núcleo o pedido, com o identificador e a direção "recebido".
5. 🟡 O núcleo pede o áudio; o sistema o obtém decifrado, sem som, e entrega bytes, tipo de mídia e duração.
6. 🟡 O sistema fornece à janela a âncora da mensagem e a mantém atualizada enquanto o usuário rola a conversa.
7. 🟡 Resultado: o áudio segue para a transcrição sem ter sido tocado, e o remetente continua a vê-lo como não reproduzido.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A, rolagem e redesenho:**
1. 🟡 O usuário rola a conversa até o áudio sair da tela e depois volta.
2. 🟡 O sistema reinsere o ícone sem duplicá-lo e preserva o identificador; a janela aberta reaparece junto ao áudio.

**Fluxo Alternativo B, interface alterada:**
1. 🟡 Uma atualização do WhatsApp Web muda a estrutura do player de voz.
2. 🟡 O sistema detecta a ausência, informa "degradada" ao núcleo e para de inserir ícones; o WhatsApp Web segue funcionando normalmente.

**Fluxo Alternativo C, reprodução pelo usuário:**
1. 🟡 O usuário toca um áudio pelo player do WhatsApp.
2. 🟡 O sistema emite ao núcleo o evento de reprodução iniciada, que alimenta os contadores.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | 🟡 Impacto na página | 🟡 0 tarefas do adaptador acima de 50 ms | 🟡 Medido com observador de tarefas longas do navegador numa conversa com 200 mensagens, 30 delas de voz. |
| RNF-02 | 🟡 Tempo de obtenção do áudio | 🟡 ≤ 1 s para áudio de até 5 min já carregado pela página | 🟡 Quando exigir download, o tempo de rede é registrado à parte e soma-se à latência do produto. |
| RNF-03 | 🟡 Estabilidade visual | 🟡 altura do balão da mensagem inalterada, com tolerância de 2 px | 🟡 O ícone não empurra nem cobre botões do WhatsApp (reproduzir, velocidade, foto do remetente). |
| RNF-04 | 🟡 Robustez | 🟡 0 exceções não tratadas no console da página | 🟡 Toda exceção do adaptador é capturada e convertida em estado degradado ou em erro do pedido. |
| RNF-05 | 🟡 Escopo de atuação | 🟡 injeção só em https://web.whatsapp.com/* | 🟡 Declarado no manifesto da extensão; verificável pela lista de permissões na loja e em chrome://extensions. |

---

## 8. Design e Interface

**Componentes afetados:** 🟡 lista de mensagens da conversa aberta e balão de cada mensagem de voz do WhatsApp Web.

**Comportamento esperado:**
🟡 Um ícone pequeno aparece junto ao player de cada mensagem de voz, sem cobrir os controles do WhatsApp. Ao passar o ponteiro, surge a dica "Transcrever áudio". O clique emite o pedido ao núcleo, que abre a janela flutuante (spec `janela-flutuante`). A posição exata do ícone no balão está em aberto (OQ-03).

**Estados da UI (ícone):**
- Estado vazio: 🟡 conversa sem mensagens de voz: nenhum ícone.
- Estado de carregamento: 🟡 indicador de progresso no ícone enquanto o áudio é obtido ou transcrito (RF-16).
- Estado de erro: 🟡 indicador de erro no ícone quando o pedido falha; em estado degradado, nenhum ícone e aviso no painel da extensão.
- Estado de sucesso: 🟡 indicador de concluído no ícone de áudio já transcrito na sessão da aba.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
MensagemDeVoz {                  // memória da aba
  idAudio: texto opaco           // derivado do identificador que a própria página atribui à mensagem
  direcao: recebido | enviado
  duracaoSeg: número
  visualizacaoUnica: booleano    // quando verdadeiro, nenhum ícone
}

ConfiguracaoDeEstruturas {       // módulo versionado do adaptador; não é dado do usuário
  versao: texto
  verificadoEm: data             // última verificação contra o WhatsApp Web em produção
  itens: nome → regra de localização na página
}
```

**Migrações necessárias:** 🟡 Não; primeira versão.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| 🟡 Página web.whatsapp.com (estrutura e mídia decifrada) | 🟡 Obrigatória | 🟡 Muda sem aviso; o adaptador entra em estado degradado e não insere ícones. |
| 🟡 Servidores de mídia do WhatsApp, acessados pelo mecanismo da própria página | 🟡 Obrigatória para áudios ainda não carregados | 🟡 O pedido termina em AUDIO_INDISPONIVEL com o motivo. |
| 🟡 Núcleo (porta FonteDeAudio) | 🟡 Obrigatória | 🟡 Sem o núcleo, o clique no ícone não tem efeito; o adaptador não insere ícones. |
| 🟡 Janela flutuante (consumidora da âncora) | 🟡 Obrigatória | 🟡 Sem âncora, a janela não abre (ver spec `janela-flutuante`). |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: 🟡 Áudio ainda não carregado | 🟡 Áudio recebido que a página ainda não baixou | 🟡 O sistema aciona o download pelo mecanismo da própria página e entrega o áudio decifrado, sem som. |
| EC-02: 🟡 Mídia expirada | 🟡 O servidor não tem mais o arquivo e não há cópia local | 🟡 AUDIO_INDISPONIVEL com o motivo "Este áudio não está mais disponível no WhatsApp". |
| EC-03: 🟡 Falha de rede no download | 🟡 Download sem conclusão em 30 s (timeout) ou conexão perdida | 🟡 AUDIO_INDISPONIVEL com o motivo "Falha ao baixar o áudio; verifique a conexão". |
| EC-04: 🟡 Estrutura ausente | 🟡 Atualização da interface do WhatsApp Web | 🟡 Estado degradado, aviso no painel com o nome da estrutura, nenhum ícone inserido. |
| EC-05: 🟡 Mensagem apagada para todos | 🟡 O remetente apaga um áudio com identificador conhecido | 🟡 Evento de mensagem removida ao núcleo; o ícone some junto com a mensagem. |
| EC-06: 🟡 Troca de conversa durante a obtenção | 🟡 O usuário sai da conversa enquanto o áudio é baixado | 🟡 A obtenção prossegue pelo identificador; se a página tiver descartado a mensagem, AUDIO_INDISPONIVEL com o motivo "Abra a conversa e tente de novo". |
| EC-07: 🟡 Visualização única | 🟡 Mensagem de voz marcada como visualização única | 🟡 Nenhum ícone. |
| EC-08: 🟡 Áudio enviado como documento | 🟡 Anexo de áudio exibido como arquivo | 🟡 Nenhum ícone nesta versão. |
| EC-09: 🟡 Mensagem citada | 🟡 Resposta que cita um áudio | 🟡 Nenhum ícone na citação; o ícone fica só na mensagem original. |
| EC-10: 🟡 Sessão aberta em outra janela | 🟡 A página exibe o aviso de que o WhatsApp está aberto em outro lugar | 🟡 Nenhuma conversa carregada, nenhum ícone e nenhum aviso de degradação. |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 O adaptador usa a sessão do WhatsApp Web aberta pelo usuário; não lê, copia nem guarda credenciais, chaves ou dados da sessão.
- **Autorização:** 🟡 O código do adaptador só é injetado em web.whatsapp.com; nenhuma outra origem recebe o código nem os dados.
- **Dados sensíveis:** 🟡 Áudios de terceiros são obtidos só após o clique do usuário e entregues ao núcleo, sem cópia nem gravação pelo adaptador. Identificadores e direção das mensagens ficam apenas na memória da aba.
- **Auditoria:** 🟡 Sem registro de conteúdo. O diagnóstico registra apenas o nome da estrutura ausente e a versão do módulo de configuração.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 Começar por uma prova de conceito isolada que demonstre o RF-06 e o RF-07 (áudio decifrado, sem som e sem marcar reproduzido), antes de qualquer outra frente, conforme o PRD. Aprovada a prova, a extensão roda em modo de desenvolvedor na máquina do usuário técnico.
- **Como reverter (rollback):** 🟡 Desativar a extensão; o WhatsApp Web volta ao estado original sem resíduos, porque o adaptador não altera dados da página nem da conta.
- **Monitoramento pós-deploy:** 🟡 A cada atualização percebida do WhatsApp Web, o usuário confere o estado da integração no painel; ao corrigir uma quebra, registra a data e a nova versão do módulo de configuração.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | 🟡 ⚠️ ABERTO: Se a prova de conceito não encontrar caminho para obter o áudio sem marcá-lo como reproduzido (RF-07), o usuário aceita que a transcrição marque o áudio como ouvido? | Alto | iago | ao fim da prova de conceito |
| OQ-02 | 🟡 ⚠️ ABERTO: Arquivos de áudio enviados como documento devem receber ícone numa versão futura? | Baixo | iago | após a primeira versão |
| OQ-03 | 🟡 ⚠️ ABERTO: Posição do ícone no balão: antes do botão de reprodução ou depois da duração? | Baixo | iago | antes de /reversa-coding |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| 🟡 Ícone também em áudios enviados | 🟡 Só em recebidos | 🟡 O PRD pede o ícone em cada mensagem de áudio; os contadores desconsideram os enviados. |
| 🟡 Nenhum ícone em visualização única | 🟡 Tratar como áudio comum | 🟡 Respeita a restrição de acesso escolhida pelo remetente. |
| 🟡 Não alterar o estado de reprodução | 🟡 Marcar como ouvido ao transcrever | 🟡 Leitura silenciosa, coerente com o uso sem ouvir; sujeita ao resultado da prova de conceito (OQ-01). |
| 🟡 Estado degradado visível | 🟡 Tentar seguir e falhar em silêncio | 🟡 Mitigação do PRD para o risco de mudança de interface. |
| 🟡 Seletores num único módulo | 🟡 Seletores espalhados pelo código | 🟡 Isola num ponto a manutenção exigida pela premissa 1. |
| 🟡 Técnica de obtenção do áudio deixada para o /reversa-plan | 🟡 Fixá-la nesta spec | 🟡 A spec define o comportamento; a técnica depende do resultado da prova de conceito. |

---

## Apêndice

### Glossário
- 🟡 **Mensagem de voz:** áudio gravado no próprio WhatsApp e exibido com player e forma de onda.
- 🟡 **Estado de reprodução:** indicação, vista pelo remetente, de que o destinatário tocou o áudio.
- 🟡 **Estado degradado:** situação em que o adaptador não encontra na página as estruturas de que depende.
- 🟡 **Âncora:** posição e visibilidade do balão da mensagem na tela, usadas para posicionar a janela.

### Referências
- 🟡 `_reversa_sdd/prd.md`, seção 8 (premissa 1 e mudança de interface).
- 🟡 `_reversa_sdd/sdd/nucleo-transcricao.md`, contrato da porta FonteDeAudio.

### Histórico de Revisões
| Versão | Data | Autor | Mudanças |
|--------|------|-------|---------|
| 1.0 | 2026-09-30 | reversa-spec-sdd | Criação inicial |

---

## Relatório de avaliação

Avaliação automática por `spec_scorer.py`, iteração 1, em 2026-09-30:

```
============================================================
  SPEC QUALITY REPORT
  Arquivo: /Users/iagoleal/dev/whispper-whatsapp-web/_reversa_sdd/sdd/.integracao-whatsapp-web.md.tmp
============================================================

  SCORE TOTAL: 100.0/100  —  ⭐ Excelente — Pronta para implementação

  BREAKDOWN POR DIMENSÃO:
  Dimensão             Score      Peso     Contribuição
  --------------------------------------------------
  Completude           100%       30%     30.0/pt
  Testabilidade        100%       25%     25.0/pt
  Clareza              100%       20%     20.0/pt
  Escopo               100%       15%     15.0/pt
  Edge Cases           100%       10%     10.0/pt

  ✅ PONTOS FORTES:
     ✅ Seção 1 (Resumo) presente e preenchida
     ✅ Seção 2 (Contexto) presente e preenchida
     ✅ Seção 3 (Goals) presente e preenchida
     ✅ Seção 4 (Non-Goals) presente e preenchida
     ✅ Seção 5 (Usuários) presente e preenchida

============================================================
```

**Gaps críticos apontados pelo avaliador:** nenhum.

**Sugestões:** o avaliador mede a estrutura da spec, e não a resolução do conteúdo. Antes de `/reversa-plan`, resolver as questões abertas abaixo, registradas na seção 14:

- 🟡 OQ-01 (impacto alto): conduta se a prova de conceito não obtiver o áudio sem marcá-lo como ouvido.
