# Onboarding: Motor local no Windows

> Identificador: `008-motor-local-windows`
> Data: `2026-10-29`
> Para quem: quem vai testar a feature pela primeira vez no desktop da AFLA (Windows 11, Brave)
> Os comandos são do PowerShell, salvo indicação; partem da raiz do repositório, `C:\Users\User\dev\whispper-whatsapp-web`.

## 1. O que já está pronto no desktop

Feito em 2026-10-29, durante o plano (`investigation.md#1.1`):

- repositório clonado em `C:\Users\User\dev\whispper-whatsapp-web`;
- ambiente Python em `C:\Users\User\.venvs\whispper-motor`, com o faster-whisper e as bibliotecas da NVIDIA;
- FFmpeg pelo winget, em `%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe`;
- modelo `mobiuslabsgmbh/faster-whisper-large-v3-turbo` no cache do huggingface_hub.

Para preparar outro computador com Windows, os mesmos passos:

```powershell
python -m venv "$env:USERPROFILE\.venvs\whispper-motor"
& "$env:USERPROFILE\.venvs\whispper-motor\Scripts\python.exe" -m pip install faster-whisper nvidia-cublas-cu12 "nvidia-cudnn-cu12>=9,<10"
winget install --id Gyan.FFmpeg --exact --source winget
& "$env:USERPROFILE\.venvs\whispper-motor\Scripts\python.exe" -c "from huggingface_hub import snapshot_download; snapshot_download('mobiuslabsgmbh/faster-whisper-large-v3-turbo')"
```

O download do modelo, de cerca de 1,6 GB, é o único passo com rede, e fica fora do aplicativo.

## 2. Atualizar o código e compilar a extensão

```powershell
git pull --ff-only
cd extension
npm ci
npm run build
cd ..
```

## 3. Carregar a extensão no Brave (ação manual)

1. Abra `brave://extensions` e ligue o **Modo do desenvolvedor**, no canto superior direito.
2. Clique em **Carregar sem compactação** e escolha a pasta `C:\Users\User\dev\whispper-whatsapp-web\extension`, a que contém o `manifest.json`, e não a `dist`.
3. Confira no cartão da extensão o identificador `femjlfnijaboogbcdionddnjcjpfmieg`.

## 4. Instalar o aplicativo auxiliar

```powershell
auxiliar\motor.cmd instalar
```

Saída esperada: a lista de pré-requisitos com `ok` em cada um e, se as bibliotecas da placa faltarem, um aviso dizendo que a transcrição usará o processador. Para conferir o que foi gravado:

```powershell
Get-Item "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\whispper_whatsapp_web.motor"
Get-Item "HKCU:\Software\Google\Chrome\NativeMessagingHosts\whispper_whatsapp_web.motor"
Get-ChildItem "$env:LOCALAPPDATA\whispper-motor"
```

As duas chaves devem ter como valor padrão o caminho de `whispper_whatsapp_web.motor.json`, dentro de `%LOCALAPPDATA%\whispper-motor`.

## 5. Diagnóstico

```powershell
auxiliar\motor.cmd diagnosticar
```

Todos os itens devem sair `ok`. O último deve ser parecido com:

```text
  ok     host: respondeu carregando, depois pronto em 4.1 s (versão 1.1.0, modelo mobiuslabsgmbh/faster-whisper-large-v3-turbo, placa de vídeo)
```

O primeiro carregamento depois de ligar o computador pode levar uns 20 s.

## 6. Primeira transcrição pelo console

1. Em `brave://extensions`, clique em **service worker** no cartão da extensão.
2. No console que abrir, rode:

```js
await motorDiagnostico.verificar()
await motorDiagnostico.transcreverAmostra()
```

A primeira chamada responde `estado: "iniciando"`; repetida alguns segundos depois, `"pronto"`. A segunda devolve `{ ok: true, texto: "Oi, tudo bem? ...", idioma: "pt", ... }`.

## 7. Aceitação com uma mensagem de voz real (RF-18)

1. Abra o WhatsApp Web no Brave e espere 30 s.
2. Num áudio de paciente, clique no botão de transcrever.
3. O texto deve aparecer na janela da extensão. No `desempenho.tsv`, o pedido deve ter `processamento_ms` de no máximo 10 000 por minuto de áudio:

```powershell
Get-Content "$env:LOCALAPPDATA\whispper-motor\desempenho.tsv" -Tail 5
```

## 8. Conferências de privacidade

**Sem rede (RF-06).** Durante uma transcrição, liste as conexões dos processos Python:

```powershell
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object { Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue }
```

A lista deve vir vazia.

**Sem retenção e sem filhos órfãos (RF-07, RF-08).** Envie um MP4 longo para transcrever e, durante a decodificação, encerre o host à força:

```powershell
$pid_host = (Get-ChildItem "$env:LOCALAPPDATA\whispper-motor\hosts").Name
Stop-Process -Id $pid_host -Force
Start-Sleep 5
Get-Process ffmpeg -ErrorAction SilentlyContinue
Get-ChildItem "$env:TEMP" -Filter "whispper-motor-*" -Recurse -File
```

Nenhum `ffmpeg` deve restar, e nenhuma pasta temporária deve conter arquivo.

**Extensão intrusa (RF-09).** Carregue sem compactação a pasta `extension\test\extensao-intrusa`. No console do service worker dela deve aparecer "Access to the specified native messaging host is forbidden.". Remova-a em seguida.

**Registros sem conteúdo (RF-14).** Abra `desempenho.tsv` e `diagnostico.log` na pasta do aplicativo; não pode haver palavra transcrita, nome de arquivo ou trecho de mensagem.

## 9. Reserva no processador (RF-20)

1. Renomeie a pasta das bibliotecas da NVIDIA:

```powershell
Rename-Item "$env:USERPROFILE\.venvs\whispper-motor\Lib\site-packages\nvidia" nvidia.desligada
```

2. Recarregue a extensão em `brave://extensions` e rode `await motorDiagnostico.transcreverAmostra()` no console.
3. A transcrição deve concluir, mais devagar, e o `diagnostico.log` deve ter a linha `modelo carregado no processador: bibliotecas da placa ausentes`.
4. Desfaça a mudança:

```powershell
Rename-Item "$env:USERPROFILE\.venvs\whispper-motor\Lib\site-packages\nvidia.desligada" nvidia
```

## 10. Testes automatizados no Windows (RF-17, RF-01)

```powershell
cd auxiliar
& "$env:USERPROFILE\.venvs\whispper-motor\Scripts\python.exe" -m pytest -q
$env:MOTOR_REAL = "1"; & "$env:USERPROFILE\.venvs\whispper-motor\Scripts\python.exe" -m pytest -q; Remove-Item Env:MOTOR_REAL
cd ..\extension
npm test
$env:MOTOR_REAL = "1"; npm test; Remove-Item Env:MOTOR_REAL
```

Nenhuma falha; cada teste ignorado deve dizer qual plataforma ele exige.

## 11. Desinstalação (RF-12)

```powershell
auxiliar\motor.cmd desinstalar
```

O comando informa o PID do host encerrado, se houver. Depois dele, as duas chaves de registro e a pasta `%LOCALAPPDATA%\whispper-motor` não existem, o cache de modelos continua, e `motorDiagnostico.verificar()` responde `estado: "indisponivel"`. Para voltar a usar, rode `auxiliar\motor.cmd instalar` de novo.

## 12. Mac sem regressão (RF-16)

No Mac, depois do `git pull`:

```bash
auxiliar/motor.sh instalar
auxiliar/motor.sh diagnosticar
cd auxiliar && python3 -m pytest -q && cd ../extension && npm test
```

O diagnóstico deve passar em todos os itens, e as suítes, sem falha.
