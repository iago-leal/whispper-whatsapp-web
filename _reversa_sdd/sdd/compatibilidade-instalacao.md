# Spec: Compatibilidade e instalação guiada

**Versão:** 1.0
**Status:** Rascunho
**Autor:** reversa-spec-sdd
**Data:** 2026-09-30
**Reviewers:** iago (pendente)
**Componente:** `compatibilidade-instalacao` · **Etapa:** distribuição (posterior à primeira versão)
**Fonte:** `_reversa_sdd/prd.md`

> Selo 🟡 PLANEJADO em todos os itens.
> Nesta spec, "o sistema" designa o conjunto que leva o usuário da instalação da extensão à primeira transcrição: a página de boas-vindas da extensão, os instaladores do aplicativo auxiliar e a verificação feita pelo próprio aplicativo. As prioridades Must, Should e Could referem-se ao lançamento da etapa de distribuição, e não à primeira versão.

---

## 1. Resumo

🟡 Na etapa de distribuição, o sistema conduz o usuário leigo da instalação da extensão pela loja do Chrome até o primeiro áudio transcrito, sem uso de terminal. Verifica se o computador atende aos requisitos mínimos, instala o aplicativo auxiliar e o modelo com progresso visível e confirma o funcionamento com uma transcrição de teste; quando o computador não é compatível, informa com clareza o motivo antes de qualquer download.

---

## 2. Contexto e Motivação

**Problema:**
🟡 O usuário leigo sabe instalar uma extensão pela loja, não usa terminal e desconhece o Whisper. As soluções locais de transcrição exigem conhecimento técnico que ele não possui, e a extensão, sozinha, não instala programas nem enxerga todo o hardware.

**Evidências:**
🟡 O PRD classifica como risco de impacto alto e probabilidade alta a instalação do motor inacessível ao leigo. A jornada do usuário leigo (passos 1 a 3) exige verificação de compatibilidade e instalação guiada, ou aviso claro de incompatibilidade.

**Por que agora:**
🟡 A implementação vem depois da primeira versão. Especificar agora orienta a porta do motor a acomodar outras plataformas e expõe cedo as decisões de orçamento e de compliance que a distribuição exige.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Num computador compatível, da instalação da extensão à primeira transcrição em ≤ 15 min, incluindo o download do modelo numa conexão de 50 Mbps, sem terminal.
- [ ] 🟡 G-02: 100% dos computadores incompatíveis recebem o aviso antes de qualquer download de instalador ou de modelo.
- [ ] 🟡 G-03: O aviso de incompatibilidade nomeia 100% dos requisitos não atendidos, em linguagem sem jargão técnico.
- [ ] 🟡 G-04: Em teste de usabilidade com 5 pessoas do perfil leigo, ≥ 4 concluem a instalação sem ajuda.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| 🟡 Tempo até a primeira transcrição, computador compatível | 🟡 inviável sem terminal | 🟡 ≤ 15 min | 🟡 lançamento da distribuição |
| 🟡 Incompatíveis avisados antes de qualquer download | 🟡 não se aplica | 🟡 100% | 🟡 lançamento da distribuição |
| 🟡 Participantes leigos que concluem sem ajuda | 🟡 não medida | 🟡 ≥ 4 de 5 | 🟡 antes da listagem pública |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: 🟡 Linux e ChromeOS nesta etapa.
- NG-02: 🟡 Firefox e Safari, fora da primeira versão segundo o PRD.
- NG-03: 🟡 Transcrição em nuvem como alternativa para computadores incompatíveis, adiada no PRD.
- NG-04: 🟡 Atualização automática do aplicativo auxiliar: a extensão só avisa quando a versão é incompatível e conduz a reinstalação.
- NG-05: 🟡 Suporte técnico humano ou canal de atendimento dentro do produto.
- NG-06: 🟡 Coleta remota de dados de instalação: a aferição usa teste de usabilidade, sem telemetria.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 usuário leigo (persona 2 do PRD): profissional autônomo ou de pequeno negócio, em notebook comum, provavelmente com Windows, que atende clientes pelo WhatsApp Web.

**Usuário secundário:** 🟡 usuário técnico (persona 1), que pode trocar a instalação por terminal da primeira versão pela instalação guiada.

**Jornada atual (sem a feature):**
🟡 O leigo não consegue usar o produto: precisaria instalar Python, ffmpeg e o Whisper pelo terminal e registrar o aplicativo auxiliar no Chrome à mão.

**Jornada futura (com a feature):**
🟡 Instala a extensão pela loja; uma página de boas-vindas verifica o computador, oferece o instalador certo, acompanha o download do modelo e termina com uma transcrição de teste e o aviso "Pronto: abra o WhatsApp Web".

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve abrir a página de boas-vindas quando a extensão for instalada. | Must | 🟡 Instalar a extensão pela loja abre a página numa nova aba. |
| RF-02 | 🟡 O sistema deve exibir, antes de qualquer verificação ou download, o aviso de privacidade: o áudio é processado só no computador, nenhum texto é guardado, nenhum dado sai da máquina e apenas contadores anônimos ficam gravados. | Must | 🟡 A etapa de verificação só começa depois que o usuário clica em "Entendi" no aviso. |
| RF-03 | 🟡 O sistema deve fazer a verificação inicial com os dados que a extensão enxerga: sistema operacional, arquitetura do processador e memória total. | Must | 🟡 Um Mac M1 com 8 GB resulta em "compatível na verificação inicial"; um Windows de 32 bits resulta em "incompatível". |
| RF-04 | 🟡 O sistema deve comparar o resultado com a tabela de requisitos mínimos (seção 9) e exibir "compatível" ou "incompatível", citando cada requisito não atendido. | Must | 🟡 Um computador que falha em 2 requisitos exibe os 2, cada um com o valor exigido e o encontrado. |
| RF-05 | 🟡 O sistema deve, em caso de incompatibilidade, explicar o motivo sem jargão, não oferecer download e informar que nada foi instalado além da extensão, com a instrução para removê-la. | Must | 🟡 A página de incompatibilidade não contém link de download e contém a instrução de remoção. |
| RF-06 | 🟡 O sistema deve, em caso de compatibilidade, oferecer o instalador do aplicativo auxiliar correspondente ao sistema operacional e à arquitetura detectados. | Must | 🟡 Num Mac com Apple Silicon, o link aponta para o pacote do macOS; num Windows de 64 bits, para o instalador do Windows. |
| RF-07 | 🟡 O sistema deve instalar o aplicativo auxiliar por instalador padrão do sistema operacional, sem terminal e sem senha de administrador, registrando-o no Chrome para o usuário atual. | Must | 🟡 Numa conta sem privilégio de administrador, a instalação conclui e a verificação do motor responde. |
| RF-08 | 🟡 O sistema deve instalar, em computadores sem Apple Silicon, o adaptador de motor próprio dessas máquinas (OQ-02). | Must | 🟡 Num Windows compatível, a transcrição de teste é concluída. |
| RF-09 | 🟡 O sistema deve detectar, na página de boas-vindas, a conclusão da instalação do aplicativo auxiliar, consultando o motor a cada 3 s, sem que o usuário recarregue a página. | Must | 🟡 Até 3 s após o fim do instalador, a página avança sozinha para a etapa seguinte. |
| RF-10 | 🟡 O sistema deve fazer, pelo aplicativo auxiliar, a verificação completa: memória disponível, espaço livre em disco, modelo do processador e aceleração de hardware disponível. | Must | 🟡 Com espaço livre abaixo do exigido, a página exibe o requisito e a quantidade que falta, em GB. |
| RF-11 | 🟡 O sistema deve baixar o modelo Whisper indicado para o hardware, exibindo o progresso em percentual e o tempo estimado, e conferir a integridade do arquivo antes de usá-lo. | Must | 🟡 Um arquivo alterado de propósito é rejeitado e baixado de novo. |
| RF-12 | 🟡 O sistema deve retomar do ponto em que parou um download de modelo interrompido. | Should | 🟡 Desligar a rede aos 50% e religá-la retoma o download a partir de 50%. |
| RF-13 | 🟡 O sistema deve concluir com uma transcrição de teste de um áudio de exemplo embutido na extensão e exibir "Pronto: abra o WhatsApp Web". | Must | 🟡 A página exibe o texto do áudio de exemplo e a mensagem final. |
| RF-14 | 🟡 O sistema deve permitir desinstalar o aplicativo auxiliar e o modelo pelos meios padrão do sistema operacional, sem deixar arquivos. | Must | 🟡 Após desinstalar, a pasta do aplicativo, a pasta de modelos e o registro no Chrome não existem mais. |
| RF-15 | 🟡 O usuário deve poder repetir a verificação de compatibilidade a qualquer momento pelo painel da extensão. | Should | 🟡 O painel tem o botão "Verificar compatibilidade", que reabre a página de boas-vindas na etapa de verificação. |
| RF-16 | 🟡 O sistema deve retomar a instalação guiada da etapa pendente quando o usuário fechar a página antes de concluir. | Should | 🟡 Fechar a página durante o download do modelo e reabri-la pelo painel volta à etapa de download. |

### 6.2 Fluxo Principal (Happy Path)

1. 🟡 O usuário instala a extensão pela loja do Chrome.
2. 🟡 O sistema abre a página de boas-vindas e exibe o aviso de privacidade; o usuário clica em "Entendi".
3. 🟡 O sistema faz a verificação inicial e informa "compatível".
4. 🟡 O usuário baixa e executa o instalador indicado.
5. 🟡 O sistema detecta o aplicativo auxiliar, faz a verificação completa e baixa o modelo, com progresso.
6. 🟡 O sistema faz a transcrição de teste e exibe "Pronto: abra o WhatsApp Web".
7. 🟡 Resultado: o usuário transcreve o primeiro áudio sem ter usado o terminal.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A, incompatível na verificação inicial:**
1. 🟡 A verificação inicial encontra um requisito não atendido.
2. 🟡 O sistema exibe os requisitos não atendidos e a instrução de remoção da extensão, sem oferecer download.

**Fluxo Alternativo B, incompatível na verificação completa:**
1. 🟡 O aplicativo auxiliar detecta espaço livre insuficiente.
2. 🟡 O sistema informa quanto falta liberar; o usuário libera espaço e repete a verificação pelo botão da página.

**Fluxo Alternativo C, download interrompido:**
1. 🟡 A conexão cai durante o download do modelo.
2. 🟡 O sistema retoma sozinho até 3 vezes; esgotadas as tentativas, exibe o botão "Tentar de novo".

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | 🟡 Linguagem | 🟡 0 termos técnicos sem explicação na página | 🟡 "Whisper", "modelo" e "aplicativo auxiliar" aparecem sempre com explicação; validado no teste com 5 pessoas leigas. |
| RNF-02 | 🟡 Tempo total | 🟡 ≤ 15 min até a primeira transcrição, com conexão de 50 Mbps | 🟡 Medido do clique em instalar na loja até a mensagem final. |
| RNF-03 | 🟡 Confiança do sistema operacional | 🟡 0 alertas de desenvolvedor não identificado | 🟡 Instalador do macOS assinado e notarizado pela Apple; instalador do Windows com assinatura de código. |
| RNF-04 | 🟡 Acessibilidade | 🟡 WCAG 2.1 AA na página de boas-vindas | 🟡 Operação completa por teclado. |
| RNF-05 | 🟡 Privacidade | 🟡 0 envios de dados do computador a servidores | 🟡 Os únicos acessos à rede são o download do instalador e o do modelo. |

---

## 8. Design e Interface

**Componentes afetados:** 🟡 página de boas-vindas da extensão (nova), painel da extensão (botão "Verificar compatibilidade"), instaladores do aplicativo auxiliar (novos).

**Comportamento esperado:**
🟡 A página de boas-vindas avança em seis etapas numeradas, com a etapa atual destacada: privacidade, verificação, instalação do aplicativo, download do modelo, teste e pronto. Cada etapa exibe uma única ação principal.

**Estados da UI:**
- Estado vazio: 🟡 antes do aviso de privacidade, nenhuma verificação é feita e nenhum dado é exibido.
- Estado de carregamento: 🟡 "Verificando seu computador…", "Aguardando a instalação do aplicativo…" e "Baixando o modelo: 42% (cerca de 3 min)".
- Estado de erro: 🟡 incompatibilidade com os requisitos não atendidos, ou falha de download com o botão "Tentar de novo".
- Estado de sucesso: 🟡 texto da transcrição de teste e "Pronto: abra o WhatsApp Web".

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
RequisitosMinimos {              // tabela versionada, embutida na extensão; valores em aberto (OQ-01)
  plataforma: macOS | Windows
  processador: Apple Silicon | x86-64
  memoriaTotalGB: número
  discoLivreGB: número
  adaptador: mlx-whisper | adaptador para máquinas sem Apple Silicon (OQ-02)
}

ResultadoDaVerificacao {         // memória da página de boas-vindas; não é gravado
  etapa: inicial | completa
  compativel: booleano
  requisitosNaoAtendidos: lista de { requisito, exigido, encontrado }
}

ProgressoDaInstalacao {          // armazenamento local da extensão, para retomar a etapa pendente
  etapaAtual: privacidade | verificacao | aplicativo | modelo | teste | pronto
}
```

**Proposta inicial dos requisitos mínimos, a validar (OQ-01):**

| Plataforma | Processador | Memória total | Disco livre | Adaptador |
|------------|-------------|---------------|-------------|-----------|
| 🟡 macOS 14 ou posterior | 🟡 Apple Silicon | 🟡 8 GB | 🟡 4 GB | 🟡 mlx-whisper |
| 🟡 Windows 10 ou 11, 64 bits | 🟡 x86-64 | 🟡 8 GB | 🟡 4 GB | 🟡 em aberto (OQ-02) |

**Migrações necessárias:** 🟡 Não; primeira versão desta etapa.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| 🟡 Chrome Web Store | 🟡 Obrigatória | 🟡 Sem publicação, só a instalação manual em modo de desenvolvedor, inviável para o leigo. |
| 🟡 Hospedagem dos instaladores (local em aberto, OQ-03) | 🟡 Obrigatória | 🟡 A página informa a falha de download e oferece nova tentativa. |
| 🟡 Fonte dos pesos do modelo (pendência 11 do PRD, OQ-05) | 🟡 Obrigatória | 🟡 A página informa a falha de download e oferece nova tentativa. |
| 🟡 Programa de desenvolvedor da Apple, para assinar e notarizar o instalador do macOS | 🟡 Obrigatória no macOS | 🟡 O macOS bloqueia o instalador com alerta de segurança que o leigo não saberá contornar. |
| 🟡 Certificado de assinatura de código para Windows | 🟡 Obrigatória no Windows | 🟡 O Windows exibe alerta de aplicativo não reconhecido. |
| 🟡 Adaptador de motor para máquinas sem Apple Silicon | 🟡 Obrigatória no Windows | 🟡 Sem ele, todo Windows é tratado como incompatível. |
| 🟡 Aplicativo auxiliar e protocolo (spec `motor-transcricao-local`) | 🟡 Obrigatória | 🟡 Sem ele, não há verificação completa nem transcrição de teste. |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: 🟡 Página fechada no meio | 🟡 O usuário fecha a página antes de concluir | 🟡 Ao reabrir pelo painel, a página retoma da etapa pendente. |
| EC-02: 🟡 Falha de rede no download | 🟡 Conexão perdida ou sem resposta por 30 s (timeout) | 🟡 Até 3 retomadas automáticas com intervalo de 10 s; depois, "Não foi possível baixar; verifique a conexão" e o botão "Tentar de novo". |
| EC-03: 🟡 Arquivo corrompido | 🟡 A conferência de integridade falha | 🟡 O arquivo é apagado e baixado de novo; após 2 falhas seguidas, mensagem com o botão "Tentar de novo". |
| EC-04: 🟡 Disco cheio durante o download | 🟡 Espaço esgotado | 🟡 O download para, o arquivo parcial é apagado, e a página informa quanto espaço falta. |
| EC-05: 🟡 Instalador bloqueado | 🟡 Antivírus ou política do sistema impede a execução | 🟡 A página exibe instrução específica do sistema operacional detectado e o botão "Já instalei, verificar de novo". |
| EC-06: 🟡 Aplicativo já instalado | 🟡 Reinstalação da extensão com o aplicativo presente | 🟡 A página pula as etapas de instalação e de download e vai direto ao teste. |
| EC-07: 🟡 Memória livre no limite | 🟡 A verificação completa encontra memória livre abaixo do exigido pelo modelo padrão | 🟡 Compatível com ressalva: a página oferece um modelo menor e avisa que a qualidade da transcrição será menor. |
| EC-08: 🟡 Aplicativo desatualizado | 🟡 VERSAO_INCOMPATIVEL após atualização da extensão | 🟡 O painel e as janelas indicam a reinstalação, e a página abre na etapa de instalação do aplicativo. |
| EC-09: 🟡 Transcrição de teste falha | 🟡 O motor devolve erro no áudio de exemplo | 🟡 A página exibe o código e o motivo e oferece repetir o teste ou reinstalar o aplicativo. |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 Não se aplica: nenhuma conta é criada.
- **Autorização:** 🟡 A instalação é feita para o usuário atual, sem privilégio de administrador; o aplicativo auxiliar aceita conexão apenas da extensão publicada, identificada pelo seu identificador na loja.
- **Dados sensíveis:** 🟡 Os dados do hardware são usados só localmente e não são gravados. Na distribuição, o usuário leigo transcreve áudios de clientes em atividade econômica, caso em que a LGPD se aplica, já que o art. 4º, I, só a afasta no uso particular e não econômico. O tratamento é todo local e o desenvolvedor não acessa os dados; o aviso de privacidade da página informa isso (OQ-04).
- **Auditoria:** 🟡 Nenhuma coleta; a aferição das metas desta spec usa teste de usabilidade presencial ou por chamada.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 Depois de a primeira versão atingir as metas no uso do usuário técnico, publicar a extensão na Chrome Web Store como item não listado, acessível por link, para um grupo de 5 a 10 pessoas leigas; atingida a meta de conclusão sem ajuda, listagem pública.
- **Como reverter (rollback):** 🟡 Retirar a versão da loja ou republicar a anterior; cada usuário pode desinstalar o aplicativo e o modelo pelos meios padrão do sistema operacional.
- **Monitoramento pós-deploy:** 🟡 Sem telemetria: relatos do grupo de teste por canal combinado previamente, registrados por etapa da instalação em que ocorreram.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | 🟡 ⚠️ ABERTO: Valores dos requisitos mínimos (memória, disco, versões de sistema), que dependem do modelo escolhido e de medições. | Alto | iago | antes do início da etapa de distribuição |
| OQ-02 | 🟡 ⚠️ ABERTO: Adaptador de motor para Windows: whisper.cpp ou faster-whisper. | Alto | iago | antes do início da etapa de distribuição |
| OQ-03 | 🟡 ⚠️ ABERTO: Orçamento para a assinatura dos instaladores (Programa de desenvolvedor da Apple, anual; certificado de assinatura para Windows) e para hospedar instaladores e modelos. | Alto | iago | antes do início da etapa de distribuição |
| OQ-04 | 🟡 ⚠️ ABERTO: Exigências de compliance da distribuição: texto do aviso de privacidade, política de privacidade e declaração de uso de dados na loja. | Médio | iago | antes da publicação |
| OQ-05 | 🟡 ⚠️ ABERTO: Origem dos pesos do modelo e forma de conferir sua integridade. | Médio | iago | antes do início da etapa de distribuição |
| OQ-06 | 🟡 ⚠️ ABERTO: A verificação de compatibilidade entra também na primeira etapa? Proposta: não, porque o usuário técnico já roda o mlx-whisper. | Baixo | iago | antes de /reversa-plan |
| OQ-07 | 🟡 ⚠️ ABERTO: As metas de 15 min e de 4 em 5 participantes são propostas, a validar. | Baixo | iago | antes do teste de usabilidade |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| 🟡 Verificação em duas fases: pela extensão, depois pelo aplicativo | 🟡 Só pela extensão; só pelo aplicativo | 🟡 A extensão enxerga só parte do hardware; o aplicativo enxerga tudo, e o leigo precisa de um primeiro veredito antes de instalar qualquer programa. |
| 🟡 Aviso de incompatibilidade antes de qualquer download | 🟡 Baixar e testar | 🟡 Evita instalar programas que não vão funcionar. |
| 🟡 Instalação para o usuário atual, sem administrador | 🟡 Instalação para todo o computador | 🟡 Computadores de trabalho do perfil leigo nem sempre dão acesso de administrador. |
| 🟡 Transcrição de teste ao final | 🟡 Encerrar após o download | 🟡 Confirma o funcionamento antes do primeiro uso real. |
| 🟡 Aferição por teste de usabilidade | 🟡 Telemetria remota | 🟡 Coerente com o princípio de que nenhum dado sai da máquina. |

---

## Apêndice

### Glossário
- 🟡 **Página de boas-vindas:** página da própria extensão, aberta na instalação, que conduz as etapas.
- 🟡 **Verificação inicial:** feita pela extensão, com os dados de hardware que o Chrome lhe permite ver.
- 🟡 **Verificação completa:** feita pelo aplicativo auxiliar, que enxerga todo o computador.
- 🟡 **Notarização:** verificação automática da Apple que autoriza um instalador a abrir sem alerta no macOS.

### Referências
- 🟡 `_reversa_sdd/prd.md`, seções 4, 6, 7 e 8.
- 🟡 `_reversa_sdd/personas.md`, jornada do usuário leigo.
- 🟡 `_reversa_sdd/sdd/motor-transcricao-local.md`, aplicativo auxiliar e protocolo.

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
  Arquivo: /Users/iagoleal/dev/whispper-whatsapp-web/_reversa_sdd/sdd/.compatibilidade-instalacao.md.tmp
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

- 🟡 OQ-01, OQ-02 e OQ-03 (impacto alto): requisitos mínimos, adaptador para Windows e orçamento de assinatura e hospedagem.
- 🟡 OQ-04 e OQ-05 (impacto médio): compliance da distribuição; origem e integridade dos pesos do modelo.
