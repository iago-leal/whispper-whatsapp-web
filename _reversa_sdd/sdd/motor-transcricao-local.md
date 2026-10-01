# Spec: Motor de transcrição local

**Versão:** 1.0
**Status:** Rascunho
**Autor:** reversa-spec-sdd
**Data:** 2026-09-30
**Reviewers:** iago (pendente)
**Componente:** `motor-transcricao-local` · **Etapa:** primeira (uso pessoal)
**Fonte:** `_reversa_sdd/prd.md`

> Selo 🟡 PLANEJADO em todos os itens.
> Nesta spec, "o sistema" designa o motor de transcrição local, formado por duas partes: o adaptador do motor, dentro da extensão, e o aplicativo auxiliar, programa instalado no Mac que roda o Whisper. Juntas, implementam a porta MotorDeTranscricao declarada em `nucleo-transcricao.md`.

---

## 1. Resumo

🟡 O motor define o contrato de transcrição que o núcleo usa e implementa o primeiro adaptador: um aplicativo auxiliar instalado no Mac com Apple Silicon, que troca mensagens com a extensão pelo Native Messaging do Chrome e transcreve com o mlx-whisper, com detecção automática de idioma, sem acesso à rede e sem guardar áudio nem texto.

---

## 2. Contexto e Motivação

**Problema:**
🟡 Uma extensão de navegador, sozinha, não executa programas na máquina (premissa 2 do PRD). O usuário técnico já transcreve com o mlx-whisper no terminal; falta ligar esse motor à extensão sem passos manuais.

**Evidências:**
🟡 O PRD aponta a ponte até o Whisper como premissa fatal. O usuário escolheu o aplicativo auxiliar via Native Messaging, que roda o mlx-whisper com desempenho pleno; o Whisper no navegador fica como adaptador futuro.

**Por que agora:**
🟡 Sem motor, nenhuma transcrição acontece, e a meta de latência (≤ 10 s por minuto de áudio) só pode ser verificada com ele funcionando.

---

## 3. Goals (Objetivos)

- [ ] 🟡 G-01: Latência ≤ 10 s por minuto de áudio no Mac com Apple Silicon do usuário, com o modelo já carregado.
- [ ] 🟡 G-02: 0 carregamentos de modelo da segunda transcrição em diante, enquanto a conexão com a extensão estiver aberta.
- [ ] 🟡 G-03: 0 acessos à rede durante a transcrição.
- [ ] 🟡 G-04: 0 arquivos de áudio ou de texto remanescentes no disco após cada pedido.
- [ ] 🟡 G-05: Trocar de adaptador de motor não exige alteração no núcleo.

**Métricas de sucesso:**

| Métrica | Baseline atual | Target | Prazo |
|---------|---------------|--------|-------|
| 🟡 Tempo de processamento por minuto de áudio | 🟡 a medir no fluxo manual | 🟡 ≤ 10 s/min | 🟡 3 meses |
| 🟡 Passos manuais por transcrição | 🟡 cerca de 5 | 🟡 0 no motor | 🟡 primeira versão |
| 🟡 Conexões de rede durante a transcrição | 🟡 não medida | 🟡 0 | 🟡 primeira versão |

---

## 4. Non-Goals (Fora do Escopo)

- NG-01: 🟡 Whisper executado dentro do navegador (WebGPU ou WebAssembly): adaptador futuro, fora desta versão.
- NG-02: 🟡 Adaptadores para máquinas sem Apple Silicon (whisper.cpp ou faster-whisper): etapa de distribuição.
- NG-03: 🟡 Instalação guiada para leigos, tratada em `compatibilidade-instalacao.md`; nesta etapa, a instalação é feita pelo usuário técnico no terminal.
- NG-04: 🟡 Transcrição em nuvem, adiada no PRD.
- NG-05: 🟡 Tradução para outro idioma pela própria tarefa de tradução do Whisper.
- NG-06: 🟡 Identificação de quem fala, marcação de tempo por trecho ou geração de legendas.
- NG-07: 🟡 Download de modelos durante a transcrição.

---

## 5. Usuários e Personas

**Usuário primário:** 🟡 usuário técnico (persona 1 do PRD), avançado em terminal, que já usa o mlx-whisper e instala o aplicativo auxiliar por comando.

**Usuário secundário:** 🟡 usuário leigo (persona 2), só na etapa de distribuição, por meio de instalador próprio.

**Jornada atual (sem a feature):**
🟡 O usuário baixa o áudio, abre o terminal, roda o mlx-whisper apontando para o arquivo, espera o carregamento do modelo a cada execução e copia o resultado.

**Jornada futura (com a feature):**
🟡 O aplicativo auxiliar é iniciado pelo Chrome quando o WhatsApp Web abre, mantém o modelo carregado e responde a cada pedido da extensão, sem que o usuário abra o terminal.

---

## 6. Requisitos Funcionais

### 6.1 Requisitos Principais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | 🟡 O sistema deve expor ao núcleo duas operações: verificar o estado do motor e transcrever um áudio, devolvendo texto e idioma detectado ou um código de erro com motivo. | Must | 🟡 Os testes do núcleo passam com o adaptador real e com um adaptador simulado, sem alteração no código do núcleo. |
| RF-02 | 🟡 O sistema deve transcrever com o mlx-whisper, detectando o idioma de cada áudio automaticamente. | Must | 🟡 Um áudio em português devolve idioma "pt" e um em inglês devolve "en", sem configuração prévia. |
| RF-03 | 🟡 O sistema deve aceitar áudio Ogg com codificação Opus, formato das mensagens de voz do WhatsApp. | Must | 🟡 Dez mensagens de voz reais, de 5 s a 5 min, são transcritas sem erro. |
| RF-04 | 🟡 O sistema deve aceitar também áudio MP4/AAC e MPEG (MP3). | Should | 🟡 Um arquivo de cada formato é transcrito sem erro. |
| RF-05 | 🟡 O sistema deve manter o modelo carregado na memória entre transcrições enquanto a conexão com a extensão estiver aberta. | Must | 🟡 O registro de desempenho da segunda transcrição da sessão não contém carregamento de modelo. |
| RF-06 | 🟡 O sistema deve iniciar o aplicativo auxiliar e carregar o modelo quando a aba do WhatsApp Web abrir, antes do primeiro clique. | Should | 🟡 Com o WhatsApp Web aberto há 30 s, a primeira transcrição não inclui carregamento de modelo. |
| RF-07 | 🟡 O sistema deve processar um pedido por vez, na ordem de chegada. | Must | 🟡 Três pedidos enviados juntos são respondidos na ordem de envio. |
| RF-08 | 🟡 O sistema deve responder à verificação com a versão do protocolo, a versão do aplicativo auxiliar, o modelo configurado e o estado: "pronto", "carregando" ou "erro", com o motivo. | Must | 🟡 A resposta contém os 4 campos; com o modelo ausente, o estado é "erro" e o motivo é "modelo não encontrado". |
| RF-09 | 🟡 O sistema deve recusar com VERSAO_INCOMPATIVEL os pedidos quando a versão de protocolo da extensão diferir da do aplicativo auxiliar. | Must | 🟡 Um aplicativo com protocolo 2 recusa pedido com protocolo 1 e informa as duas versões. |
| RF-10 | 🟡 O sistema deve devolver MOTOR_INDISPONIVEL quando o aplicativo auxiliar não estiver instalado, não iniciar ou encerrar a conexão, tentando reconectar uma vez no pedido seguinte antes de devolver o erro. | Must | 🟡 Com o processo encerrado à força, o pedido em curso recebe o erro; o pedido seguinte reconecta e é atendido. |
| RF-11 | 🟡 O sistema deve devolver FALHA_NA_TRANSCRICAO, com motivo, quando o áudio não puder ser decodificado ou o mlx-whisper falhar. | Must | 🟡 Um arquivo corrompido devolve o erro com o motivo "áudio ilegível". |
| RF-12 | 🟡 O sistema deve funcionar sem acesso à rede, usando modelo já presente no disco. | Must | 🟡 Com a rede desligada, a transcrição é concluída; o monitor de conexões do sistema registra 0 conexões do aplicativo. |
| RF-13 | 🟡 O sistema não deve manter cópia do áudio nem do texto após responder; arquivos temporários, se usados, são apagados ao fim de cada pedido, com sucesso ou erro. | Must | 🟡 Após 10 pedidos, 2 deles com erro, a pasta temporária do aplicativo está vazia. |
| RF-14 | 🟡 O sistema deve aceitar conexões apenas da extensão autorizada, cujo identificador consta no registro do aplicativo auxiliar no Chrome. | Must | 🟡 Uma segunda extensão de teste que tenta se conectar é recusada pelo Chrome. |
| RF-15 | 🟡 O sistema deve permitir escolher o modelo Whisper num arquivo de configuração do aplicativo auxiliar. | Should | 🟡 Trocar o modelo no arquivo e reabrir o WhatsApp Web muda o modelo informado na verificação. |
| RF-16 | 🟡 O usuário deve poder instalar e desinstalar o aplicativo auxiliar por um comando de terminal, que registra ou remove o aplicativo no Chrome. | Must | 🟡 Após a instalação, a verificação responde "pronto"; após a desinstalação, MOTOR_INDISPONIVEL, e não resta arquivo do aplicativo fora da pasta de modelos. |
| RF-17 | 🟡 O sistema deve gravar, num registro local sem conteúdo, a data, a duração do áudio e o tempo de processamento de cada pedido, para aferir a meta de latência. | Should | 🟡 O registro contém essas 3 colunas por pedido e nenhuma palavra transcrita; mantém no máximo 1 000 linhas, descartando as mais antigas. |

### 6.2 Fluxo Principal (Happy Path)

1. 🟡 A aba do WhatsApp Web abre; o adaptador do motor pede ao Chrome a conexão com o aplicativo auxiliar, que o Chrome inicia.
2. 🟡 O sistema responde à verificação com o estado "carregando" e, ao terminar de carregar o modelo, "pronto".
3. 🟡 O núcleo envia um áudio Ogg/Opus para transcrever.
4. 🟡 O sistema decodifica o áudio, transcreve com detecção automática de idioma e apaga os temporários.
5. 🟡 O sistema devolve o texto, o idioma detectado, a duração do áudio e o tempo de processamento.
6. 🟡 Resultado: o núcleo recebe o texto, e o modelo segue carregado para o próximo pedido.

### 6.3 Fluxos Alternativos

**Fluxo Alternativo A, aplicativo não instalado:**
1. 🟡 O Chrome não encontra o registro do aplicativo auxiliar.
2. 🟡 A verificação devolve "indisponível", e cada pedido recebe MOTOR_INDISPONIVEL com a instrução de instalação.

**Fluxo Alternativo B, queda do aplicativo:**
1. 🟡 O processo do aplicativo auxiliar termina durante uma transcrição.
2. 🟡 O pedido em curso recebe MOTOR_INDISPONIVEL; o pedido seguinte tenta reconectar uma vez.

**Fluxo Alternativo C, versões diferentes:**
1. 🟡 A extensão foi atualizada e o aplicativo auxiliar não.
2. 🟡 O sistema devolve VERSAO_INCOMPATIVEL, com as duas versões, em vez de tentar transcrever.

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Valor alvo | Observação |
|----|-----------|-----------|------------|
| RNF-01 | 🟡 Latência | 🟡 ≤ 10 s por minuto de áudio, com o modelo carregado | 🟡 No Mac com Apple Silicon do usuário técnico; medida pelo registro de desempenho. O piso para áudios curtos está em aberto na spec do núcleo. |
| RNF-02 | 🟡 Tamanho das mensagens | 🟡 áudio de até 64 MiB por pedido; resposta de até 1 MB | 🟡 Limites do Native Messaging do Chrome em cada sentido. |
| RNF-03 | 🟡 Isolamento de rede | 🟡 0 conexões abertas pelo aplicativo auxiliar durante a transcrição | 🟡 Verificável com o monitor de conexões do sistema. |
| RNF-04 | 🟡 Plataforma | 🟡 macOS em Mac com Apple Silicon | 🟡 Exigência da biblioteca MLX, usada pelo mlx-whisper. |
| RNF-05 | 🟡 Compatibilidade de contrato | 🟡 protocolo versionado por número inteiro | 🟡 Toda mudança incompatível incrementa a versão. |

---

## 8. Design e Interface

**Componentes afetados:** 🟡 adaptador do motor, no processo de segundo plano da extensão (único contexto com acesso ao Native Messaging); aplicativo auxiliar; registro do aplicativo no Chrome; arquivo de configuração; registro de desempenho.

**Comportamento esperado:**
🟡 O aplicativo auxiliar não tem interface gráfica nesta etapa. As instruções de instalação e os estados do motor chegam ao usuário pelo painel da extensão e pelas janelas, via núcleo.

**Estados da UI (vistos pelo painel e pelas janelas):**
- Estado vazio: 🟡 aplicativo não instalado: "indisponível", com a instrução de instalação.
- Estado de carregamento: 🟡 "carregando", enquanto o modelo é carregado.
- Estado de erro: 🟡 "erro", com o motivo (modelo ausente, memória insuficiente, versão incompatível).
- Estado de sucesso: 🟡 "pronto".

**Contrato de mensagens, protocolo 1:**

```
Verificação         { "tipo": "verificar", "protocolo": 1 }
Resposta            { "tipo": "estado", "protocolo": 1, "versaoApp": "1.0.0",
                      "modelo": "<identificador do modelo>", "estado": "pronto", "motivo": null }
Transcrição         { "tipo": "transcrever", "protocolo": 1, "idPedido": "p-17",
                      "midia": "audio/ogg; codecs=opus", "audioBase64": "<bytes em base64>" }
Resposta de sucesso { "tipo": "resultado", "idPedido": "p-17", "texto": "…", "idioma": "pt",
                      "duracaoAudioSeg": 42, "processamentoMs": 3100 }
Resposta de erro    { "tipo": "erro", "idPedido": "p-17",
                      "codigo": "FALHA_NA_TRANSCRICAO", "motivo": "áudio ilegível" }
```

---

## 9. Modelo de Dados

**Entidades novas ou modificadas:**

```
ConfiguracaoDoAuxiliar {         // arquivo no disco do usuário
  modelo: texto                  // identificador ou caminho do modelo em formato MLX; padrão em aberto (OQ-01)
  pastaDeModelos: caminho
}

RegistroDeDesempenho {           // arquivo local, no máximo 1 000 linhas, sem conteúdo
  instante: data e hora
  duracaoAudioSeg: número
  processamentoMs: número
  resultado: ok | código de erro
}
```

**Migrações necessárias:** 🟡 Não; primeira versão.

---

## 10. Integrações e Dependências

| Dependência | Tipo | Impacto se indisponível |
|-------------|------|------------------------|
| 🟡 mlx-whisper (biblioteca Python) | 🟡 Obrigatória | 🟡 Verificação em "erro", com o motivo "mlx-whisper ausente". |
| 🟡 ffmpeg, que decodifica o áudio para o mlx-whisper | 🟡 Obrigatória | 🟡 FALHA_NA_TRANSCRICAO com o motivo "ffmpeg ausente". |
| 🟡 Modelo Whisper em formato MLX, no disco | 🟡 Obrigatória | 🟡 Verificação em "erro", com o motivo "modelo não encontrado". |
| 🟡 Native Messaging do Chrome | 🟡 Obrigatória | 🟡 MOTOR_INDISPONIVEL. |
| 🟡 Python 3 no Mac | 🟡 Obrigatória | 🟡 O comando de instalação recusa e informa a versão exigida. |

---

## 11. Edge Cases e Tratamento de Erros

| Cenário | Trigger | Comportamento esperado |
|---------|---------|----------------------|
| EC-01: 🟡 Aplicativo não instalado | 🟡 Registro do aplicativo ausente no Chrome | 🟡 MOTOR_INDISPONIVEL, com a instrução de instalação. |
| EC-02: 🟡 Falha do processo | 🟡 O aplicativo auxiliar termina durante a transcrição | 🟡 MOTOR_INDISPONIVEL no pedido em curso; reconexão única no pedido seguinte. |
| EC-03: 🟡 Modelo ausente | 🟡 Arquivo do modelo não encontrado | 🟡 Verificação em "erro"; pedidos recebem FALHA_NA_TRANSCRICAO com o motivo; nenhum download automático. |
| EC-04: 🟡 Áudio corrompido | 🟡 A decodificação falha | 🟡 FALHA_NA_TRANSCRICAO com o motivo "áudio ilegível". |
| EC-05: 🟡 Áudio sem fala | 🟡 Silêncio ou ruído | 🟡 Resultado com texto vazio; o núcleo exibe "Nenhuma fala reconhecida". |
| EC-06: 🟡 Áudio acima de 64 MiB | 🟡 Arquivo maior que o limite do Native Messaging | 🟡 O adaptador recusa antes do envio, com FALHA_NA_TRANSCRICAO e o motivo "áudio maior que o limite". |
| EC-07: 🟡 Versões diferentes | 🟡 Protocolo da extensão diferente do aplicativo | 🟡 VERSAO_INCOMPATIVEL, com as duas versões. |
| EC-08: 🟡 Memória insuficiente | 🟡 Falha ao carregar o modelo | 🟡 Verificação em "erro", com o motivo "memória insuficiente para o modelo", sugerindo modelo menor na configuração. |
| EC-09: 🟡 Verificação sem resposta | 🟡 O aplicativo não responde à verificação em 10 s (timeout) | 🟡 Estado "indisponível"; nova verificação no próximo pedido. |
| EC-10: 🟡 Conexão não autorizada | 🟡 Outra extensão ou programa tenta se conectar | 🟡 Recusa pelo Chrome; o aplicativo não é iniciado para essa origem. |

---

## 12. Segurança e Privacidade

- **Autenticação:** 🟡 O Chrome só inicia o aplicativo auxiliar para a extensão cujo identificador consta no registro do aplicativo.
- **Autorização:** 🟡 O aplicativo executa apenas as operações do protocolo (verificar e transcrever); não executa comandos arbitrários nem lê arquivos indicados pela extensão.
- **Dados sensíveis:** 🟡 O áudio de terceiros fica só na memória ou em arquivo temporário apagado ao fim do pedido; o texto não é gravado; não há rede.
- **Auditoria:** 🟡 O registro de desempenho guarda só data, duração e tempo de processamento.

---

## 13. Plano de Rollout

- **Estratégia:** 🟡 Primeiro, uma prova de conceito de latência: o aplicativo auxiliar transcreve 10 áudios reais de 5 s a 5 min, e o resultado é comparado à meta de 10 s por minuto. Aprovada a prova, instalação manual pelo usuário técnico com o comando de terminal.
- **Como reverter (rollback):** 🟡 O comando de desinstalação remove o registro e o aplicativo; os modelos permanecem na pasta, reaproveitáveis pelo fluxo manual atual.
- **Monitoramento pós-deploy:** 🟡 O registro de desempenho é revisado ao fim da primeira e da quarta semana, contra a meta de latência.

---

## 14. Open Questions

| # | Pergunta | Impacto | Dono | Prazo |
|---|---------|---------|------|-------|
| OQ-01 | 🟡 ⚠️ ABERTO: Modelo padrão. Proposta: whisper-large-v3-turbo em formato MLX, pelo equilíbrio entre qualidade em português e velocidade; confirmar com o modelo que o usuário usa hoje. | Alto | iago | antes da prova de conceito |
| OQ-02 | 🟡 ⚠️ ABERTO: Descarregar o modelo após um período sem uso (proposta: 30 min), liberando memória ao custo de recarregar no pedido seguinte? | Médio | iago | antes de /reversa-plan |
| OQ-03 | 🟡 ⚠️ ABERTO: Linguagem e empacotamento do aplicativo auxiliar. Proposta: Python, reaproveitando o mlx-whisper já instalado pelo usuário. | Médio | iago | antes de /reversa-plan |
| OQ-04 | 🟡 ⚠️ ABERTO: Origem dos pesos do modelo na etapa de distribuição (pendência 11 do PRD). | Baixo | iago | antes da etapa de distribuição |

---

## 15. Decisões Tomadas (Decision Log)

| Decisão | Alternativas consideradas | Racional |
|---------|--------------------------|---------|
| 🟡 Aplicativo auxiliar via Native Messaging | 🟡 Whisper no navegador; decidir após teste comparativo | 🟡 Escolha do usuário: desempenho pleno com o mlx-whisper, que ele já usa. |
| 🟡 Detecção automática de idioma | 🟡 Português fixo; português com opção de troca | 🟡 Escolha do usuário. |
| 🟡 Um pedido por vez | 🟡 Processamento paralelo | 🟡 O hardware de aceleração é compartilhado, e o núcleo já garante a ordem. |
| 🟡 Sem rede durante a transcrição | 🟡 Download de modelo sob demanda | 🟡 Privacidade e previsibilidade de tempo. |
| 🟡 Modelo carregado durante a sessão | 🟡 Carregar a cada pedido | 🟡 O carregamento custaria segundos por áudio e comprometeria a meta de latência. |

---

## Apêndice

### Glossário
- 🟡 **Native Messaging:** mecanismo do Chrome que permite a uma extensão trocar mensagens com um programa instalado na máquina, desde que esse programa esteja registrado e autorize a extensão.
- 🟡 **Aplicativo auxiliar:** programa instalado à parte que recebe o áudio da extensão e roda o Whisper.
- 🟡 **mlx-whisper:** implementação do Whisper para a biblioteca MLX, otimizada para Macs com Apple Silicon.
- 🟡 **Modelo:** arquivo de pesos do Whisper; modelos maiores transcrevem melhor e levam mais tempo.

### Referências
- 🟡 `_reversa_sdd/prd.md`, seções 6, 7 e 8 (premissa 2).
- 🟡 `_reversa_sdd/sdd/nucleo-transcricao.md`, contrato da porta MotorDeTranscricao.

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
  Arquivo: /Users/iagoleal/dev/whispper-whatsapp-web/_reversa_sdd/sdd/.motor-transcricao-local.md.tmp
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

- 🟡 OQ-01 (impacto alto): modelo Whisper padrão.
- 🟡 OQ-02 e OQ-03 (impacto médio): descarregamento do modelo ocioso; linguagem e empacotamento do aplicativo auxiliar.
