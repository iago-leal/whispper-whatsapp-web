#!/usr/bin/env bash
# Verificação completa do whispper-whatsapp-web, com os interpretadores certos.
#
#   verificar.sh            typecheck, testes da extensão, ruff, pytest e build
#   verificar.sh rapido     o mesmo, sem o build
#
# Os testes guardados por ambiente só rodam se a variável vier de fora:
#   WHISPPER_E2E=1   E2E da instalação guiada (instala o auxiliar de verdade na conta)
#   MOTOR_REAL=1     testes com o modelo Whisper real do cache local
#
# Cada etapa grava o registro completo numa pasta temporária; a saída mostra só o resumo e,
# nas falhas, o fim do registro. Sai com 1 se alguma etapa falhar, depois de rodar todas.
set -uo pipefail

RAIZ="$(git -C "$(dirname -- "$0")" rev-parse --show-toplevel)"
PYTHON_PYTEST="${WHISPPER_PYTEST_PYTHON:-/Library/Frameworks/Python.framework/Versions/3.14/bin/python3}"
REGISTROS="$(mktemp -d "${TMPDIR:-/tmp}/verificar.XXXXXX")"
MODO="${1:-completo}"
falhas=0

etapa() {
  local nome="$1" resumo="$2"; shift 2
  local registro="$REGISTROS/$nome.log" inicio=$SECONDS
  if (cd "$RAIZ" && "$@") >"$registro" 2>&1; then
    printf '✓ %-22s %4ss  %s\n' "$nome" $((SECONDS - inicio)) "$(eval "$resumo" <"$registro")"
  else
    printf '✗ %-22s %4ss  %s\n' "$nome" $((SECONDS - inicio)) "$(eval "$resumo" <"$registro")"
    # No node --test, o trecho útil é a lista final de falhas; no resto, o fim do registro.
    if grep -q 'failing tests:' "$registro"; then
      sed -n '/failing tests:/,$p' "$registro" | grep -v '(node:internal/' | head -n 60
    else
      tail -n 40 "$registro"
    fi | sed 's/^/    │ /'
    falhas=$((falhas + 1))
  fi
}

resumo_node='grep -E "^(ℹ|#) (tests|pass|fail|skipped) " | sed -E "s/^(ℹ|#) //" | tr "\n" " "'
resumo_pytest='tail -n 1'
resumo_build='grep -o "Instalador gerado.*" | sed "s#$RAIZ/##"'
resumo_vazio='echo'
resumo_ruff='tail -n 1'

echo "Verificação de $(git -C "$RAIZ" rev-parse --short HEAD)$(git -C "$RAIZ" diff --quiet HEAD || echo '+alterações') · modo $MODO"
[[ "${WHISPPER_E2E:-}" == 1 ]] && echo "  WHISPPER_E2E=1: o E2E vai instalar o aplicativo auxiliar na sua conta"
[[ "${MOTOR_REAL:-}" == 1 ]] && echo "  MOTOR_REAL=1: testes com o modelo real"

etapa typecheck "$resumo_vazio" bash -c 'cd extension && npm run --silent typecheck'
etapa testes-extensao "$resumo_node" bash -c 'cd extension && npm test --silent'
etapa ruff-auxiliar "$resumo_ruff" ruff check --output-format concise auxiliar
if [[ -x "$PYTHON_PYTEST" ]]; then
  etapa pytest-auxiliar "$resumo_pytest" "$PYTHON_PYTEST" -m pytest auxiliar/tests -q -p no:cacheprovider
else
  echo "✗ pytest-auxiliar          Python do python.org ausente em $PYTHON_PYTEST (defina WHISPPER_PYTEST_PYTHON)"
  falhas=$((falhas + 1))
fi

if [[ "$MODO" != rapido ]]; then
  etapa build "$resumo_build" bash -c 'cd extension && npm run --silent build'
  if [[ -d "$RAIZ/extension/dist" ]]; then
    carimbo="$RAIZ/extension/dist/carimbo-build.txt"
    {
      echo "build: $(date '+%Y-%m-%d %H:%M:%S %z')"
      echo "commit: $(git -C "$RAIZ" rev-parse --short HEAD)"
      git -C "$RAIZ" diff --quiet HEAD -- extension auxiliar || echo "alterações não commitadas em extension/ ou auxiliar/"
    } >"$carimbo"
    echo "  carimbo: $(tr '\n' ' ' <"$carimbo")"
  fi
fi

echo "Registros completos em $REGISTROS"
exit $((falhas > 0))
