#!/usr/bin/env bash
# PostToolUse (Edit|Write): verificação estática do arquivo recém-editado.
#   extension/**/*.ts  -> typecheck do projeto inteiro (tsconfig.test.json, cerca de 0,7 s no TS 7)
#   auxiliar/**/*.py   -> ruff só no arquivo
# Saída 2 devolve o erro ao Claude; qualquer outro caso passa calado.
set -uo pipefail

arquivo=$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')
raiz="${CLAUDE_PROJECT_DIR:-$(pwd)}"

case "$arquivo" in
  "$raiz"/extension/node_modules/* | "$raiz"/extension/dist/*)
    exit 0 ;;
  "$raiz"/extension/*.ts)
    if ! saida=$(cd "$raiz/extension" && ./node_modules/.bin/tsc -p tsconfig.test.json --pretty false 2>&1); then
      echo "typecheck da extensão falhou depois de editar ${arquivo#"$raiz"/}:" >&2
      echo "$saida" | head -30 >&2
      exit 2
    fi ;;
  "$raiz"/auxiliar/*.py)
    if ! saida=$(ruff check --quiet --output-format concise "$arquivo" 2>&1); then
      echo "ruff acusou problemas em ${arquivo#"$raiz"/}:" >&2
      echo "$saida" | head -30 >&2
      exit 2
    fi ;;
esac
exit 0
