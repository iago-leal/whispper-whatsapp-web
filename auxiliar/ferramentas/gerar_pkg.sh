#!/usr/bin/env bash
# Gera o instalador do aplicativo auxiliar para macOS com Apple Silicon (RF-07).
#
#   auxiliar/ferramentas/gerar_pkg.sh [destino.pkg]
#
# Sem argumento, grava em extension/dist/instaladores/, de onde a página de boas-vindas oferece o
# download. O pacote instala só na pasta do usuário, sem senha de administrador, e não tem payload:
# leva o motor e a key da extensão na pasta de scripts, e o postinstall roda `motor.sh instalar`,
# que copia o código para ~/Library/Application Support/whispper-motor e registra o host no Chrome.
# Assinatura e notarização ficam de fora (RNF-03, OQ-03).
set -euo pipefail

RAIZ="$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)"
DESTINO="${1:-$RAIZ/extension/dist/instaladores/whispper-macos-apple-silicon.pkg}"
IDENTIFICADOR="com.whispper.motor"
VERSAO="$(sed -n 's/^ *"version": *"\([^"]*\)".*/\1/p' "$RAIZ/extension/manifest.json")"

TRABALHO="$(mktemp -d)"
trap 'rm -rf "$TRABALHO"' EXIT
SCRIPTS="$TRABALHO/scripts"

# O layout do repositório: instalacao.py lê a key em parents[2]/extension/manifest.json.
# Só o que a instalação usa, sem testes nem caches.
mkdir -p "$SCRIPTS/auxiliar/whispper_motor" "$SCRIPTS/extension"
cp "$RAIZ/auxiliar/motor.sh" "$SCRIPTS/auxiliar/"
cp "$RAIZ"/auxiliar/whispper_motor/*.py "$SCRIPTS/auxiliar/whispper_motor/"
cp "$RAIZ/extension/manifest.json" "$SCRIPTS/extension/"
cp "$RAIZ/auxiliar/ferramentas/postinstall.sh" "$SCRIPTS/postinstall"
chmod 755 "$SCRIPTS/postinstall" "$SCRIPTS/auxiliar/motor.sh"

pkgbuild --nopayload --scripts "$SCRIPTS" --identifier "$IDENTIFICADOR" --version "$VERSAO" \
  "$TRABALHO/motor.pkg" >/dev/null

cat >"$TRABALHO/Distribution" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
    <title>Whispper: aplicativo auxiliar</title>
    <options customize="never" require-scripts="false" hostArchitectures="arm64"/>
    <domains enable_anywhere="false" enable_currentUserHome="true" enable_localSystem="false"/>
    <choices-outline>
        <line choice="motor"/>
    </choices-outline>
    <choice id="motor" title="Whispper" visible="false">
        <pkg-ref id="$IDENTIFICADOR"/>
    </choice>
    <pkg-ref id="$IDENTIFICADOR" version="$VERSAO" onConclusion="none">motor.pkg</pkg-ref>
</installer-gui-script>
EOF

mkdir -p "$(dirname -- "$DESTINO")"
productbuild --distribution "$TRABALHO/Distribution" --package-path "$TRABALHO" "$DESTINO" >/dev/null
echo "Instalador gerado em $DESTINO"
