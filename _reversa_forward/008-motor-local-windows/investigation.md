# Investigation: Motor local no Windows

> Identificador: `008-motor-local-windows`
> Data: `2026-10-29`
> Requirements: `_reversa_forward/008-motor-local-windows/requirements.md`
> Confidência: 🟢 CONFIRMADO (medido ou lido no código), 🟡 INFERIDO (documentação ou analogia), 🔴 LACUNA

## 1. Sonda no desktop da AFLA (Fase 0, concluída em 2026-10-29)

O teste da premissa rodou antes do plano, no próprio desktop, só com amostras sintéticas: as de `amostras/sinteticas/` e uma fala de 49,7 s gerada no Mac com a voz Luciana, de texto inventado no estilo de uma mensagem de paciente. Nenhum áudio real saiu do Mac. Os scripts ficaram fora do repositório, em `C:\Users\User\sonda-008\`.

### 1.1 Ambiente instalado

| Item | Versão ou local | Confidência |
|------|-----------------|-------------|
| Ambiente virtual | `C:\Users\User\.venvs\whispper-motor`, sobre o Python 3.13.15 | 🟢 |
| faster-whisper | 1.2.1 | 🟢 |
| CTranslate2 | 4.8.4 | 🟢 |
| Bibliotecas da NVIDIA (pip) | `nvidia-cublas-cu12` 12.9.2.10, `nvidia-cudnn-cu12` 9.27.0.42, `nvidia-cuda-nvrtc-cu12` 12.9.86 | 🟢 |
| Decodificador (FFmpeg) | 9.0.2, build da gyan.dev pelo winget (`Gyan.FFmpeg`), atalho em `%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe` | 🟢 |
| Modelo | `mobiuslabsgmbh/faster-whisper-large-v3-turbo`, revisão `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf`, o repositório que `faster_whisper.utils._MODELS` associa a `large-v3-turbo` | 🟢 |
| Driver de vídeo | 582.28 | 🟢 |

### 1.2 Tipos de cálculo disponíveis

| Dispositivo | Tipos aceitos pelo CTranslate2 | Observação | Confidência |
|-------------|--------------------------------|------------|-------------|
| Placa (CUDA, GTX 1050 Ti) | `float32`, `int8`, `int8_float32` | `int8_float16` recusado: a arquitetura Pascal não faz meia precisão eficiente | 🟢 |
| Processador (i7-11700) | `float32`, `int16`, `int8`, `int8_float32` | | 🟢 |

### 1.3 Medições

Tempo de processamento com o modelo carregado, melhor de três execuções no áudio de 49,7 s e execução única nos demais. "s/min" normaliza para um minuto de áudio.

| Configuração | Carregamento | Memória da placa | 49,7 s (s/min) | 12,9 s em pt | 8,3 s em en | 10 s de silêncio |
|--------------|-------------:|-----------------:|---------------:|-------------:|------------:|-----------------:|
| Placa, `int8`, busca gulosa | 19,8 s (frio), 3,9 s (quente) | 1 101 MB | 4,97 s (6,0) | 2,89 s | 2,76 s | 2,64 s |
| Placa, `int8`, feixe de 5 | 3,9 s | 1 053 MB | 5,57 s (6,7) | 2,97 s | 2,76 s | 2,56 s |
| Processador, `int8`, 8 linhas, busca gulosa | 6,7 s | n/a | 14,21 s (17,2) | 9,39 s | 9,32 s | 9,23 s |

- 🟢 A meta de 10 s por minuto é cumprida na placa, com folga: 6,0 s/min. No processador, 17,2 s/min, acima da meta, o que confirma o papel de reserva.
- 🟢 Áudios curtos custam uma janela de 30 s inteira: cerca de 2,7 s na placa e 9 s no processador, qualquer que seja a duração abaixo de 30 s.
- 🟢 Idioma detectado certo nos três casos com fala: "pt", "pt" e "en".
- 🟢 Qualidade: a fala de 49,7 s saiu idêntica ao texto de referência, salvo um "ou" inserido ("ou o senhor consegue renovar") e números escritos em algarismos ("500 mg", "36,5", "12 por 8"). Nomes de remédios (dipirona, ibuprofeno, losartana) corretos.
- 🟢 No silêncio digital, o modelo inventa "Thank you." em todas as configurações. É o mesmo defeito já tratado no Mac pelo filtro de energia na faixa da voz (DT-14, `texto_com_fala` em `trabalhador.py`), que precisa ser aplicado também aqui.
- 🟢 O feixe de 5 custa 12% a mais no áudio longo e não melhorou o texto além de escrever "miligramas" por extenso. Fica a busca gulosa, a mesma do Mac (o `transcribe` do mlx-whisper, chamado sem `beam_size`, usa busca gulosa).

### 1.4 Arquivo temporário do MP4 e morte do host

| Teste | Resultado | Confidência |
|-------|-----------|-------------|
| `-i fd:0` com o arquivo como entrada padrão | recusado pelo FFmpeg 9: "Doesn't support pass file descriptor via URL, please set it via -fd {num}" | 🟢 |
| `-fd 0 -i fd:` com `tempfile.TemporaryFile` como entrada padrão | 49,71 s decodificados, código 0; o arquivo tem nome na pasta enquanto aberto e some ao fechar | 🟢 |
| Pai morto à força, sem job | o FFmpeg continua vivo, segurando o arquivo, que só some quando o FFmpeg morre | 🟢 |
| Pai morto à força, dentro de um job com `KILL_ON_JOB_CLOSE` criado por ele mesmo | o FFmpeg morre junto, e o arquivo some | 🟢 |
| `-timelimit 120` no Windows | aceito, código 0; sem efeito conhecido nessa plataforma | 🟢 |
| `os.getppid()` e `os.getuid` | o primeiro existe; o segundo não existe no Windows | 🟢 |

## 2. Achados no código que impedem rodar no Windows

| Ponto | Onde | Por que falha | Confidência |
|-------|------|---------------|-------------|
| `os.kill(pid, 0)` para saber se um processo existe | `_processo_existe` em `__main__.py`; `test_audio.py`, `test_trabalhador.py` | No Windows, qualquer sinal diferente de `CTRL_C_EVENT` e `CTRL_BREAK_EVENT` chama `TerminateProcess`: a sonda de existência **mata** o processo. Como a varredura de pastas órfãs e o registro de hosts usam PIDs lidos de nomes de arquivo, o host mataria processos arbitrários do usuário. | 🟢 (documentação do Python, `os.kill`) |
| `st_uid` e `os.getuid()` | `varrer_temporarios_orfaos` em `__main__.py` | `os.getuid` não existe no Windows (sonda 1.4) e lança `AttributeError`. | 🟢 |
| `/dev/fd/N` com `pass_fds` | `_decodificar_por_arquivo` em `audio.py` | Não existe no Windows; substituído por `-fd 0 -i fd:` (sonda 1.4). | 🟢 |
| `selectors` sobre pipe | `_ler_saida` em `audio.py`; `select.select` em `_ler_exato` de `instalacao.py` | No Windows, `select` só aceita sockets. | 🟢 |
| `signal.SIGKILL`, `/bin/ps`, `/usr/bin/pgrep` | `encerrar_hosts`, `_host_vivo`, `_filhos` em `instalacao.py` | Não existem no Windows. | 🟢 |
| Pasta do aplicativo e manifesto do host | `PASTA_PADRAO` em `__main__.py`; `caminho_manifesto_host` em `instalacao.py` | Caminhos do macOS; no Windows, o registro do host é uma entrada do registro do sistema. | 🟢 |
| Lançador `#!/bin/sh` com `exec` | `_texto_do_lancador` em `instalacao.py` | O navegador no Windows inicia `.bat`, `.cmd` ou `.exe`. | 🟢 |
| Escolha do Python pelo `mlx_whisper` | `auxiliar/motor.sh`, `canal-node.ts` | Não há `bash` nem `mlx_whisper` no Windows. | 🟢 |
| Pré-requisito "Mac com Apple Silicon" | `conferir_prerequisitos` em `instalacao.py` | Recusa qualquer Windows. | 🟢 |
| Pesos do modelo | `ARQUIVOS_DE_PESOS` em `modelos.py` | O CTranslate2 guarda os pesos em `model.bin`. | 🟢 |

Pontos que já funcionam no Windows sem mudança: o enquadramento do protocolo (`protocolo.py`), o servidor e a fila (`servidor.py`), os registros (`registro.py`, em que `os.open` com 0o600 só afeta o atributo de somente leitura), a configuração em TOML, a vigia do trabalhador pelo sentinela do multiprocessing e por `os.getppid` (sonda 1.4) e o tratamento dos argumentos do host, que já lê só `argv[0]` e ignora os demais.

## 3. Native Messaging no Windows

- 🟢 O Chrome procura o host em `HKCU\Software\Google\Chrome\NativeMessagingHosts\<nome>` e depois em `HKLM`; o valor padrão da chave é o caminho do manifesto JSON. O `path` do manifesto pode ser absoluto. O host é iniciado por meio do `cmd.exe` e recebe a origem como primeiro argumento e `--parent-window=<identificador>` como segundo. Fonte: <https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging>.
- 🟢 O Brave lê a chave própria `HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\<nome>`: Bitwarden e Granola estão registrados nela no desktop, e funcionam no Brave.
- 🟡 O Python 3 abre a entrada e a saída padrão em modo binário no Windows, mas o host fixará o modo com `msvcrt.setmode` antes de ler, porque um único `\r\n` traduzido corromperia o enquadramento de 4 bytes.

## 4. Placa de vídeo

- 🟢 A GTX 1050 Ti é da arquitetura Pascal (capacidade de cálculo 6.1). O CTranslate2 4.8.4 a reconhece e oferece `int8` nela (sonda 1.2).
- 🟡 A geração 13 das bibliotecas CUDA retirou o suporte às arquiteturas Maxwell, Pascal e Volta, e a NVIDIA anunciou a série R580 do driver como a última a suportá-las. O driver do desktop, 582.28, é dessa série. Consequência: as bibliotecas ficam presas à geração 12 (`nvidia-*-cu12`), e um CTranslate2 futuro que exija a geração 13 não servirá a esta placa. Fontes: notas de versão do CUDA 13.0 (<https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/>) e o aviso da NVIDIA sobre o fim do suporte a essas arquiteturas.
- 🟢 As bibliotecas da NVIDIA vêm do pip, sem instalar o CUDA Toolkit e sem administrador. O processo precisa achar as DLLs em `site-packages\nvidia\<pacote>\bin`; a sonda as registrou com `os.add_dll_directory` e no `PATH` antes de importar o CTranslate2, e funcionou.
- 🟢 Memória da placa: 1,1 GB com o modelo carregado, dos 4 GB, folga suficiente para o navegador e a tela.

## 5. Encerramento dos processos filhos

- 🟢 No Mac, a morte do host derruba o FFmpeg pelo `-timelimit` (limite de CPU) e o trabalhador pela vigia. No Windows, o `-timelimit` não tem efeito, e um FFmpeg órfão segura o arquivo temporário (sonda 1.4).
- 🟢 Um job do Windows com `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, ao qual o host se associa ao iniciar, resolve os dois casos. Os filhos criados depois entram no job automaticamente; quando o host morre, de qualquer forma, o sistema fecha o último identificador do job e encerra todos os processos dele. O arquivo temporário, aberto com apagamento no fechamento, some em seguida. Fonte: <https://learn.microsoft.com/windows/win32/procthread/job-objects>.
- 🟡 A sonda criou o job a partir de uma sessão SSH. Iniciado pelo Brave, o host pode já estar num job do navegador; o Windows 8 em diante admite jobs aninhados, mas isso só se confirma com o host iniciado pelo próprio Brave (ação de aceitação).
- 🟡 No Windows, o `python.exe` de um ambiente virtual é um lançador que inicia o Python base como processo filho. O PID que o host registra em `hosts\` é o do Python base, que é quem lê a entrada; o lançador termina quando ele termina.

## 6. Alternativas avaliadas

| Alternativa | Por que não | Confidência |
|-------------|-------------|-------------|
| Ponte até o Mac pela rede privada | Descartada pelo usuário: depende do MacBook ligado, e o áudio sai do desktop. | 🟢 |
| Esperar o motor no navegador (feature 007) | Descartada pelo usuário; a 007 está pausada. | 🟢 |
| whisper.cpp | Exigiria outro empacotamento (binário nativo e modelo GGML) e outra resolução de modelo; o faster-whisper reaproveita o Python, o ambiente de testes e o padrão de trabalhador em processo separado. A spec de compatibilidade deixava as duas em aberto (OQ-02); o usuário escolheu o faster-whisper. | 🟢 |
| Whisper original em PyTorch | Pacote de vários GB e mais lento que o CTranslate2 na mesma placa; sem `int8` eficiente em Pascal. | 🟡 |
| ONNX Runtime com DirectML | Serviria a placas de outros fabricantes, fora do escopo; menos maduro para o Whisper com detecção de idioma. | 🟡 |
| Rodar o host no Ubuntu do WSL | Depende de o WSL estar acordado, acrescenta o `wsl.exe` no caminho da entrada e da saída padrão e não serve a um usuário Windows comum. | 🟡 |
| Decodificar o MP4 em memória com o PyAV, já instalado pelo faster-whisper | Tiraria o arquivo temporário, mas levaria a decodificação de dados hostis para dentro do host, sem o prazo e a morte isolada que o FFmpeg em processo separado garante. | 🟡 |
| Arquivo temporário com nome comum, apagado depois e varrido no início seguinte | Deixaria o áudio no disco depois de uma morte forçada até o próximo host iniciar, contra o RF-07. A sonda 1.4 mostrou um caminho melhor. | 🟢 |

## 7. Referências

- Native Messaging: <https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging>
- `os.kill` no Windows: <https://docs.python.org/3/library/os.html#os.kill>
- `tempfile.TemporaryFile` e `O_TEMPORARY`: <https://docs.python.org/3/library/tempfile.html>
- Job objects: <https://learn.microsoft.com/windows/win32/procthread/job-objects>
- Quantização no CTranslate2: <https://opennmt.net/CTranslate2/quantization.html>
- faster-whisper: <https://github.com/SYSTRAN/faster-whisper>
- Modelo: <https://huggingface.co/mobiuslabsgmbh/faster-whisper-large-v3-turbo>
- Protocolo `fd` do FFmpeg: <https://ffmpeg.org/ffmpeg-protocols.html#fd>
- Builds do FFmpeg para Windows: <https://www.gyan.dev/ffmpeg/builds/>
