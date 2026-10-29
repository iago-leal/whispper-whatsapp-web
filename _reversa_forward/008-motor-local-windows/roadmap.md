# Roadmap: Motor local no Windows

> Identificador: `008-motor-local-windows`
> Data: `2026-10-29`
> Requirements: `_reversa_forward/008-motor-local-windows/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O aplicativo auxiliar ganha uma segunda plataforma sem ganhar um segundo código. O protocolo, o servidor, a fila, os registros e a configuração continuam únicos. O que depende do sistema operacional passa a morar num módulo novo, `plataforma.py`, com uma implementação para o macOS e outra para o Windows: pasta do aplicativo, existência de processo, modo binário da entrada e da saída, job que leva os filhos junto na morte do host, leitura com prazo e arquivo temporário do MP4. O trabalhador continua em processo separado e passa a receber o laço da plataforma. No Mac fica o `laco_mlx`; no Windows entra o `laco_ct2`, que carrega o Whisper large-v3-turbo convertido para o CTranslate2 na placa NVIDIA em `int8` e, se a placa falhar, no processador. A instalação no Windows grava a pasta em `%LOCALAPPDATA%\whispper-motor`, um lançador `.bat`, o manifesto do host e as entradas de registro do Chrome e do Brave, por um `auxiliar\motor.cmd` equivalente ao `motor.sh`. A Fase 0, o teste da premissa, já rodou no desktop da AFLA (`investigation.md#1`): 6,0 s por minuto de áudio na placa, 17,2 no processador, com texto praticamente idêntico ao de referência.

## 2. Princípios aplicados

Não há `.reversa/principles.md` neste projeto. Ficam registradas as convenções das specs e das features entregues que esta feature precisa respeitar.

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Portas e adaptadores (`_reversa_sdd/prd.md#6-restrições`) | A porta `MotorDeTranscricao` e o adaptador local da extensão não mudam; a nova plataforma fica atrás do mesmo protocolo (RN-03). | respeita |
| Transcrição local, sem rede (`motor-transcricao-local.md#12-segurança-e-privacidade`, W012) | O laço do Windows recebe só o caminho local do modelo e roda com `HF_HUB_OFFLINE=1`; nenhum download no host nem na instalação. | respeita |
| Sem retenção (W013) | O MP4 passa por arquivo apagado pelo sistema no fechamento; o job garante o fechamento mesmo na morte forçada (`investigation.md#1.4`). | respeita |
| Saída do protocolo protegida (DT-04) | A troca de descritores continua; o trabalhador no Windows também desvia as saídas 1 e 2 para o `diagnostico.log`. | respeita |
| Registros sem conteúdo (W017) | As linhas novas do `diagnostico.log` são mensagens fixas, com motivo de uma lista fechada (`data-delta.md#5`). | respeita |
| Sem regressão no Mac (RN-06, W001 a W024) | O código do Mac só muda de lugar quando passa para `plataforma.py`; as suítes do Mac continuam sendo o portão. | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | No Windows, transcrever com o faster-whisper 1.2 sobre o CTranslate2 4.8. | Decisão do usuário; a sonda confirmou a meta e a qualidade (`investigation.md#1.3`). | whisper.cpp; Whisper em PyTorch; ONNX com DirectML (`investigation.md#6`) | 🟢 |
| D-02 | Modelo padrão no Windows: `mobiuslabsgmbh/faster-whisper-large-v3-turbo`, o repositório que o faster-whisper associa a `large-v3-turbo`, resolvido no cache pela `refs/main`, como no Mac. | Mesmo modelo de referência do Mac (RN-02), já convertido pelo mantenedor da biblioteca; a instalação não converte nada. | converter os pesos oficiais localmente, o que exigiria PyTorch e Transformers | 🟢 |
| D-03 | Na placa, tipo `int8`; no processador, `int8` com uma linha por núcleo físico. | Únicos tipos eficientes na Pascal (`int8_float16` recusado); 1,1 GB de memória da placa. | `float32` na placa (cerca de 3,2 GB, perto do limite de 4 GB) | 🟢 |
| D-04 | Busca gulosa (`beam_size=1`), `condition_on_previous_text=False`, sem filtro de voz do faster-whisper, com o filtro de energia DT-14 (`texto_com_fala`) aplicado aos segmentos. | Paridade com o Mac; o feixe de 5 custou 12% a mais sem ganho visível; o silêncio gera "Thank you." sem o filtro. | feixe de 5; o VAD Silero embutido, que mudaria o comportamento entre plataformas | 🟢 |
| D-05 | Escolha do dispositivo no carregamento: placa primeiro; se não houver placa CUDA, se as DLLs não carregarem, se faltar memória ou se a placa falhar no aquecimento, processador. O motivo vai para o `diagnostico.log` a partir de uma lista fixa. A escolha vale até o próximo carregamento. | RF-19, RF-20 e RN-07; não há campo de configuração novo. | campo `dispositivo` no `config.toml`; exigir a placa | 🟡 |
| D-06 | Erro da placa durante um pedido: o pedido recebe FALHA_NA_TRANSCRICAO, e o trabalhador encerra. O pedido seguinte recria o trabalhador, que escolhe de novo entre placa e processador. | Uma falha da placa no meio da sessão tende a se repetir; recomeçar o trabalhador reaproveita o caminho já testado de recriação (W024). | seguir na placa até a ociosidade | 🟡 |
| D-07 | Bibliotecas da NVIDIA pelo pip (`nvidia-cublas-cu12`, `nvidia-cudnn-cu12` da série 9), no mesmo ambiente do Python; o trabalhador registra `site-packages\nvidia\*\bin` com `os.add_dll_directory` e no `PATH` antes de importar o CTranslate2. | Sem administrador e sem CUDA Toolkit; a sonda carregou a placa assim. A geração 12 é a última que suporta a Pascal (`investigation.md#4`). | CUDA Toolkit instalado no sistema | 🟢 |
| D-08 | Módulo novo `auxiliar/whispper_motor/plataforma.py`, com as operações que dependem do sistema: pasta padrão do aplicativo, `processo_existe`, conferência do dono das pastas temporárias, modo binário da entrada e da saída, job do host, abertura do MP4 para o decodificador, leitura com prazo e encerramento de processo. Os demais módulos chamam só ele. | Concentra a divergência num lugar; o resto do host continua idêntico nas duas plataformas (RNF de manutenibilidade). | `if sys.platform` espalhado pelos módulos | 🟡 |
| D-09 | `processo_existe` no Windows por `OpenProcess` com `PROCESS_QUERY_LIMITED_INFORMATION` e `GetExitCodeProcess`; nunca `os.kill(pid, 0)`, que no Windows mata o processo. Os testes ganham o mesmo auxiliar. | `investigation.md#2`: a varredura de pastas órfãs mataria processos alheios. | `os.kill` com tratamento de erro; `tasklist` | 🟢 |
| D-10 | O host se associa, ao iniciar, a um job novo com `KILL_ON_JOB_CLOSE`. O trabalhador e o FFmpeg entram nele por herança. No Windows, o job substitui o `-timelimit` e a vigia como garantia de que nenhum filho sobrevive; a vigia continua, por paridade e para o caso de o Windows recusar o job. | RF-08; sonda 1.4. | job só para o FFmpeg; `taskkill /T` na desinstalação apenas | 🟡 |
| D-11 | MP4 no Windows: `tempfile.TemporaryFile` (apagamento no fechamento) como entrada padrão do FFmpeg, lido com `-protocol_whitelist fd -fd 0 -i fd:`. Os demais formatos seguem por pipe, como no Mac. | RF-07; sonda 1.4 (`-i fd:0` é recusado pelo FFmpeg 9). | PyAV em memória; arquivo com nome apagado depois (`investigation.md#6`) | 🟢 |
| D-12 | Leitura da saída do FFmpeg no Windows por uma linha auxiliar que lê em blocos e uma fila com prazo, mantendo o prazo de 60 s e o teto de 2 h de saída. O `_ler_exato` do diagnóstico usa o mesmo auxiliar. | `select` não aceita pipes no Windows. | `communicate(timeout)`, que acumularia a saída sem o teto | 🟡 |
| D-13 | Pasta do aplicativo em `%LOCALAPPDATA%\whispper-motor`; manifesto do host dentro dela; entradas `HKCU` do Chrome e do Brave gravadas pelo `winreg` (biblioteca padrão), por último na instalação e primeiro na desinstalação. | `interfaces/registro-native-messaging-windows.md`; sem administrador (RN-05). | `HKLM`; manifesto em pasta do navegador | 🟢 |
| D-14 | Lançador `whispper-motor.bat` com as mesmas variáveis do lançador do Mac e `"<python>" -m whispper_motor %*`; a instalação recusa caminhos com `%`, `^`, `&`, `|`, `<`, `>` ou `!`. | O navegador inicia o host pelo `cmd.exe`; recusar é mais seguro que escapar. | `.exe` próprio (exigiria empacotador); `.cmd` com escape | 🟡 |
| D-15 | `auxiliar\motor.cmd instalar | desinstalar | diagnosticar`. Escolha do Python: `WHISPPER_PYTHON`; senão, `%USERPROFILE%\.venvs\whispper-motor\Scripts\python.exe`, se existir; senão, o `python` do `PATH` que importe o faster-whisper; senão, o primeiro encontrado, para que a instalação recuse nomeando a falta. | Um `.cmd` roda em qualquer terminal; scripts `.ps1` são bloqueados pela política padrão do Windows. | `motor.ps1`; exigir `WHISPPER_PYTHON` | 🟡 |
| D-16 | Pré-requisitos no Windows: Windows de 64 bits em x86-64 (`platform.machine() == "AMD64"`), Python 3.11 ou superior que importe o faster-whisper, FFmpeg executável e modelo no cache. As bibliotecas da placa e a placa CUDA viram aviso, não falta. O comando de download sai na sintaxe do PowerShell. | RF-10; RN-07. | recusar sem placa | 🟢 |
| D-17 | Desinstalação no Windows: remove as entradas de registro; encerra os hosts registrados em `hosts\` com `TerminateProcess`, depois de conferir que o PID é de um `python.exe` iniciado antes do arquivo de registro (reaproveitamento de PID); o job leva os filhos; varre as pastas temporárias órfãs; apaga a pasta do aplicativo. | RF-12; no Windows não há SIGTERM que o host possa tratar. | conferir a linha de comando do processo, que exigiria WMI | 🟡 |
| D-18 | Diagnóstico no Windows: confere as duas entradas de registro, o manifesto, o lançador e a configuração; inicia o host por `cmd.exe /d /c <lançador> <origem> --parent-window=0`, com o ambiente atual; ao chegar a "pronto", lê no `diagnostico.log` a linha do dispositivo escrita por esse host e a mostra. | RF-13; o protocolo não informa o dispositivo (RN-03). | campo novo na resposta `estado` | 🟡 |
| D-19 | A classe `TrabalhadorMlx` passa a se chamar `TrabalhadorEmProcesso` e recebe o laço por plataforma (`laco_padrao()`); `servidor.py` não muda. | O nome deixaria de descrever o que roda no Windows; a fábrica já é injetada no `Servidor`. | duas classes de trabalhador | 🟢 |
| D-20 | Testes: os que dependem de recurso exclusivo de uma plataforma ganham `skipif` com motivo que nomeia a plataforma; o FFmpeg falso dos testes vira um script Python com lançador `.cmd` no Windows; o registro do Windows nos testes usa uma raiz própria (`HKCU\Software\whispper-motor-testes`), injetada no instalador. | RF-17. | testes separados por plataforma | 🟡 |
| D-21 | Bateria de contrato da extensão no Windows: `canal-node.ts` ganha o ramo `win32`, sem o PATH mínimo do macOS e com o Python pela regra do D-15. | Critério do RF-01. | só os testes do Python no Windows | 🟢 |
| D-22 | A versão do aplicativo auxiliar passa a 1.1.0; o protocolo continua 1. | A versão informa, na verificação e no diagnóstico, que a cópia instalada já tem o suporte ao Windows; o protocolo não muda (RN-03). | protocolo 2 | 🟢 |

## 4. Premissas

Nenhuma premissa vem de `[DÚVIDA]`: as duas lacunas foram resolvidas na sessão de esclarecimento de 2026-10-29. Os pontos ainda não confirmados viraram riscos (seção 9) e itens da aceitação.

## 5. Delta arquitetural

O projeto não tem `architecture.md`; os componentes são os da spec `_reversa_sdd/sdd/motor-transcricao-local.md#8-design-e-interface` e os arquivos do adendo `_reversa_sdd/addenda/001-motor-transcricao-local.md`.

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| Plataforma do aplicativo auxiliar | n/a (novo: `auxiliar/whispper_motor/plataforma.py`) | componente-novo | Operações dependentes do sistema, com implementações para macOS e Windows (D-08 a D-12). |
| Trabalhador | `auxiliar/whispper_motor/trabalhador.py` | regra-alterada | Novo `laco_ct2` com escolha de dispositivo (D-01 a D-07); classe renomeada (D-19); desvio das saídas no Windows. |
| Resolução do modelo | `auxiliar/whispper_motor/modelos.py` | regra-alterada | Aceita `model.bin` como pesos. |
| Configuração | `auxiliar/whispper_motor/configuracao.py` | regra-alterada | Modelo padrão e candidatos do FFmpeg por plataforma. |
| Decodificação | `auxiliar/whispper_motor/audio.py` | regra-alterada | MP4 por `-fd 0 -i fd:` e leitura com prazo sem `select` no Windows (D-11, D-12). |
| Ponto de entrada do host | `auxiliar/whispper_motor/__main__.py` | regra-alterada | Pasta padrão, existência de processo, dono das pastas, modo binário e job pela plataforma (D-08 a D-10). |
| Instalação, desinstalação e diagnóstico | `auxiliar/whispper_motor/instalacao.py` | regra-alterada | Ramo Windows: registro, lançador `.bat`, pré-requisitos, encerramento de hosts e diagnóstico (D-13 a D-18). |
| Comando de instalação no Windows | n/a (novo: `auxiliar/motor.cmd`) | componente-novo | Equivalente ao `motor.sh` (D-15). |
| Registro do host no navegador | `interfaces/registro-native-messaging-windows.md` | contrato-novo | Entradas `HKCU` do Chrome e do Brave e manifesto na pasta do aplicativo. |
| Testes do aplicativo auxiliar | `auxiliar/tests/` | regra-alterada | Marcação por plataforma, FFmpeg falso multiplataforma, testes novos do ramo Windows (D-20). |
| Canal de testes da extensão | `extension/test/suporte/canal-node.ts` | regra-alterada | Ramo `win32` (D-21). |
| Documentação | `auxiliar/README.md` | regra-alterada | Seção de instalação e diagnóstico no Windows. |

Sem mudança: `protocolo.py`, `servidor.py`, `registro.py`, o código da extensão em `extension/src/` e o protocolo 1.

## 6. Delta no modelo de dados

- Resumo das mudanças: nenhum campo novo na configuração; padrões por plataforma para `modelo`, `pasta_de_modelos` e `ffmpeg`; modelo no formato do CTranslate2; pasta do aplicativo, manifesto e entradas de registro no Windows; duas mensagens fixas novas no `diagnostico.log`.
- Detalhe completo em: `_reversa_forward/008-motor-local-windows/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| Registro do host no Chrome e no Brave do Windows | arquivo e registro do Windows | `_reversa_forward/008-motor-local-windows/interfaces/registro-native-messaging-windows.md` |
| Protocolo 1 entre a extensão e o aplicativo auxiliar | mensagens pela entrada e saída padrão | sem mudança; `_reversa_sdd/sdd/motor-transcricao-local.md#8-design-e-interface` |

## 8. Plano de migração

A ordem das fases segue o teste antes do código: cada fase começa pelos testes que a definem.

1. **Fase 0, teste da premissa:** concluída em 2026-10-29 no desktop (`investigation.md#1`).
2. **Fase 1, plataforma:** criar `plataforma.py` e mover para ele o comportamento atual do Mac, sem mudar resultado; as suítes do Mac seguem verdes. Acrescentar a implementação do Windows com os testes que rodam no desktop.
3. **Fase 2, trabalhador do Windows:** `laco_ct2`, escolha de dispositivo, DLLs da NVIDIA, modelos com `model.bin`, padrões de configuração.
4. **Fase 3, decodificação:** MP4 por `fd` e leitura com prazo no Windows; job do host.
5. **Fase 4, instalação:** `motor.cmd`, registro, lançador, pré-requisitos, desinstalação e diagnóstico no Windows.
6. **Fase 5, testes da extensão:** ramo `win32` do `canal-node.ts` e bateria de contrato contra o host real no desktop.
7. **Fase 6, implantação e aceitação no desktop (RF-18):** `git pull`, build da extensão, carregamento no Brave (ação do usuário), `motor.cmd instalar`, diagnóstico, aceitação com mensagem de voz real.
8. **Fase 7, fechamento:** revisão de segurança (`revisor-mv3`), auditoria da spec (`auditor-spec`), reinstalação e diagnóstico no Mac, atualização do `auxiliar/README.md`.

No Mac, a cópia instalada só muda com `auxiliar/motor.sh instalar`; a configuração é preservada. No Windows, a instalação é nova. Quando a feature 007 trocar a `key` pela chave da loja, as duas plataformas precisarão reinstalar o aplicativo auxiliar, porque o identificador da extensão muda.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| `os.kill(pid, 0)` esquecido em algum ponto, matando processos do usuário no Windows | alto | médio | D-09; busca por `os.kill` em `auxiliar/` como item de revisão; teste que cria um processo e confere que `processo_existe` não o encerra. |
| O host, iniciado pelo Brave, não conseguir se associar ao job | médio | baixo | A vigia continua (D-10); a falha vira aviso no `diagnostico.log`; a aceitação confere a morte dos filhos com o host iniciado pelo Brave. |
| Um processo filho herdar a saída do protocolo e corrompê-la | alto | baixo | DT-04 mantido; o trabalhador desvia as saídas para o `diagnostico.log` (D-08); teste de fumaça no Windows que transcreve com bibliotecas ruidosas e confere o enquadramento. |
| Atualização futura do CTranslate2 ou das bibliotecas da NVIDIA exigir a geração 13, sem suporte à Pascal | médio | médio | Fixar no README as versões medidas (`investigation.md#1.1`); a reserva no processador mantém a transcrição se a placa deixar de carregar. |
| Primeiro carregamento frio na placa lento (19,8 s medidos) | baixo | alto | Dentro dos 180 s; o carregamento começa na primeira verificação, antes do primeiro clique (W006). |
| Antivírus do Windows inspecionar ou travar o arquivo temporário do MP4 | baixo | baixo | O arquivo fica na pasta privada do host; falha de abertura vira FALHA_NA_TRANSCRICAO, sem derrubar o motor (W011). |
| Atualização do FFmpeg pelo winget mudar a pasta do pacote | baixo | médio | A configuração guarda o atalho em `WinGet\Links`, estável entre versões (`data-delta.md#1`). |
| Caminho com caractere especial do `cmd.exe` no Python ou no perfil | médio | baixo | A instalação recusa o caminho e o nomeia (D-14). |
| PID de host reaproveitado por outro processo na desinstalação | médio | baixo | Conferência do executável e do instante de criação (D-17). |
| Divergência de comportamento entre as plataformas ao longo do tempo | médio | médio | Núcleo único (D-08); W001 a W024 vigiados nas duas; bateria de contrato da extensão nas duas. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `cross-check.md` (se executado) sem CRITICAL nem HIGH
- [ ] `regression-watch.md` gerado
- [ ] Suítes do aplicativo auxiliar e da extensão sem falha no Mac e no desktop da AFLA, com os testes ignorados explicando a plataforma (RF-16, RF-17)
- [ ] Bateria de contrato da extensão verde contra o host real no desktop (RF-01)
- [ ] Revisão do `revisor-mv3` sem achado de severidade alta em aberto
- [ ] Aceitação manual no Brave do desktop com uma mensagem de voz real (RF-18), seguindo `onboarding.md`
- [ ] Re-extração reversa executada e sem regressão vermelha (recomendado, não obrigatório)

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-10-29 | Versão inicial gerada por `/reversa-plan`, com a Fase 0 já medida no desktop | reversa |
