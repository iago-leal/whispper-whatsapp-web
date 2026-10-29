@echo off
rem Instala, desinstala ou diagnostica o aplicativo auxiliar do whispper-whatsapp-web no Windows (D-15).
rem
rem   auxiliar\motor.cmd instalar ^| desinstalar ^| diagnosticar
rem
rem Roda no interpretador que importa o faster-whisper: o de WHISPPER_PYTHON, se definido;
rem senão, o do ambiente em %%USERPROFILE%%\.venvs\whispper-motor, se existir; senão, o primeiro
rem python do PATH que o importe; senão, o primeiro encontrado, e a instalação recusa nomeando
rem a falta. Nada aqui acessa a rede. As mensagens deste arquivo não levam acento: o cmd.exe o
rem lê na página de código do console, e não em UTF-8.
setlocal EnableExtensions DisableDelayedExpansion

set "AUXILIAR=%~dp0"
set "AUXILIAR=%AUXILIAR:~0,-1%"
set "HF_HUB_OFFLINE=1"
set "HF_HUB_DISABLE_TELEMETRY=1"

set "PYTHON="
if defined WHISPPER_PYTHON (
  set "PYTHON=%WHISPPER_PYTHON%"
  goto :conferir
)
set "AMBIENTE=%USERPROFILE%\.venvs\whispper-motor\Scripts\python.exe"
if exist "%AMBIENTE%" (
  set "PYTHON=%AMBIENTE%"
  goto :conferir
)
set "PRIMEIRO="
for /f "delims=" %%p in ('where python 2^>nul') do (
  if not defined PRIMEIRO set "PRIMEIRO=%%p"
  "%%p" -c "import faster_whisper" >nul 2>&1 && (
    set "PYTHON=%%p"
    goto :conferir
  )
)
rem Nenhum importa o faster-whisper: segue com o primeiro, e a instalação recusa nomeando a falta.
set "PYTHON=%PRIMEIRO%"

:conferir
if not defined PYTHON (
  echo motor.cmd: nenhum Python encontrado; defina WHISPPER_PYTHON com o interpretador que tem o faster-whisper. 1>&2
  exit /b 1
)
"%PYTHON%" -c "import sys; sys.exit(sys.version_info < (3, 11))" >nul 2>&1
if errorlevel 1 (
  echo motor.cmd: "%PYTHON%" precisa ser um Python 3.11 ou superior; defina WHISPPER_PYTHON com outro interpretador. 1>&2
  exit /b 1
)

set "PYTHONPATH=%AUXILIAR%"
set "PYTHONSAFEPATH=1"
"%PYTHON%" -m whispper_motor.instalacao %*
exit /b %errorlevel%
