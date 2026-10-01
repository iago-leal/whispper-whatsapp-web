#!/usr/bin/env bash
# Desinstala o aplicativo auxiliar Whispper do usuário local.
set -euo pipefail

PASTA="$(dirname -- "$0")"
echo "=== Desinstalador do Whispper Auxiliar ==="
echo "Removendo o aplicativo auxiliar e desregistrando do Google Chrome..."
exec "$PASTA/motor.sh" desinstalar
