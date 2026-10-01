#!/usr/bin/env bash
# Instala o aplicativo auxiliar Whispper para o usuário local (sem senha de root).
set -euo pipefail

PASTA="$(dirname -- "$0")"
echo "=== Instalador do Whispper Auxiliar (Escopo de Usuário) ==="
echo "Registrando o aplicativo auxiliar para o Google Chrome do seu usuário..."
exec "$PASTA/motor.sh" instalar
