# Spec: Janela flutuante de transcrição

**Versão:** 1.0
**Status:** Rascunho
**Autor:** reversa-spec-sdd
**Data:** 2026-09-30
**Reviewers:** iago (pendente)
**Componente:** `janela-flutuante` · **Etapa:** primeira (uso pessoal)
**Fonte:** `_reversa_sdd/prd.md`

> Selo 🟡 PLANEJADO em todos os itens.
> Nesta spec, "o sistema" designa a janela flutuante: o adaptador que implementa a porta ExibicaoDeTranscricao declarada em `nucleo-transcricao.md`.

---

## 1. Resumo

🟡 A janela flutuante exibe a transcrição de um áudio num pequeno quadro ancorado ao balão da mensagem, que acompanha o balão durante a rolagem. Várias janelas podem ficar abertas ao mesmo tempo, uma por áudio, para ler em ordem uma fala fragmentada; cada uma mostra o estado do pedido e fecha individualmente.

---

## 2. Contexto e Motivação

**Problema:**
🟡 No fluxo manual atual, o texto aparece no terminal, longe da conversa, e perde-se a relação entre cada trecho e o áudio de origem. Com áudios fragmentados, o usuário precisa remontar a ordem de memória.

**Evidências:**
🟡 O brief pede uma "janelinha flutuante que deriva do próprio áudio" e a possibilidade de abrir várias, "pois pessoas mandam áudios fragmentados". A jornada do usuário técnico (passos 3 a 6) depende disso.

**Por que agora:**
🟡 A janela é a superfície em que o valor do produto se realiza: ler em segundos, e em silêncio, uma sequência de áudios.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: A janela aparece em ≤ 150 ms após o pedido do núcleo.
- [ ] 🟡 G-02: Até 20 janelas abertas ao mesmo tempo, sem sobreposição entre elas e sem tarefa acima de 50 ms durante a rolagem.
- [ ] 🟡 G-03: Cada janela permanece visualmente ligada ao seu áudio e o acompanha na rolagem com defasagem de no máximo 1 quadro de tela (16 ms).
- [ ] 🟡 G-04: 100% das janelas fecham individualmente, pelo botão de fechar ou pela tecla Esc.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| 🟡 Tempo do pedido do núcleo à janela visível | 🟡 não se aplica | 🟡 ≤ 150 ms | 🟡 primeira versão |
| 🟡 Janelas simultâneas sem sobreposição | 🟡 não se aplica | 🟡 20 | 🟡 primeira versão |
| 🟡 Tarefas acima de 50 ms ao rolar com 20 janelas | 🟡 não se aplica | 🟡 0 | 🟡 primeira versão |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: 🟡 Editar o texto transcrito dentro da janela.
- NG-02: 🟡 Lista ou histórico de transcrições fora das janelas: o texto vive na memória da aba, e só a janela o exibe.
- NG-03: 🟡 Tocar o áudio pela janela: o player do WhatsApp, ao lado, continua sendo o meio de ouvir.
- NG-04: 🟡 Exibir a transcrição fora da aba do WhatsApp Web, como em janela do sistema operacional ou painel lateral do Chrome.
- NG-05: 🟡 Destacar palavras em sincronia com a reprodução do áudio.
- NG-06: 🟡 Arrastar a janela para outra posição, o que romperia a ancoragem pedida no brief (OQ-03).
- NG-07: 🟡 Resumo, tradução ou sugestão de resposta, adiados no PRD.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 usuário técnico (persona 1 do PRD), que lê sequências de áudios fragmentados sem poder ou querer ouvi-los.

**Usuário secundário:** 🟡 usuário leigo (persona 2), na etapa de distribuição, que lê os áudios de clientes enquanto atende outra pessoa.

**Jornada atual (sem a feature):**
🟡 O usuário lê a transcrição no terminal, volta ao WhatsApp para identificar a que áudio ela corresponde e repete o processo para cada fragmento da sequência.

**Jornada futura (com a feature):**
🟡 O usuário clica nos ícones da sequência; cada janela abre ao lado do seu áudio; ele lê as janelas de cima para baixo, na ordem da conversa, e as fecha uma a uma antes de responder.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve abrir a janela, quando o núcleo solicitar, ao lado do balão do áudio, no espaço livre da área da conversa: à direita dos áudios recebidos e à esquerda dos enviados, com o topo alinhado ao topo do balão. | Must | 🟡 Medição na tela: 8 px entre a borda da janela e o balão; topos alinhados com tolerância de 4 px. |
| RF-02 | 🟡 O sistema deve, quando o espaço livre ao lado do balão for menor que a largura da janela, abri-la sobreposta à conversa, imediatamente abaixo do balão e sem cobri-lo. | Must | 🟡 Com a área da conversa reduzida a 600 px de largura, a janela aparece abaixo do balão e o balão permanece visível. |
| RF-03 | 🟡 O sistema deve acompanhar a posição do balão durante a rolagem e o redimensionamento, ocultando a janela enquanto o balão estiver fora da área visível e reexibindo-a, com o mesmo conteúdo, quando ele voltar. | Must | 🟡 Rolar até o balão sair da tela oculta a janela; voltar a exibe com o mesmo texto e sem nova chamada ao núcleo. |
| RF-04 | 🟡 O sistema deve ocultar as janelas da conversa anterior quando o usuário trocar de conversa e reexibi-las, ainda abertas, quando ele voltar. | Must | 🟡 Com 2 janelas abertas na conversa X, abrir a conversa Y não mostra janelas; voltar a X mostra as 2. |
| RF-05 | 🟡 O sistema deve permitir várias janelas abertas ao mesmo tempo, uma por áudio, deslocando para baixo a janela cuja posição ideal colidir com outra e mantendo uma seta que a liga ao balão de origem. | Must | 🟡 Cinco áudios consecutivos de 3 s transcritos resultam em 5 janelas, nenhuma sobreposta, cada seta apontando para o balão correto. |
| RF-06 | 🟡 O sistema deve exibir o estado informado pelo núcleo: "Na fila (N à frente)", "Transcrevendo…" com o tempo decorrido em segundos, o texto quando concluído, ou a mensagem do erro com o botão "Tentar de novo". | Must | 🟡 Um pedido simulado passa pelos 4 estados e a janela exibe, em cada um, o conteúdo especificado na seção 8. |
| RF-07 | 🟡 O sistema deve exibir o texto completo numa janela de 320 px de largura, com altura ajustada ao texto até 240 px e rolagem interna acima disso. | Must | 🟡 O texto de 3 min de fala exibe barra de rolagem interna; o texto de uma frase não exibe. |
| RF-08 | 🟡 O sistema deve permitir selecionar e copiar o texto com os comandos nativos do sistema operacional. | Must | 🟡 Selecionar com o mouse e copiar com Cmd+C transfere o texto exato para a área de transferência. |
| RF-09 | 🟡 O sistema deve oferecer um botão "Copiar", que copia o texto completo para a área de transferência e confirma a cópia por 2 s. | Could | 🟡 O clique em "Copiar" transfere o texto completo e exibe "Copiado" por 2 s. |
| RF-10 | 🟡 O sistema deve fechar a janela pelo botão de fechar ou pela tecla Esc, quando a janela tiver o foco, e informar o fechamento ao núcleo. | Must | 🟡 Ambos os meios removem a janela e geram exatamente 1 evento janelaFechada. |
| RF-11 | 🟡 O sistema deve, quando o núcleo pedir destaque, trazer a janela para a frente das demais e aplicar um realce visual de 1 s. | Must | 🟡 Novo clique no ícone de um áudio com janela aberta mantém 1 janela, agora à frente, com realce de 1 s. |
| RF-12 | 🟡 O sistema deve exibir "Nenhuma fala reconhecida" quando o texto concluído for vazio. | Must | 🟡 Pedido simulado concluído com texto vazio exibe a frase. |
| RF-13 | 🟡 O sistema deve seguir o tema claro ou escuro ativo no WhatsApp Web, inclusive quando o usuário trocar de tema com janelas abertas. | Should | 🟡 Trocar o tema com 2 janelas abertas altera as cores de ambas sem fechá-las. |
| RF-14 | 🟡 O sistema deve anunciar as mudanças de estado a leitores de tela e ser operável por teclado, com Tab alcançando os botões da janela. | Should | 🟡 O leitor de tela anuncia "Transcrição concluída"; Tab percorre "Copiar", "Tentar de novo" e "Fechar". |
| RF-15 | 🟡 O sistema deve exibir, abaixo do texto, o idioma detectado quando for diferente de português. | Could | 🟡 Áudio em inglês exibe "Idioma: inglês"; áudio em português não exibe a linha. |

### 6.2 Fluxo Principal (Happy Path)

1. 🟡 O núcleo solicita a abertura da janela para o áudio A.
2. 🟡 O sistema obtém a âncora de A e abre a janela ao lado do balão, no estado "Na fila".
3. 🟡 O núcleo informa "transcrevendo"; o sistema exibe o indicador e o tempo decorrido.
4. 🟡 O núcleo informa "concluído" com o texto; o sistema o exibe e anuncia a mudança.
5. 🟡 O usuário rola a conversa; o sistema move a janela junto com o balão.
6. 🟡 O usuário fecha a janela; o sistema a remove e informa o núcleo.
7. 🟡 Resultado: o usuário leu o texto de A ao lado do próprio áudio, sem ouvi-lo.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A, várias janelas:**
1. 🟡 O núcleo solicita janelas para A, B e C, áudios consecutivos.
2. 🟡 O sistema posiciona cada uma ao lado do seu balão; havendo colisão, desloca a de baixo e mantém a seta até o balão de origem.

**Fluxo Alternativo B, área estreita:**
1. 🟡 A área da conversa não tem espaço livre ao lado do balão.
2. 🟡 O sistema abre a janela sobreposta, imediatamente abaixo do balão.

**Fluxo Alternativo C, erro:**
1. 🟡 O núcleo informa erro, com código e motivo.
2. 🟡 O sistema exibe a mensagem correspondente e o botão "Tentar de novo"; o clique é repassado ao núcleo.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | 🟡 Tempo de abertura | 🟡 ≤ 150 ms do pedido do núcleo à janela visível | 🟡 Medido por marcação de tempo. |
| RNF-02 | 🟡 Rolagem com janelas abertas | 🟡 0 tarefas acima de 50 ms e defasagem ≤ 16 ms com 20 janelas | 🟡 Medido com observador de tarefas longas do navegador. |
| RNF-03 | 🟡 Isolamento de estilo | 🟡 0 alterações no estilo dos elementos do WhatsApp com janelas abertas | 🟡 Os estilos da janela não vazam para a página, e os da página não alteram a janela. |
| RNF-04 | 🟡 Acessibilidade | 🟡 contraste ≥ 4,5:1 nos dois temas (WCAG 2.1 AA) | 🟡 Operação completa por teclado. |
| RNF-05 | 🟡 Legibilidade | 🟡 texto com corpo ≥ 14 px | 🟡 Legível sem ampliar a página. |

---

## 8. Design e Interface

**Componentes afetados:** 🟡 janela (cabeçalho com a duração do áudio e o botão de fechar; corpo com o estado ou o texto; rodapé com o botão "Copiar" e, quando aplicável, o idioma), seta de ligação ao balão.

**Comportamento esperado:**
🟡 A janela surge ao lado do balão, com uma seta apontando para ele, e acompanha a rolagem. Janelas de áudios consecutivos empilham-se sem se sobrepor. O foco do teclado vai para a janela recém-aberta sem roubar o campo de digitação do WhatsApp quando o usuário estiver escrevendo.

**Estados da UI:**
- Estado vazio: 🟡 "Nenhuma fala reconhecida", quando o texto concluído vier vazio.
- Estado de carregamento: 🟡 "Na fila (N à frente)" ou "Transcrevendo… 7 s".
- Estado de erro: 🟡 mensagem conforme o código, com o botão "Tentar de novo".
- Estado de sucesso: 🟡 o texto transcrito.

**Mensagens de erro por código:**

| Código | Mensagem exibida |
|--------|------------------|
| 🟡 MOTOR_INDISPONIVEL | 🟡 "Motor de transcrição indisponível. Verifique se o aplicativo auxiliar está instalado." |
| 🟡 AUDIO_INDISPONIVEL | 🟡 "Não foi possível obter este áudio." seguida do motivo recebido. |
| 🟡 TEMPO_ESGOTADO | 🟡 "A transcrição passou do tempo limite." |
| 🟡 FALHA_NA_TRANSCRICAO | 🟡 "O motor não conseguiu transcrever este áudio." seguida do motivo recebido. |
| 🟡 VERSAO_INCOMPATIVEL | 🟡 "Atualize o aplicativo auxiliar para a versão compatível com a extensão." |

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
JanelaAberta {                   // memória da aba; nada é persistido
  idAudio: texto opaco
  visivel: booleano              // falso quando o balão está fora da tela ou em outra conversa
  deslocamentoVertical: px       // aplicado quando há colisão com outra janela
  modo: lateral | sobreposta
}
```

**Migrações necessárias:** 🟡 Não; primeira versão.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| 🟡 Núcleo (porta ExibicaoDeTranscricao) | 🟡 Obrigatória | 🟡 Nenhuma janela abre. |
| 🟡 Adaptador do WhatsApp Web (âncora do balão) | 🟡 Obrigatória | 🟡 Sem âncora, a janela não abre; o texto fica em memória para o próximo clique. |
| 🟡 Tema ativo do WhatsApp Web | 🟡 Opcional | 🟡 Sem detecção, a janela usa o tema claro. |
| 🟡 Área de transferência do sistema operacional | 🟡 Opcional | 🟡 O botão "Copiar" informa a falha; a seleção manual continua disponível. |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: 🟡 Âncora ausente | 🟡 O balão não é encontrado no momento da abertura | 🟡 A janela não abre; o núcleo é informado; o pedido prossegue e o texto fica disponível no próximo clique. |
| EC-02: 🟡 Mensagem removida | 🟡 O núcleo pede o fechamento após a remoção da mensagem | 🟡 A janela fecha sem animação e sem aviso. |
| EC-03: 🟡 Texto longo | 🟡 Transcrição de 10 min de fala | 🟡 A janela para em 240 px de altura e rola internamente. |
| EC-04: 🟡 Redimensionamento | 🟡 O usuário estreita a janela do Chrome com janelas abertas | 🟡 As janelas se reposicionam; sem espaço lateral, passam ao modo sobreposto. |
| EC-05: 🟡 Colisão em cadeia | 🟡 Dez áudios consecutivos de 2 s transcritos | 🟡 As janelas empilham-se para baixo; as que passarem da borda inferior aparecem por inteiro com a rolagem (proposta sujeita à OQ-01). |
| EC-06: 🟡 Falha ao copiar | 🟡 O navegador nega acesso à área de transferência | 🟡 Aviso "Não foi possível copiar; selecione o texto manualmente" por 3 s. |
| EC-07: 🟡 Falha de comunicação com o núcleo | 🟡 Mensagem interna da extensão sem resposta em 5 s (timeout) | 🟡 A janela exibe "Erro interno da extensão; recarregue a página". |
| EC-08: 🟡 Digitação em curso | 🟡 A janela abre enquanto o usuário escreve no campo de mensagem | 🟡 O foco permanece no campo de mensagem; a janela recebe foco só por Tab ou clique. |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 Não se aplica.
- **Autorização:** 🟡 A janela aceita comandos apenas do núcleo da própria extensão.
- **Dados sensíveis:** 🟡 O texto transcrito é conversa de terceiros e existe só enquanto a janela ou a memória da aba existir; nunca vai para o armazenamento. A janela é isolada de modo que os scripts da página não leiam o texto por consulta direta ao documento.
- **Auditoria:** 🟡 Nenhum registro de conteúdo.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 Entregue junto com o núcleo, em modo de desenvolvedor, na máquina do usuário técnico.
- **Como reverter (rollback):** 🟡 Desativar a extensão remove todas as janelas; nada persiste.
- **Monitoramento pós-deploy:** 🟡 Nas duas primeiras semanas, o usuário anota casos de sobreposição, de janela mal posicionada ou de janela que não acompanhou a rolagem, com a largura da janela do Chrome no momento.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | 🟡 ⚠️ ABERTO: Janelas deslocadas por colisão podem passar da borda inferior da área visível. Proposta: aceitar e exibi-las por inteiro com a rolagem. Alternativa: agrupar áudios consecutivos do mesmo remetente numa só janela. | Médio | iago | antes de /reversa-plan |
| OQ-02 | 🟡 ⚠️ ABERTO: As medidas de 320 px, 240 px e 8 px são propostas iniciais, a validar na tela do usuário. | Baixo | iago | na primeira semana de uso |
| OQ-03 | 🟡 ⚠️ ABERTO: Confirmar que arrastar a janela fica fora desta versão. | Baixo | iago | antes de /reversa-plan |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| 🟡 Janela ao lado do balão, no espaço livre | 🟡 Abaixo do balão; painel lateral | 🟡 Não cobre os balões seguintes, que costumam ser os próximos áudios da sequência. |
| 🟡 Colisão resolvida por deslocamento vertical com seta | 🟡 Sobreposição; agrupamento | 🟡 Mantém uma janela por áudio, como pede o brief. |
| 🟡 Sem arrastar | 🟡 Janela arrastável | 🟡 Preserva a ancoragem ao áudio pedida no brief. |
| 🟡 Sem histórico próprio | 🟡 Lista de transcrições | 🟡 O texto vive só na memória da aba, por decisão do usuário. |

---

## Apêndice

### Glossário
- 🟡 **Balão:** elemento visual do WhatsApp que contém uma mensagem.
- 🟡 **Âncora:** posição e visibilidade do balão, fornecidas pelo adaptador do WhatsApp Web.
- 🟡 **Modo sobreposto:** janela exibida sobre a conversa, abaixo do balão, quando não há espaço lateral.

### Referências
- 🟡 `_reversa_sdd/prd.md`, seções 4 e 9.
- 🟡 `_reversa_sdd/sdd/nucleo-transcricao.md`, contrato da porta ExibicaoDeTranscricao.
- 🟡 `_reversa_sdd/sdd/integracao-whatsapp-web.md`, fornecimento da âncora.

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
  Arquivo: /Users/iagoleal/dev/whispper-whatsapp-web/_reversa_sdd/sdd/.janela-flutuante.md.tmp
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

- 🟡 OQ-01 (impacto médio): janelas deslocadas que passam da borda inferior da área visível.
