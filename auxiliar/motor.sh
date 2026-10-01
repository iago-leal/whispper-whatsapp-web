#!/usr/bin/env bash
# Instala, desinstala ou diagnostica o aplicativo auxiliar do whispper-whatsapp-web (DT-07).
#
#   auxiliar/motor.sh instalar | desinstalar | diagnosticar
#
# Roda no interpretador que importa o mlx-whisper: o de WHISPPER_PYTHON, se definido;
# senão, o da primeira linha do executável mlx_whisper do PATH, ou o python3 do PATH.
# Nada aqui acessa a rede.
set -euo pipefail

PASTA="$(dirname -- "$0")"
AUXILIAR="$(CDPATH='' cd -- "$PASTA" && pwd -P)"

export HF_HUB_OFFLINE=1
export HF_HUB_DISABLE_TELEMETRY=1

interpretador_do_mlx_whisper() {
  local executavel primeira
  executavel="$(command -v mlx_whisper)" || return 0
  primeira="$(head -n 1 "$executavel")"
  case "$primeira" in
    '#!/bin/sh'*)
      # Caminho com espaço ou longo demais: o pip reexecuta o Python na segunda linha.
      sed -n "2s/^'''exec' \"\\([^\"]*\\)\".*/\\1/p" "$executavel" ;;
    '#!/usr/bin/env '*)
      command -v "${primeira#'#!/usr/bin/env '}" || true ;;
    '#!'*)
      primeira="${primeira#'#!'}"
      echo "${primeira%% *}" ;;
  esac
}

importa_mlx_whisper() {
  "$1" -c 'import mlx_whisper' >/dev/null 2>&1
}

escolher_python() {
  local candidato primeiro=''
  if [[ -n "${WHISPPER_PYTHON:-}" ]]; then
    echo "$WHISPPER_PYTHON"
    return 0
  fi
  for candidato in "$(interpretador_do_mlx_whisper)" "$(command -v python3 || true)"; do
    [[ -n "$candidato" && -x "$candidato" ]] || continue
    if importa_mlx_whisper "$candidato"; then
      echo "$candidato"
      return 0
    fi
    [[ -n "$primeiro" ]] || primeiro="$candidato"
  done
  # Nenhum importa o mlx-whisper: segue com o primeiro, e a instalação recusa nomeando a falta.
  echo "$primeiro"
}

PYTHON="$(escolher_python)"
if [[ -z "$PYTHON" ]]; then
  echo "motor.sh: nenhum Python encontrado; defina WHISPPER_PYTHON com o interpretador em que o mlx-whisper está instalado." >&2
  exit 1
fi
if ! "$PYTHON" -c 'import sys; sys.exit(sys.version_info < (3, 11))' >/dev/null 2>&1; then
  echo "motor.sh: $PYTHON não existe ou não é Python 3.11 ou superior; defina WHISPPER_PYTHON com o interpretador em que o mlx-whisper está instalado." >&2
  exit 1
fi

export PYTHONPATH="$AUXILIAR${PYTHONPATH:+:$PYTHONPATH}"
export PYTHONSAFEPATH=1
exec "$PYTHON" -m whispper_motor.instalacao "$@"
