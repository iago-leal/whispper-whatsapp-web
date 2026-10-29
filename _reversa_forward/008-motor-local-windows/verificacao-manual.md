# Verificação manual do motor local no Windows

> Feature: `008-motor-local-windows`
> Máquina: desktop da AFLA (`afla-desktop`), Windows 11 Pro, Intel i7-11700, 32 GB, GTX 1050 Ti 4 GB
> Ambiente: Python 3.13 em `C:\Users\User\.venvs\whispper-motor`, faster-whisper 1.2.1, CTranslate2 4.8.4, FFmpeg do winget, modelo `mobiuslabsgmbh/faster-whisper-large-v3-turbo`
> Código: clone oficial em `C:\Users\User\dev\whispper-whatsapp-web`, commit `2ebed68`

Os áudios usados aqui são as amostras sintéticas de `amostras/sinteticas/`, geradas por voz do sistema e sem dados pessoais. A amostra longa (`fala-pt-longa.ogg`, 129,3 s) é a `fala-pt.ogg` repetida dez vezes pelo FFmpeg, sem recodificação, e ficou só na pasta da sonda do desktop. O script de medição, `medir_t048.py`, lança o host instalado como o navegador o lança (`cmd.exe /d /s /c` com o lançador, a origem e `--parent-window=0`), pede o estado até `pronto`, transcreve a amostra e, durante o pedido, soma a memória dos processos descendentes a cada 0,2 s e consulta a memória ocupada da placa pelo `nvidia-smi`.

## T048. Instalação, diagnóstico e memória (2026-10-29)

Antes da instalação, nenhum processo Python nem o `whisper-ctranslate2` do usuário estava em execução, e a placa tinha 1,1 GB ocupados pela área de trabalho. Não havia pasta do aplicativo nem entrada no registro.

### Instalação

`auxiliar\motor.cmd instalar` terminou com código 0:

```text
Pré-requisitos:
  ok     Windows de 64 bits: Windows AMD64
  ok     Python 3.11 ou superior: 3.13 em C:\Users\User\.venvs\whispper-motor\Scripts\python.exe
  ok     ffmpeg: C:\Users\User\AppData\Local\Microsoft\WinGet\Links\ffmpeg.EXE
  ok     faster-whisper: importável por C:\Users\User\.venvs\whispper-motor\Scripts\python.exe
  ok     modelo: mobiuslabsgmbh/faster-whisper-large-v3-turbo em C:\Users\User\.cache\huggingface\hub\models--mobiuslabsgmbh--faster-whisper-large-v3-turbo\snapshots\0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf
Interpretador: C:\Users\User\.venvs\whispper-motor\Scripts\python.exe
Identificador da extensão: femjlfnijaboogbcdionddnjcjpfmieg
Gravados:
  C:\Users\User\AppData\Local\whispper-motor (código, config.toml, lançador whispper-motor.bat e manifesto do host)
  HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\whispper_whatsapp_web.motor (Chrome)
  HKEY_CURRENT_USER\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\whispper_whatsapp_web.motor (Brave)
Confira com: auxiliar\motor.cmd diagnosticar
```

Sem aviso sobre a placa, porque as bibliotecas da NVIDIA estão no ambiente.

### O que foi gravado (RF-10, RF-11)

- As duas chaves, a do Brave e a do Chrome, têm como valor padrão `C:\Users\User\AppData\Local\whispper-motor\whispper_whatsapp_web.motor.json`.
- A pasta do aplicativo contém `whispper_motor\`, `config.toml`, `whispper-motor.bat`, `whispper_whatsapp_web.motor.json` e, depois do primeiro host, `hosts\`, `diagnostico.log` e `desempenho.tsv`.
- O manifesto tem `type` `stdio`, `path` no lançador e um único `allowed_origins`, `chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/`.
- O `config.toml` traz o modelo, a pasta de modelos do Hugging Face, o FFmpeg do winget, o `extensao_id` e `ocioso_min = 30`.
- O lançador define `HF_HUB_OFFLINE=1`, `HF_HUB_DISABLE_TELEMETRY=1`, `WHISPPER_MOTOR_PASTA`, `PYTHONPATH`, `PYTHONSAFEPATH=1` e `PYTHONUTF8=1`, e chama o Python do ambiente com `-m whispper_motor %*`. O comentário da primeira linha está na página de código OEM, como o `cmd.exe` o lê.

### Diagnóstico (RF-13)

`auxiliar\motor.cmd diagnosticar` terminou com código 0, todos os itens `ok`:

```text
  ok     registro no Chrome: HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\whispper_whatsapp_web.motor
  ok     registro no Brave: HKEY_CURRENT_USER\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\whispper_whatsapp_web.motor
  ok     manifesto do host: C:\Users\User\AppData\Local\whispper-motor\whispper_whatsapp_web.motor.json
  ok     lançador: C:\Users\User\AppData\Local\whispper-motor\whispper-motor.bat
  ok     allowed_origins: chrome-extension://femjlfnijaboogbcdionddnjcjpfmieg/
  ok     configuração: C:\Users\User\AppData\Local\whispper-motor\config.toml, modelo mobiuslabsgmbh/faster-whisper-large-v3-turbo
  ok     host: respondeu carregando, depois pronto em 6.2 s (versão 1.1.0, modelo mobiuslabsgmbh/faster-whisper-large-v3-turbo); modelo carregado na placa de vídeo
```

### Transcrição na placa e memória (RF-19, RNF de memória)

Com a amostra longa, pelo `medir_t048.py`:

| Medida | Valor |
|--------|-------|
| Percurso do estado | `carregando`, depois `pronto` em 6,7 s |
| Resultado | `resultado`, idioma `pt`, 129,38 s de áudio, 13 280 ms de processamento (9,7 vezes o tempo real), 1 809 caracteres |
| Processo na placa | o trabalhador (PID 16084) aparece em `nvidia-smi --query-compute-apps`; o Windows, no modo WDDM, não informa a memória por processo |
| Memória ocupada da placa | 1 139 MB antes do host, 2 213 MB com o modelo carregado, pico de 2 532 MB durante a transcrição |
| Memória da placa pelo aplicativo | cerca de 1,1 GB com o modelo carregado e 1,4 GB no pico, contra o limite de 3 GB |
| Memória residente do trabalhador | pico de 2 108 MB, no carregamento; 370 MB com o modelo na placa e 390 MB depois do pedido |
| Memória residente do host | 31 MB pronto; pico de 357 MB durante o pedido, com o áudio e as amostras decodificadas |
| Soma dos picos residentes | cerca de 2,5 GB (lançador do ambiente 4 MB, host 357 MB, trabalhador 2 108 MB), contra o limite de 4 GB |
| Memória privada comprometida | trabalhador com pico de 2 748 MB; host com 502 MB já pronto, quase todo sem residência, e pico de 829 MB; maior soma simultânea amostrada de 3 206 MB |
| Código de saída no fim da entrada | 0 |

Os dois limites do requisito de memória foram atendidos, tanto pela memória residente quanto pela comprometida. Esta última fica mais perto do teto, com folga de cerca de 0,8 GB na soma amostrada; a medição da T049 no processador mostrou a causa e levou a uma correção, que a reduziu também aqui (ver adiante). O FFmpeg não chegou a ser visto pela amostragem, porque a decodificação durou menos que um intervalo.

### Registros sem conteúdo e sem resíduo (RF-14)

O `diagnostico.log` registrou, para cada host, só `host iniciado, versão 1.1.0`, `modelo carregado na placa de vídeo` e `host encerrado`, em UTF-8. O `desempenho.tsv` registrou dois carregamentos (5 844 ms e 6 089 ms) e um pedido (129,4 s, 13 280 ms, `ok`). A busca por palavras do texto transcrito nos dois arquivos não achou nada. Depois do encerramento, a pasta `hosts\` ficou vazia, e não restou pasta `whispper-motor-*` na pasta temporária do usuário.

## T049. Reserva no processador (2026-10-29)

As bibliotecas da NVIDIA foram tiradas do alcance do aplicativo renomeando `C:\Users\User\.venvs\whispper-motor\Lib\site-packages\nvidia` para `nvidia.t049-fora`, com a volta garantida por um `finally` do PowerShell. O ambiente não tem `CUDA_PATH` nem pasta da NVIDIA no PATH, de modo que nenhuma outra cópia das bibliotecas podia ser achada.

### Sem as bibliotecas (RF-20)

- `auxiliar\motor.cmd diagnosticar` saiu com todos os itens `ok` e com `host: respondeu carregando, depois pronto em 12.7 s (versão 1.1.0, modelo mobiuslabsgmbh/faster-whisper-large-v3-turbo); modelo carregado no processador: bibliotecas da placa ausentes`.
- O `diagnostico.log` registrou `aviso modelo carregado no processador: bibliotecas da placa ausentes`, sem conteúdo de mensagem.
- A amostra longa foi transcrita: idioma `pt`, 129,38 s de áudio em 38 766 ms (3,3 vezes o tempo real), com os mesmos 1 809 caracteres da transcrição na placa.
- A placa ficou de fora: a memória ocupada dela variou de 1 081 MB para no máximo 1 090 MB, e nenhum processo do host apareceu no `nvidia-smi`.

### De volta à placa

Com a pasta devolvida, `auxiliar\motor.cmd diagnosticar` saiu com `pronto em 6.7 s` e `modelo carregado na placa de vídeo`, e o `diagnostico.log` registrou `info modelo carregado na placa de vídeo`. A escolha vale só até o carregamento seguinte, como pede o RF-20.

### Memória no processador e correção

No processador, a memória residente ficou baixa (pico de 1 889 MB no trabalhador, no carregamento, e 998 MB com o modelo carregado), mas a soma da memória comprometida chegou a 4 637 MB, acima dos 4 GB do requisito. O host comprometia 502 MB tendo só 31 MB residentes, o que apontou para a OpenBLAS do numpy. Um teste isolado no ambiente confirmou: a importação do numpy compromete 499 MB com as 16 linhas lógicas do i7-11700 e 17 MB com `OPENBLAS_NUM_THREADS=1`. O host e o trabalhador importam o numpy, e nenhum dos dois usa a OpenBLAS na transcrição, que roda no CTranslate2.

A correção, no commit `9463182`, acrescenta `set "OPENBLAS_NUM_THREADS=1"` ao `whispper-motor.bat`, com o teste do lançador em `test_instalacao_windows.py` escrito antes (vermelho, depois verde). O pytest passou nas duas plataformas: 197 aprovados e 21 ignorados no desktop, 179 aprovados e 39 ignorados no Mac. Para conferir que a variável não atrasa o CTranslate2, a amostra `fala-pt.ogg` foi transcrita no processador, com `int8` e 8 linhas, quatro vezes, alternando sem e com a variável: 9,5 s, 9,5 s, 9,5 s e 9,7 s.

Depois de reinstalar com o lançador novo:

| Modo | Pronto | Pedido de 129,4 s | Pico residente somado (amostrado) | Pico comprometido somado (amostrado) | Placa no pico |
|------|--------|-------------------|-----------------------------------|--------------------------------------|---------------|
| Placa, antes | 6,7 s | 13 280 ms | 588 MB | 3 206 MB | 2 532 MB |
| Placa, depois | 7,2 s | 13 343 ms | 727 MB | 2 209 MB | 2 467 MB |
| Processador, antes | 12,7 s | 38 766 ms | 1 387 MB | 4 637 MB | sem uso |
| Processador, depois | 12,7 s | 39 285 ms | 1 380 MB | 3 675 MB | sem uso |

O host passou a comprometer 20 MB, em vez de 502 MB, e o trabalhador, cerca de 480 MB a menos. Os dois limites do requisito de memória ficam atendidos nos dois modos, também pela memória comprometida.

### Ocorrência durante a medição: prazo estourado no processador

Na primeira medição depois da correção, no processador, o carregamento levou 28,1 s, e o pedido de 129,4 s foi interrompido pelo prazo de 64,7 s (o maior entre 60 s e 30 s por minuto de áudio): o `diagnostico.log` registrou `aviso trabalhador encerrado por prazo`, o `desempenho.tsv` registrou `FALHA_NA_TRANSCRICAO` aos 66 163 ms, e o host seguinte carregou normalmente. Logo depois, o contador do processador marcava entre 96% e 99% de uso, e alguns segundos mais tarde estava ocioso, o que indica carga passageira de outro programa. Repetida com o desktop entre 10% e 14% de carga, a medição terminou em 39 285 ms, como antes da correção. O episódio confirma, de passagem, o comportamento do RF-05 diante do prazo, mas mostra também que, no processador, a folga do prazo é de cerca de 1,6 vez o tempo de transcrição com a máquina livre. O requisito não fixa meta de tempo para o modo de reserva, e o prazo é comum ao Mac; fica como observação para o relatório final.
