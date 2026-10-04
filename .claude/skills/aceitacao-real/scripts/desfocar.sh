#!/usr/bin/env bash
# Gera a cópia desfocada de um print da aceitação, ao lado do original: <nome>-desfocado.png.
# O desfoque apaga o texto das conversas e preserva o contorno das janelas e dos balões.
#
#   desfocar.sh <print.png> [sigma]     (sigma padrão: 40; o 14 de antes deixava texto legível num print de 2400 px)
set -euo pipefail

original="${1:?uso: desfocar.sh <print.png> [sigma]}"
sigma="${2:-40}"
destino="${original%.*}-desfocado.png"

ffmpeg -loglevel error -y -i "$original" -vf "gblur=sigma=$sigma" -frames:v 1 -update 1 "$destino"
echo "$destino"
