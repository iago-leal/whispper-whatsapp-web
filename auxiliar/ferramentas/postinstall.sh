#!/bin/bash
# postinstall do instalador macOS (RF-07), copiado por gerar_pkg.sh como Scripts/postinstall.
#
# O Instalador o roda como o próprio usuário, sem senha de administrador, numa pasta temporária que
# traz o motor e a key da extensão no layout do repositório. Registra o aplicativo auxiliar no Chrome
# com `motor.sh instalar` e devolve o código de saída dele: falhando a instalação, o Instalador avisa,
# em vez de declarar sucesso sem nada registrado. O detalhe fica em ~/Library/Logs.
set -uo pipefail

PACOTE="$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd -P)"
LOG="$HOME/Library/Logs/whispper-motor-instalacao.log"
mkdir -p "$(dirname -- "$LOG")"

# O Instalador roda com PATH mínimo; o Python com o mlx-whisper e o ffmpeg estão no PATH do shell de
# login. O marcador separa o PATH de qualquer coisa que os arquivos de perfil escrevam na saída.
CONCHA="$(dscl . -read "/Users/$(id -un)" UserShell 2>/dev/null | awk '{print $2}')"
PATH_DE_LOGIN="$("${CONCHA:-/bin/zsh}" -lc 'printf "\n@PATH@%s\n" "$PATH"' </dev/null 2>/dev/null | sed -n 's/^@PATH@//p')"
export PATH="${PATH_DE_LOGIN:+$PATH_DE_LOGIN:}/opt/homebrew/bin:/usr/local/bin:$PATH"

{
  echo "== $(date '+%Y-%m-%d %H:%M:%S') instalação do aplicativo auxiliar"
  "$PACOTE/auxiliar/motor.sh" instalar
} >>"$LOG" 2>&1
CODIGO=$?
echo "== código de saída: $CODIGO" >>"$LOG"
exit "$CODIGO"
