# Spec: Núcleo de transcrição

**Versão:** 1.0
**Status:** Rascunho
**Autor:** reversa-spec-sdd
**Data:** 2026-09-30
**Reviewers:** iago (pendente)
**Componente:** `nucleo-transcricao` · **Etapa:** primeira (uso pessoal)
**Fonte:** `_reversa_sdd/prd.md`

> Selo 🟡 PLANEJADO em todos os itens.
> Nesta spec, "o sistema" designa o núcleo de transcrição, a parte da extensão que roda na aba do WhatsApp Web e não conhece a página, o navegador nem o Whisper.

---

## 1. Resumo

🟡 O núcleo é o domínio da extensão. Recebe o pedido de transcrição feito pelo clique no ícone de um áudio, organiza os pedidos numa fila atendida um por vez, na ordem dos cliques, acompanha o estado de cada pedido, entrega o resultado à janela flutuante e mantém os contadores locais que aferem as metas do produto. Fala com a página, com o motor e com a janela exclusivamente por portas, implementadas pelos adaptadores descritos nas specs irmãs.

---

## 2. Contexto e Motivação

**Problema:**
🟡 Hoje, transcrever um áudio exige cerca de cinco passos manuais: baixar o áudio, rodar o mlx-whisper no terminal e ler o resultado fora do WhatsApp. O produto reduz isso a um clique, e alguma parte precisa coordenar o caminho entre o clique e o texto: obter o áudio, acionar o motor, tratar falhas e ordenar os pedidos feitos em sequência sobre áudios fragmentados.

**Evidências:**
🟡 O PRD aponta como risco de probabilidade alta que cliques sucessivos em áudios fragmentados disparem transcrições simultâneas, que disputam o hardware e somam latência. As metas de adoção (≥ 90%) e de qualidade (≥ 95%) não tinham forma de coleta; o usuário escolheu um contador local.

**Por que agora:**
🟡 A arquitetura de portas e adaptadores é diretriz do usuário, e o núcleo declara as portas das quais dependem as outras quatro specs. Precisa, por isso, ser especificado antes delas.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Um clique no ícone basta para que o texto chegue à janela, sem passo manual adicional.
- [ ] 🟡 G-02: Pedidos feitos em sequência são atendidos um por vez, na ordem dos cliques, sem perda nem duplicação.
- [ ] 🟡 G-03: Reabrir a janela de um áudio já transcrito na mesma sessão da aba exibe o texto em ≤ 200 ms, sem nova transcrição.
- [ ] 🟡 G-04: As metas de adoção e de qualidade são aferíveis pelos contadores locais, sem que nenhum dado saia da máquina.
- [ ] 🟡 G-05: Nenhuma API do Chrome nem estrutura da página do WhatsApp é referenciada dentro do núcleo.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| 🟡 Passos manuais por transcrição | 🟡 cerca de 5 | 🟡 1 clique | 🟡 3 meses |
| 🟡 Adoção: lidos ÷ (lidos + ouvidos), só áudios recebidos | 🟡 não medida | 🟡 ≥ 90% | 🟡 3 meses |
| 🟡 Qualidade: (lidos − lidos e tocados) ÷ lidos | 🟡 não medida | 🟡 ≥ 95% | 🟡 3 meses |
| 🟡 Reexibição de texto guardado em memória | 🟡 não se aplica | 🟡 ≤ 200 ms | 🟡 primeira versão |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: 🟡 Transcrição automática, ao chegar ou em lote: o núcleo só cria pedidos a partir de um clique (não-objetivo do PRD).
- NG-02: 🟡 Guardar texto de transcrição em disco ou entre sessões: o texto vive só na memória da aba (decisão do usuário).
- NG-03: 🟡 Transcrições paralelas: um pedido por vez nesta versão.
- NG-04: 🟡 Enviar contadores, textos ou áudios para fora da máquina, inclusive telemetria.
- NG-05: 🟡 Resumo, tradução ou sugestão de resposta, adiados no PRD.
- NG-06: 🟡 Ordenar a fila por critério diferente da ordem dos cliques, como a ordem dos áudios na conversa.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 usuário técnico (persona 1 do PRD), no Mac com Apple Silicon e no Chrome, que recebe sequências de áudios fragmentados durante o trabalho e consulta os contadores para acompanhar as metas.

**Usuário secundário:** 🟡 usuário leigo (persona 2), na etapa de distribuição; para ele o núcleo é invisível, e a consulta aos contadores é facultativa.

**Jornada atual (sem a feature):**
🟡 Baixa o áudio, roda o mlx-whisper no terminal, lê o texto fora do WhatsApp e volta à conversa para responder, repetindo tudo a cada áudio da sequência.

**Jornada futura (com a feature):**
🟡 Clica no ícone de cada áudio da sequência, na ordem em que quer ler; vê cada janela passar de "na fila" a "transcrevendo" e ao texto; lê as transcrições em ordem e responde por texto.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve criar um pedido de transcrição quando o usuário clicar no ícone de um áudio sem pedido ativo e sem texto em memória, e nunca sem esse clique. | Must | 🟡 Um clique cria exatamente 1 pedido no estado "na fila"; abrir uma conversa com 10 áudios sem clicar cria 0 pedidos. |
| RF-02 | 🟡 O sistema deve atender os pedidos um por vez, na ordem dos cliques. | Must | 🟡 Com cliques em A, B e C, o motor recebe A, B e C nessa ordem e nunca 2 pedidos ao mesmo tempo. |
| RF-03 | 🟡 O sistema deve manter cada pedido num destes estados: "na fila", "transcrevendo", "concluído" ou "erro", e notificar a janela a cada mudança. | Must | 🟡 Transições aceitas: na fila → transcrevendo; transcrevendo → concluído; transcrevendo → erro; erro → na fila; na fila → removido. Cada transição gera exatamente 1 notificação; qualquer outra é rejeitada em teste unitário. |
| RF-04 | 🟡 O sistema deve informar à janela, para cada pedido na fila, quantos pedidos estão à frente dele. | Should | 🟡 Com A transcrevendo e B e C na fila, B recebe "1 à frente" e C, "2 à frente"; ao concluir A, B passa a transcrevendo e C recebe "1 à frente". |
| RF-05 | 🟡 O sistema deve obter o áudio pela porta FonteDeAudio só quando o pedido passar a "transcrevendo", e liberar o áudio da memória ao fim do pedido, com sucesso ou erro. | Must | 🟡 Captura de memória da aba após 5 pedidos concluídos não contém nenhum dos buffers de áudio. |
| RF-06 | 🟡 O sistema deve guardar na memória da aba o texto de cada pedido concluído, indexado pelo identificador do áudio, até a aba ser recarregada ou fechada. | Must | 🟡 Após concluir A, novo clique em A não chama o motor; após recarregar a aba, novo clique em A gera nova transcrição. |
| RF-07 | 🟡 O sistema deve, quando o usuário clicar no ícone de um áudio já transcrito cuja janela esteja fechada, reabrir a janela com o texto guardado, sem criar pedido. | Must | 🟡 O motor recebe 0 chamadas e a janela exibe o texto em ≤ 200 ms. |
| RF-08 | 🟡 O sistema deve, quando o usuário clicar no ícone de um áudio cuja janela já está aberta, pedir à janela que se destaque, sem abrir outra nem criar pedido. | Must | 🟡 Após 5 cliques no mesmo ícone em 1 s, existe 1 janela e 1 pedido. |
| RF-09 | 🟡 O sistema deve permitir que o usuário repita um pedido em erro, recolocando-o no fim da fila. | Must | 🟡 Após erro em B, a ação "Tentar de novo" ou novo clique no ícone leva B a "na fila", na última posição. |
| RF-10 | 🟡 O sistema deve, quando o usuário fechar a janela de um pedido "na fila", remover o pedido; se o pedido já estiver "transcrevendo", a transcrição prossegue e o texto é guardado em memória sem reabrir a janela. | Must | 🟡 Fechar a janela de um pedido na fila: o motor nunca recebe esse áudio. Fechar durante a transcrição: novo clique após a conclusão exibe o texto sem nova chamada ao motor. |
| RF-11 | 🟡 O sistema deve encerrar com o erro TEMPO_ESGOTADO o pedido cuja transcrição exceder o prazo máximo do RNF-02 e seguir para o próximo da fila, descartando qualquer resposta tardia. | Must | 🟡 Com motor simulado que nunca responde, o pedido vira erro no prazo, o seguinte começa e uma resposta tardia não altera o estado. |
| RF-12 | 🟡 O sistema deve classificar cada áudio recebido, uma vez por sessão da aba, pela primeira ocorrência: "lido", se a transcrição foi concluída antes de qualquer reprodução; "ouvido", se a reprodução começou antes da conclusão. | Must | 🟡 Transcrever A e depois tocá-lo soma 1 em lidos; tocar B e depois transcrevê-lo soma 1 em ouvidos; repetir as ações não altera os contadores. |
| RF-13 | 🟡 O sistema deve registrar como "lido e tocado" o áudio classificado como lido que o usuário tocar depois da transcrição, uma vez por sessão da aba. | Must | 🟡 Tocar A três vezes após a transcrição soma 1 em lidos e tocados. |
| RF-14 | 🟡 O sistema deve guardar os contadores (lidos, ouvidos, lidos e tocados) e a data de início da contagem no armazenamento local da extensão, sem identificar áudios, pessoas nem conversas. | Must | 🟡 Após reiniciar o Chrome, os valores persistem; o armazenamento contém só 3 inteiros e 1 data. |
| RF-15 | 🟡 O sistema deve exibir no painel da extensão os três contadores, a adoção e a qualidade em percentual inteiro, a data de início, o estado do motor e o estado da integração com o WhatsApp Web. | Must | 🟡 Com lidos = 18, ouvidos = 2 e lidos e tocados = 1, o painel mostra adoção 90% e qualidade 94%. |
| RF-16 | 🟡 O usuário deve poder zerar os contadores pelo painel, após confirmação, o que redefine a data de início para o momento do zeramento. | Should | 🟡 Após confirmar, os três valores são 0 e a data é a atual; ao cancelar, nada muda. |
| RF-17 | 🟡 O sistema deve desconsiderar nos contadores os áudios enviados pelo próprio usuário. | Must | 🟡 Transcrever ou tocar um áudio próprio não altera nenhum contador. |
| RF-18 | 🟡 O sistema deve consultar o estado do motor quando a aba do WhatsApp Web carregar e mantê-lo disponível ao painel e às janelas: "pronto", "iniciando" ou "indisponível", com o motivo. | Should | 🟡 Com o aplicativo auxiliar desinstalado, o painel mostra "indisponível" sem nenhum clique prévio em ícone. |
| RF-19 | 🟡 O sistema deve, quando o motor responder "indisponível", encerrar com MOTOR_INDISPONIVEL o pedido em curso e todos os pedidos na fila, sem aguardar o prazo máximo. | Must | 🟡 Com 3 pedidos e o motor desligado, os 3 passam a erro em ≤ 1 s após a resposta do motor. |

### 6.2 Fluxo Principal (Happy Path)

1. 🟡 O usuário clica no ícone de transcrição do áudio recebido A.
2. 🟡 O sistema cria o pedido de A no estado "na fila" e pede à janela que abra ancorada a A.
3. 🟡 Sendo o único pedido, o sistema o passa a "transcrevendo" e obtém o áudio pela porta FonteDeAudio.
4. 🟡 O sistema envia o áudio ao motor pela porta MotorDeTranscricao.
5. 🟡 O motor devolve o texto e o idioma detectado; o sistema passa o pedido a "concluído", guarda o texto em memória e notifica a janela.
6. 🟡 O sistema classifica A como "lido", incrementa o contador, libera o áudio da memória e inicia o próximo pedido da fila, se houver.
7. 🟡 Resultado: o texto de A aparece na janela ancorada a A, com um único clique do usuário.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A, sequência fragmentada:**
1. 🟡 O usuário clica nos ícones de A, B e C em menos de 2 s.
2. 🟡 O sistema cria 3 pedidos; A passa a "transcrevendo"; B e C ficam "na fila", com 1 e 2 pedidos à frente.
3. 🟡 Cada conclusão inicia o pedido seguinte, e as janelas mudam de estado na ordem A, B, C.

**Fluxo Alternativo B, reabertura:**
1. 🟡 O usuário fecha a janela de A, já concluída, e clica de novo no ícone de A.
2. 🟡 O sistema reabre a janela com o texto guardado, sem chamar o motor.

**Fluxo Alternativo C, erro e nova tentativa:**
1. 🟡 O motor devolve erro para B; o sistema passa B a "erro", com o código recebido, e inicia C.
2. 🟡 O usuário aciona "Tentar de novo" na janela de B; o sistema recoloca B no fim da fila.

**Fluxo Alternativo D, áudio ouvido:**
1. 🟡 O usuário toca o áudio recebido D pelo player do WhatsApp, sem transcrevê-lo.
2. 🟡 O sistema classifica D como "ouvido" e incrementa o contador correspondente.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | 🟡 Latência do produto | 🟡 ≤ 10 s por minuto de áudio, do clique ao texto, com o modelo já carregado | 🟡 Meta do PRD. Hardware de referência: o Mac com Apple Silicon do usuário técnico. Piso para áudios curtos em aberto (OQ-01). |
| RNF-02 | 🟡 Prazo máximo por pedido | 🟡 o maior entre 60 s e 30 s por minuto de áudio | 🟡 Três vezes a meta de latência, com piso para absorver o carregamento do modelo. Valor ajustável (OQ-04). |
| RNF-03 | 🟡 Sobrecarga própria do núcleo | 🟡 ≤ 100 ms por pedido | 🟡 Exclui a obtenção do áudio e o tempo do motor; medida por marcação de tempo nas transições. |
| RNF-04 | 🟡 Isolamento | 🟡 0 referências a APIs do Chrome ou à estrutura da página dentro do núcleo | 🟡 Verificável por regra de dependências no lint; os testes do núcleo rodam sem navegador, com portas simuladas. |
| RNF-05 | 🟡 Privacidade | 🟡 0 textos ou áudios persistidos; 0 requisições de rede originadas pelo núcleo | 🟡 Verificável por inspeção do armazenamento da extensão e do tráfego da aba. |
| RNF-06 | 🟡 Cobertura de testes | 🟡 100% das transições de estado cobertas por testes unitários | 🟡 Portas simuladas para página, motor, janela e armazenamento. |

---

## 8. Design e Interface

**Componentes afetados:** 🟡 núcleo (domínio), painel da extensão (janela aberta pelo ícone da extensão na barra do Chrome) e as portas consumidas pelos adaptadores.

**Comportamento esperado:**
🟡 O núcleo não desenha a janela de transcrição (spec `janela-flutuante`) nem o ícone no áudio (spec `integracao-whatsapp-web`): decide o que mostrar e quando. O painel da extensão, único elemento visual desta spec, exibe:

- 🟡 o estado do motor, com a instrução de instalação quando "indisponível";
- 🟡 o estado da integração com o WhatsApp Web: "ativa" ou "degradada", com o nome da estrutura ausente;
- 🟡 os três contadores, a adoção e a qualidade, com a data de início da contagem;
- 🟡 o botão "Zerar contadores", com confirmação no próprio painel.

**Estados da UI (painel):**
- Estado vazio: 🟡 "Sem dados ainda" no lugar de cada percentual cujo denominador for zero.
- Estado de carregamento: 🟡 "Verificando o motor…" enquanto a consulta do RF-18 não responde.
- Estado de erro: 🟡 "Motor indisponível", com o motivo e a instrução de instalação; "Contadores indisponíveis" quando o armazenamento falhar.
- Estado de sucesso: 🟡 motor "pronto", integração "ativa" e percentuais calculados.

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
PedidoTranscricao {              // memória da aba; some ao recarregar ou fechar a aba
  idAudio: texto opaco           // fornecido pelo adaptador do WhatsApp Web, estável na sessão da aba
  direcao: recebido | enviado
  estado: na_fila | transcrevendo | concluido | erro
  criadoEm: instante
  texto: texto | nulo            // preenchido em "concluido"; vazio quando não houver fala
  idioma: código ISO 639-1 | nulo
  erro: MOTOR_INDISPONIVEL | AUDIO_INDISPONIVEL | TEMPO_ESGOTADO | FALHA_NA_TRANSCRICAO | VERSAO_INCOMPATIVEL | nulo
  motivoErro: texto | nulo       // detalhe legível vindo do adaptador
}

ClassificacaoNaSessao {          // memória da aba
  idAudio: texto opaco
  classe: lido | ouvido
  tocadoAposLeitura: booleano
}

Contadores {                     // armazenamento local da extensão; único dado persistido
  lidos: inteiro ≥ 0
  ouvidos: inteiro ≥ 0
  lidosETocados: inteiro ≥ 0
  inicioContagem: data e hora
}
```

**Migrações necessárias:** 🟡 Não; primeira versão.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| 🟡 Porta FonteDeAudio (adaptador do WhatsApp Web) | 🟡 Obrigatória | 🟡 Nenhum pedido é criado; o painel mostra a integração "degradada". |
| 🟡 Porta MotorDeTranscricao (aplicativo auxiliar) | 🟡 Obrigatória | 🟡 Pedidos terminam em MOTOR_INDISPONIVEL; janela e painel mostram a instrução de instalação. |
| 🟡 Porta ExibicaoDeTranscricao (janela flutuante) | 🟡 Obrigatória | 🟡 O texto fica em memória e é exibido no próximo clique bem-sucedido. |
| 🟡 Porta Navegador (armazenamento e mensagens do Chrome) | 🟡 Obrigatória para contadores | 🟡 A transcrição segue funcionando; o painel mostra "Contadores indisponíveis". |

**Contratos das portas declaradas pelo núcleo:**

- 🟡 **FonteDeAudio**, implementada por `integracao-whatsapp-web`: emite `pedidoDeTranscricao(idAudio, direcao)` ao clique no ícone, `reproducaoIniciada(idAudio, direcao)` e `mensagemRemovida(idAudio)`; responde a `obterAudio(idAudio)` com bytes, tipo de mídia e duração em segundos, ou com AUDIO_INDISPONIVEL e motivo; informa `estadoIntegracao()` como ativa ou degradada.
- 🟡 **MotorDeTranscricao**, implementada por `motor-transcricao-local`: responde a `verificar()` com pronto, iniciando ou indisponível; responde a `transcrever(audio, tipoDeMidia)` com texto e idioma, ou com um código de erro e motivo.
- 🟡 **ExibicaoDeTranscricao**, implementada por `janela-flutuante`: recebe `abrir(idAudio)`, `atualizar(idAudio, estado, dados)`, `destacar(idAudio)` e `fechar(idAudio)`; emite `janelaFechada(idAudio)` e `tentarDeNovo(idAudio)`.
- 🟡 **Navegador**, implementada pelo adaptador do Chrome: lê e grava os contadores; transporta mensagens entre a aba e o processo de segundo plano da extensão. Nenhuma outra parte da extensão chama APIs do Chrome diretamente.

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: 🟡 Motor indisponível | 🟡 Aplicativo auxiliar não instalado, parado ou sem resposta à verificação | 🟡 Pedido em curso e fila terminam em MOTOR_INDISPONIVEL; janela exibe a instrução de instalação; nenhum pedido é descartado sem aviso. |
| EC-02: 🟡 Áudio indisponível | 🟡 O adaptador não obtém o áudio (mídia expirada no servidor, falha de download) | 🟡 Pedido termina em AUDIO_INDISPONIVEL com o motivo recebido; a fila segue. |
| EC-03: 🟡 Tempo esgotado | 🟡 O motor não responde no prazo do RNF-02 | 🟡 Pedido termina em TEMPO_ESGOTADO; o próximo começa; a resposta tardia é descartada. |
| EC-04: 🟡 Áudio sem fala | 🟡 O motor devolve texto vazio | 🟡 Pedido "concluído" com texto vazio; a janela exibe "Nenhuma fala reconhecida"; conta como lido. |
| EC-05: 🟡 Mensagem apagada para todos | 🟡 O adaptador emite mensagemRemovida para um áudio com pedido ou texto | 🟡 Proposta sujeita à OQ-02: fechar a janela, remover o pedido da fila e descartar o texto da memória. |
| EC-06: 🟡 Recarga da aba durante a transcrição | 🟡 O usuário recarrega ou fecha a aba | 🟡 Pedidos e textos se perdem; a resposta do motor sem destinatário é descartada; contadores já gravados permanecem. |
| EC-07: 🟡 Cliques repetidos | 🟡 Vários cliques no mesmo ícone em sequência | 🟡 Um único pedido; os cliques seguintes apenas destacam a janela. |
| EC-08: 🟡 Falha do armazenamento local | 🟡 Erro ao gravar os contadores | 🟡 A transcrição segue; o painel mostra "Contadores indisponíveis"; nova tentativa na alteração seguinte. |
| EC-09: 🟡 Versão incompatível | 🟡 O motor informa versão de protocolo diferente | 🟡 Pedido termina em VERSAO_INCOMPATIVEL, com a instrução de atualizar o aplicativo auxiliar. |
| EC-10: 🟡 Segunda aba do WhatsApp Web | 🟡 O usuário abre o WhatsApp Web em outra aba | 🟡 Cada aba mantém memória própria; incrementos de contadores feitos pelas duas abas não se perdem, porque cada gravação soma sobre o valor atual do armazenamento. |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 Não se aplica: o núcleo opera dentro da sessão do WhatsApp Web já aberta pelo usuário.
- **Autorização:** 🟡 O núcleo só cria pedidos a partir de eventos do adaptador do WhatsApp Web originados de clique; não expõe interface a páginas nem a outras extensões.
- **Dados sensíveis:** 🟡 Áudios e textos de conversas com terceiros são dados pessoais (LGPD). O núcleo os mantém só na memória da aba, sem persistência e sem rede; os contadores gravados são anônimos e não identificam áudios, pessoas nem conversas.
- **Auditoria:** 🟡 Sem registro de conteúdo. Diagnósticos, se houver, contêm apenas códigos de erro e tempos, nunca texto, identificador de áudio ou de conversa.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 Uso pessoal: extensão carregada sem empacotamento, pelo modo de desenvolvedor do Chrome, na máquina do usuário técnico. A publicação na loja pertence à spec `compatibilidade-instalacao`.
- **Como reverter (rollback):** 🟡 Desativar ou remover a extensão em chrome://extensions; o único dado persistido, os contadores, é apagado junto com a extensão.
- **Monitoramento pós-deploy:** 🟡 Nas duas primeiras semanas, o usuário confere os contadores no painel ao fim de cada dia e anota os erros exibidos nas janelas, com o código.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | 🟡 ⚠️ ABERTO: Piso de latência para áudios curtos: a meta de 10 s por minuto daria 1 s para um áudio de 6 s. Proposta: tempo ≤ o maior entre 3 s e 10 s por minuto de áudio. | Alto | iago | antes de /reversa-plan |
| OQ-02 | 🟡 ⚠️ ABERTO: Quando o remetente apaga para todos um áudio já transcrito, fechar a janela e descartar o texto (proposta) ou mantê-lo até o usuário fechar a janela? | Médio | iago | antes de /reversa-plan |
| OQ-03 | 🟡 ⚠️ ABERTO: Os contadores evitam dupla contagem só dentro da sessão da aba; após recarregar, o mesmo áudio pode ser contado de novo. A distorção é aceitável? | Baixo | iago | antes de /reversa-coding |
| OQ-04 | 🟡 ⚠️ ABERTO: Valor do prazo máximo por pedido (RNF-02), a calibrar com as medições da prova de conceito do motor. | Baixo | iago | após a prova de conceito |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| 🟡 Texto só na memória da aba | 🟡 Gravar em disco; nada guardar | 🟡 Escolha do usuário: reaproveita o texto na sessão sem guardar conversas de terceiros. |
| 🟡 Um pedido por vez, na ordem dos cliques | 🟡 Paralelismo; ordem dos áudios na conversa | 🟡 Risco do PRD de disputa de hardware; o usuário controla a ordem de leitura pelos cliques. |
| 🟡 Métricas por contador local, classificando cada áudio pela primeira ocorrência | 🟡 Percepção do usuário; decidir depois; contar áudios exibidos na tela | 🟡 O usuário escolheu o contador local. A contagem de áudios exibidos foi trocada pela classificação lido ou ouvido, porque rolagem e recarga reexibem áudios antigos e inflariam o denominador. |
| 🟡 Porta do navegador absorvida pelo núcleo como restrição | 🟡 Spec própria | 🟡 Com um único navegador na primeira versão, a porta teria pouco comportamento a especificar. |
| 🟡 Áudio obtido só ao iniciar a transcrição | 🟡 Obter no momento do clique | 🟡 Evita reter vários áudios na memória quando a fila cresce. |

---

## Apêndice

### Glossário
- 🟡 **Porta:** contrato de operações que o núcleo usa sem conhecer quem o implementa.
- 🟡 **Adaptador:** implementação concreta de uma porta (página do WhatsApp, aplicativo auxiliar, janela, Chrome).
- 🟡 **Sessão da aba:** período entre o carregamento da aba do WhatsApp Web e sua recarga ou fechamento.
- 🟡 **Painel da extensão:** pequena janela aberta pelo ícone da extensão na barra de ferramentas do Chrome.

### Referências
- 🟡 `_reversa_sdd/prd.md`, seções 3, 4, 8 e 9.
- 🟡 `_reversa_sdd/personas.md`, jornada do usuário técnico.
- 🟡 Specs irmãs: `integracao-whatsapp-web.md`, `janela-flutuante.md`, `motor-transcricao-local.md`, `compatibilidade-instalacao.md`.

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
  Arquivo: /Users/iagoleal/dev/whispper-whatsapp-web/_reversa_sdd/sdd/.nucleo-transcricao.md.tmp
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

- 🟡 OQ-01 (impacto alto): piso de latência para áudios curtos.
- 🟡 OQ-02 (impacto médio): destino do texto quando o remetente apaga o áudio para todos.
