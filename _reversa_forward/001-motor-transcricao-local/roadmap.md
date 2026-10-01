# Roadmap: Motor de transcrição local

> Identificador: `001-motor-transcricao-local`
> Data: `2026-09-30`
> Requirements: `_reversa_forward/001-motor-transcricao-local/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O repositório ainda não tem código, de modo que o delta é a criação de três áreas: `auxiliar/`, com o aplicativo auxiliar em Python; `extension/`, com a extensão mínima em TypeScript; e `amostras/`, com os áudios sintéticos de teste. O aplicativo auxiliar roda no interpretador Python em que o mlx-whisper já está instalado e se divide em dois processos: o **processo principal** fala o protocolo de Native Messaging, decodifica o áudio com o ffmpeg por caminho absoluto, mantém a fila e aplica prazos; o **processo trabalhador** carrega o modelo e transcreve. Essa separação resolve de uma vez três requisitos: a verificação responde mesmo durante uma transcrição longa, a transcrição travada é interrompida encerrando o trabalhador (RF-24), e o descarregamento por ociosidade devolve toda a memória ao sistema (RF-23). Do lado da extensão, a porta `MotorDeTranscricao` ganha um tipo próprio, e o adaptador do motor a implementa sobre `chrome.runtime.connectNative`, isolado por uma abstração de canal que permite testar o mesmo contrato contra um host simulado, contra o aplicativo real lançado pelo Node e, manualmente, dentro do Chrome. A primeira entrega é uma prova de conceito de latência no M1, que funciona como portão: se o whisper-large-v3-turbo não cumprir o RNF de desempenho, a decisão volta ao usuário antes do restante da implementação.

## 2. Princípios aplicados

🟡 `.reversa/principles.md` não existe; não há princípio formal a respeitar ou a violar. A diretriz de arquitetura de portas e adaptadores, registrada como restrição em `_reversa_sdd/prd.md#6. Restrições`, é tratada como obrigatória.

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Restrição do PRD: portas e adaptadores, alta coesão e baixo acoplamento | A porta `MotorDeTranscricao` é um tipo sem dependência do Chrome; o adaptador depende de uma abstração de canal; o núcleo futuro dependerá só da porta (DT-09, DT-10). | respeita |
| Restrição do PRD: transcrição local na primeira versão | Nenhum componente acessa a rede; o carregamento do modelo usa caminho local e modo desconectado do cache (DT-06). | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| DT-01 | Aplicativo auxiliar em Python, só com a biblioteca padrão, o mlx-whisper e o numpy que ele já traz, executado no interpretador em que o mlx-whisper está instalado (hoje, Python 3.14 do python.org). | Reaproveita a instalação existente sem rede (RN-01) e sem ambiente novo; o mlx-whisper só existe para Python. Requer Python 3.11 ou superior, pela leitura de TOML na biblioteca padrão. | Swift ou Go chamando o Whisper por outro motor; ambiente virtual próprio, que exigiria rede na instalação. | 🟢 |
| DT-02 | Dois processos: principal (protocolo, decodificação, fila, prazos, estados) e trabalhador (modelo e transcrição), ligados por `multiprocessing` no modo spawn. | Verificação respondida durante a transcrição; interrupção por encerramento do trabalhador (RF-24); memória devolvida por inteiro no descarregamento (RF-23). O custo, recarregar o modelo após interrupção, foi aceito no esclarecimento de 2026-09-30. | Processo único com threads, que não interrompe cálculo em andamento na GPU nem libera toda a memória; interrupção cooperativa entre segmentos, que não cobre travamento dentro de um segmento. | 🟡 |
| DT-03 | Decodificação feita pelo processo principal, chamando o ffmpeg pelo caminho absoluto gravado na configuração, com entrada por pipe; arquivo temporário apenas para MP4, cujo contêiner exige leitura com posicionamento. O áudio chega ao trabalhador como amostras PCM de 16 kHz. | O Chrome lança o host com PATH mínimo, sem `/opt/homebrew/bin`; a função `load_audio` do mlx-whisper chama `ffmpeg` pelo nome. O pipe evita disco na maioria dos casos (RF-13). | Usar `load_audio` do mlx-whisper, que depende do PATH e de arquivo em disco; acrescentar diretórios ao PATH no lançador, que continua frágil. | 🟢 |
| DT-04 | O descritor 1 do processo é trocado na inicialização: o protocolo escreve num duplicado privado da saída padrão, e o descritor 1 passa a apontar para a saída de erro. A transcrição usa `verbose=None`. | Qualquer escrita acidental na saída padrão, do próprio código, de biblioteca ou do trabalhador, corromperia o protocolo; com `verbose=True` o mlx-whisper imprime o texto transcrito. | Confiar em disciplina de código; redirecionar só o `sys.stdout` do Python, que não cobre bibliotecas nativas nem processos filhos. | 🟢 |
| DT-05 | A saída de erro do host vai para `diagnostico.log`, limitado a 1 MiB, que registra só eventos e tipos de erro, sem conteúdo. | O Chrome não exibe a saída de erro do host fora do modo de registro; o diagnóstico precisa de lugar próprio e respeitar o RNF de privacidade. | Descartar a saída de erro, o que cega o diagnóstico; registro sem limite. | 🟡 |
| DT-06 | O modelo é resolvido para a pasta local do snapshot no cache (`models--<org>--<nome>/refs/main` aponta para `snapshots/<hash>`), e esse caminho é passado ao mlx-whisper; o lançador define `HF_HUB_OFFLINE=1` e `HF_HUB_DISABLE_TELEMETRY=1`. | Com caminho local existente, `load_model` não chama `snapshot_download`; as variáveis são segunda barreira contra rede (RF-12). O cache do usuário tem dois snapshots do turbo, e `refs/main` indica o vigente. | Passar o identificador do repositório, que aciona o cliente do Hugging Face; copiar o modelo para pasta própria (descartado no esclarecimento). | 🟢 |
| DT-07 | Instalação por `auxiliar/motor.sh instalar | desinstalar | diagnosticar`. O script escolhe o interpretador que importa o mlx-whisper (variável `WHISPPER_PYTHON`, depois a primeira linha do executável `mlx_whisper` do PATH, depois `python3`), verifica os pré-requisitos e delega a `python -m whispper_motor.instalacao`. | Um comando, sem rede, que recusa com mensagem clara (RF-16); resolve a coexistência de dois Pythons na máquina. | Instalador gráfico (etapa de distribuição); `pip install` do próprio pacote, que exigiria rede. | 🟡 |
| DT-08 | Arquivos instalados: código, lançador, `config.toml`, `desempenho.tsv` e `diagnostico.log` em `~/Library/Application Support/whispper-motor/`; manifesto do host em `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/whispper_whatsapp_web.motor.json`, com `allowed_origins` restrito ao identificador da extensão. A desinstalação remove as duas coisas e preserva o cache de modelos. | Local de usuário documentado pelo Chrome para macOS; desinstalação sem resíduo fora da pasta de modelos (RF-16). O código é copiado para que mover o repositório não quebre o host. | Apontar o manifesto para o repositório; instalar para todos os usuários, o que exige privilégio de administrador. | 🟢 |
| DT-09 | Extensão em TypeScript restrito à sintaxe apagável, compilada com `tsc` para módulos ES em `extension/dist/`; testes com o executor nativo `node --test`, que no Node 24 roda TypeScript diretamente. Dependências de desenvolvimento: `typescript` e `@types/chrome`. | Tipos para as portas, sem empacotador e com o mínimo de dependências; o service worker do Manifest V3 aceita módulo ES. | JavaScript sem tipos; empacotador (esbuild, Vite) e executor de testes externo (Vitest), desnecessários neste tamanho. | 🟡 |
| DT-10 | Porta `MotorDeTranscricao` em `extension/src/dominio/`, sem dependência do Chrome; adaptador em `extension/src/adaptadores/motor-local/`, que depende de uma interface `CanalNativo`. Há três canais: o do Chrome, um simulado para testes unitários e um do Node que lança o host real com o mesmo enquadramento de mensagens. | Permite que a mesma bateria de contrato rode contra o adaptador simulado e contra o real ligado ao aplicativo auxiliar, sem o Chrome (critério do RF-01). | Testar o adaptador real apenas manualmente no Chrome. | 🟡 |
| DT-11 | `transcrever` devolve um resultado discriminado (`ok: true` com texto, idioma, duração e tempo; `ok: false` com código e motivo), sem lançar exceção para falhas previstas. | O RF-01 descreve erro como valor do contrato; o núcleo tratará todos os códigos sem blocos de captura. | Rejeitar a promessa com exceções tipadas. | 🟡 |
| DT-12 | Identificador estável da extensão pelo campo `key` do `manifest.json`, com a chave pública de um par RSA gerado uma vez; a chave privada é descartada. O instalador calcula o identificador a partir dessa chave. | Extensão carregada sem empacotamento mantém o identificador entre recarregamentos (RF-22), condição do `allowed_origins` (RF-14). | Empacotar em `.crx`; copiar o identificador à mão após cada carregamento. | 🟢 |
| DT-13 | Defesa em profundidade na origem: o host confere se o primeiro argumento recebido do Chrome é `chrome-extension://<id>/` do identificador configurado e encerra se não for. | O Chrome já filtra por `allowed_origins`; a conferência cobre manifesto adulterado ou execução manual do host (RN-04). | Confiar só no Chrome. | 🟡 |
| DT-14 | Silêncio (RF-20): o processo principal calcula a energia RMS do áudio decodificado e devolve texto vazio abaixo de −50 dBFS, sem acionar o modelo; acima disso, a transcrição usa `condition_on_previous_text=False` e descarta segmentos com probabilidade de ausência de fala acima de 0,6. Os limiares são calibrados na prova de conceito. | O Whisper tende a inventar frases em silêncio; a porta de energia é barata e o filtro por segmento cobre ruído com trechos de fala. | `hallucination_silence_threshold`, que exige carimbo de tempo por palavra e encarece a transcrição; lista de frases típicas de alucinação, frágil. | 🟡 |
| DT-15 | Prazo por pedido (RF-24): o maior entre 60 s e 30 s por minuto de áudio, contado a partir da entrega ao trabalhador; ao vencer, o principal encerra o trabalhador, responde FALHA_NA_TRANSCRICAO com o motivo "prazo excedido" e inicia outro trabalhador de imediato. | Mesma fórmula do RNF-02 do núcleo; o recarregamento imediato evita que o pedido seguinte espere o carregamento inteiro. | Recarregar só no pedido seguinte. | 🟡 |
| DT-16 | Ociosidade (RF-23): o relógio reinicia a cada pedido de transcrição concluído; após 30 min sem pedido, o trabalhador é encerrado e o estado interno passa a "ocioso", que nunca aparece no protocolo: a próxima verificação ou transcrição inicia o carregamento e o host responde "carregando". | Mantém o protocolo 1 da spec com três estados. | Novo estado no protocolo, que exigiria mudar também a porta do núcleo. | 🟡 |
| DT-17 | Exemplos canônicos do protocolo 1 em `contratos/protocolo-1.json`, lidos pelas duas suítes de teste, a de Python e a de TypeScript. | Impede que os dois lados divirjam em silêncio sobre campos, códigos e versão. | Duplicar exemplos em cada suíte. | 🟡 |
| DT-18 | Amostras de teste sintéticas geradas por `amostras/gerar.sh` com a voz pt_BR do comando `say` e o ffmpeg (fala em português e em inglês, silêncio, ruído, Ogg com Opus, MP3, MP4 com AAC, arquivo corrompido, arquivo vazio) e versionadas; as mensagens de voz reais da prova de conceito ficam em `amostras/reais/`, ignorada pelo Git. | Testes reprodutíveis sem dados pessoais; o repositório é público. | Versionar áudios reais; gerar amostras a cada execução dos testes. | 🟢 |
| DT-19 | Registro de desempenho em TSV com cabeçalho, uma linha por evento (`pedido`, `carregamento`, `descarregamento`), podado para as últimas 1 000 linhas a cada escrita que ultrapasse o limite. | Legível em planilha e no terminal; o tamanho pequeno torna a poda por reescrita trivial (RF-17). | JSON Lines; banco SQLite. | 🟡 |

## 4. Premissas

🟢 O `requirements.md` não tem pontos em aberto desde a sessão de esclarecimentos de 2026-09-30; nenhuma premissa decorre de dúvida aceita.

Premissas técnicas, verificadas pela fase 0 antes do restante da implementação:

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|----------|----------------------------------|-----------------|
| O whisper-large-v3-turbo processa cada áudio em até o maior entre 2 s e 10 s por minuto no M1 de 16 GiB. | §6, RNF de desempenho; §9, sessão de 2026-09-30 | A meta do produto não é atingida com o modelo escolhido; a decisão de modelo volta ao usuário. |
| O carregamento do turbo cabe no intervalo de 30 s do RF-06. | §5, RF-06 | O primeiro pedido após abrir o WhatsApp Web ainda paga o carregamento. |
| Limiares de silêncio da DT-14 separam silêncio e ruído de fala real nas amostras. | §5, RF-20 | Texto inventado em áudios sem fala ou perda de fala baixa. |

## 5. Delta arquitetural

🟡 Não há `_reversa_sdd/architecture.md`. As referências apontam para as specs de componente geradas pelo `/reversa-new`.

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `motor-transcricao-local`: aplicativo auxiliar | `_reversa_sdd/sdd/motor-transcricao-local.md#8. Design e Interface` | componente-novo | Pacote `auxiliar/whispper_motor/` com processos principal e trabalhador, instalador e ferramenta de prova de conceito. |
| `motor-transcricao-local`: adaptador do motor | `_reversa_sdd/sdd/motor-transcricao-local.md#8. Design e Interface` | componente-novo | `extension/src/adaptadores/motor-local/`, com canal do Chrome e tradução de estados e erros. |
| Porta `MotorDeTranscricao` | `_reversa_sdd/sdd/nucleo-transcricao.md#10. Integrações e Dependências` | contrato-novo | Tipo da porta em `extension/src/dominio/`, mais o adaptador simulado que o núcleo usará nos testes. |
| Protocolo 1 entre extensão e aplicativo auxiliar | `_reversa_sdd/sdd/motor-transcricao-local.md#8. Design e Interface` | contrato-alterado | Acrescenta o código MENSAGEM_INVALIDA, os campos de versão no erro VERSAO_INCOMPATIVEL e as regras de ordem e de duplicidade (ver `interfaces/protocolo-native-messaging.md`). |
| Vocabulário de estados e erro de modelo ausente | `_reversa_sdd/sdd/motor-transcricao-local.md#11. Edge Cases e Tratamento de Erros` | regra-alterada | Aplica a RN-06: estados da porta seguem o núcleo; modelo ausente passa a MOTOR_INDISPONIVEL. |
| Extensão mínima hospedeira | `requirements.md` RF-22 (sem origem em `_reversa_sdd/`) | componente-novo | `extension/manifest.json` com permissão `nativeMessaging`, `key` estável e service worker em módulo ES; o service worker expõe `motorDiagnostico` ao console, com `verificar()` e `transcreverAmostra()`, e o build copia uma amostra sintética para `extension/dist/diagnostico/`. |
| `janela-flutuante` | `_reversa_sdd/sdd/janela-flutuante.md` | nenhuma nesta feature | A mensagem de MOTOR_INDISPONIVEL precisará exibir o motivo; registrado como pendência da feature da janela. |

Arquivos pré-existentes tocados: apenas `.gitignore`, para acrescentar `node_modules/`, `extension/dist/`, `__pycache__/` e `amostras/reais/`.

## 6. Delta no modelo de dados

- Resumo das mudanças: sem banco de dados. Surgem dois arquivos locais do aplicativo auxiliar: a configuração em TOML, com o modelo padrão, a pasta de modelos, o caminho do ffmpeg, o identificador da extensão e o tempo de ociosidade; e o registro de desempenho em TSV, com a coluna `evento` acrescentada ao modelo da spec para aferir carregamentos. Somam-se o manifesto do host no formato do Chrome e o registro de diagnóstico.
- Detalhe completo em: `_reversa_forward/001-motor-transcricao-local/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| Protocolo 1 entre extensão e aplicativo auxiliar | mensagens JSON sobre Native Messaging (entrada e saída padrão) | `_reversa_forward/001-motor-transcricao-local/interfaces/protocolo-native-messaging.md` |
| Porta `MotorDeTranscricao` | interface TypeScript consumida pelo núcleo | `_reversa_forward/001-motor-transcricao-local/interfaces/porta-motor-de-transcricao.md` |

## 8. Plano de migração

🟢 n/a: não há sistema anterior nem dados a migrar. Em lugar da migração, a implantação segue fases com portão:

1. **Fase 0, prova de conceito:** gerar as amostras sintéticas; implementar a decodificação e o trabalhador; rodar `auxiliar/ferramentas/prova_de_conceito.py` com as dez mensagens reais em `amostras/reais/`. Portão: se algum áudio exceder o RNF de desempenho com o turbo, parar e levar o resultado ao usuário.
2. **Fase 1, aplicativo auxiliar:** protocolo, processo principal, fila, prazos, ociosidade, registro e testes com trabalhador simulado.
3. **Fase 2, instalação:** `motor.sh`, instalação, desinstalação e diagnóstico, testados com diretório pessoal temporário.
4. **Fase 3, extensão:** manifesto com `key`, porta, adaptador, canal do Chrome, adaptador simulado e bateria de contrato.
5. **Fase 4, integração:** bateria de contrato contra o host real pelo canal do Node; extensão intrusa de teste em `extension/test/extensao-intrusa/`, sem `key` autorizada, para o RF-14; verificações manuais no Chrome descritas em `onboarding.md` (RF-12, RF-13, RF-14, RF-22).

Reversão: `auxiliar/motor.sh desinstalar` remove o registro no Chrome e os arquivos do aplicativo; a extensão é removida em `chrome://extensions`; o cache de modelos permanece e continua servindo ao fluxo manual.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| O M1, primeiro e mais lento da linha Apple Silicon, não cumpre o RNF de desempenho com o turbo. | alto | médio | Fase 0 como portão; se falhar, apresentar ao usuário as medições e as opções (modelo menor já presente no cache, ou versão quantizada, que exigiria download). |
| Escrita acidental na saída padrão corrompe o protocolo. | alto | médio | DT-04; teste que lança o host, força impressões no principal e no trabalhador e confere que o enquadramento permanece válido. |
| PATH mínimo do processo lançado pelo Chrome esconde o ffmpeg. | alto | alto | DT-03; teste que lança o host com ambiente vazio (`env -i`). |
| Texto inventado em silêncio ou ruído. | médio | alto | DT-14, calibrada com as amostras de silêncio e ruído. |
| Chrome encerra o service worker e fecha a conexão. | médio | baixo | Desde o Chrome 105, `connectNative` mantém o service worker vivo; se a conexão cair, a próxima chamada reconecta (RF-10). |
| Coexistência de dois Pythons leva o instalador ao interpretador sem mlx-whisper. | médio | alto | DT-07: escolha pelo interpretador do executável `mlx_whisper` e teste de importação antes de gravar o lançador. |
| Interromper o trabalhador durante cálculo na GPU deixa memória presa. | médio | baixo | O sistema recupera a memória do processo encerrado; o teste do RF-24 mede a memória do trabalhador novo. |
| Troca da chave do manifesto muda o identificador e quebra a autorização. | baixo | baixo | Chave pública versionada; `motor.sh diagnosticar` compara o identificador calculado com o `allowed_origins` instalado. |
| Áudio real vazar para o repositório público. | alto | baixo | `amostras/reais/` no `.gitignore`; testes automatizados usam só amostras sintéticas. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `cross-check.md` (se executado) sem CRITICAL nem HIGH
- [ ] `regression-watch.md` gerado
- [ ] Re-extração reversa executada e sem regressão vermelha (recomendado, não obrigatório)
- [ ] Relatório da prova de conceito com as dez mensagens reais dentro do RNF de desempenho, anexado à pasta da feature sem o texto transcrito
- [ ] Suítes de Python e de TypeScript verdes, incluindo a bateria de contrato contra o adaptador simulado e contra o host real
- [ ] Roteiro de `onboarding.md` executado no Chrome, com os cenários de RF-12, RF-13, RF-14 e RF-22 conferidos
- [ ] Nenhum dos 28 cenários do §7 do `requirements.md` sem teste automatizado ou passo manual correspondente

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-09-30 | Versão inicial gerada por `/reversa-plan` | reversa |
