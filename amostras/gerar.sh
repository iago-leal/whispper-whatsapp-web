#!/usr/bin/env bash
# Gera as amostras sintéticas de áudio usadas pelos testes (DT-18).
# Requer macOS (comando `say`) e ffmpeg com libopus, libmp3lame e aac.
# As amostras não contêm dados pessoais e são versionadas em amostras/sinteticas/.
set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
SAIDA="$AQUI/sinteticas"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

FFMPEG="${FFMPEG:-$(command -v ffmpeg)}"
ff() { "$FFMPEG" -hide_banner -loglevel error -y "$@"; }

# Primeira voz disponível de uma lista de preferência.
escolher_voz() {
  local voz
  for voz in "$@"; do
    if say -v '?' | grep -q "^${voz} "; then
      echo "$voz"
      return 0
    fi
  done
  echo "nenhuma das vozes disponível: $*" >&2
  return 1
}

VOZ_PT="$(escolher_voz Luciana Flo Eddy)"
VOZ_EN="$(escolher_voz Samantha Daniel Karen)"

TEXTO_PT="Oi, tudo bem? Estou mandando este áudio para confirmar a reunião de amanhã às dez horas. Traga os documentos do contrato e a planilha de custos atualizada. Qualquer dúvida, me liga."
TEXTO_EN="Hello, this is a short test message to check automatic language detection in the local transcription engine. Please call me back tomorrow morning."

mkdir -p "$SAIDA"

say -v "$VOZ_PT" -o "$TMP/fala-pt.aiff" "$TEXTO_PT"
say -v "$VOZ_EN" -o "$TMP/fala-en.aiff" "$TEXTO_EN"

# Mensagem de voz no formato do WhatsApp: Ogg com Opus, mono, 16 kHz.
opus() { ff -i "$1" -ac 1 -ar 16000 -c:a libopus -b:a 24k "$2"; }

opus "$TMP/fala-pt.aiff" "$SAIDA/fala-pt.ogg"
opus "$TMP/fala-en.aiff" "$SAIDA/fala-en.ogg"
ff -i "$TMP/fala-pt.aiff" -ac 1 -ar 22050 -c:a libmp3lame -b:a 64k "$SAIDA/fala-pt.mp3"
# MP4 com o índice no fim do arquivo, como sai por padrão: exige leitura com posicionamento.
ff -i "$TMP/fala-pt.aiff" -ac 1 -ar 22050 -c:a aac -b:a 64k "$SAIDA/fala-pt.m4a"

ff -f lavfi -i "anullsrc=r=16000:cl=mono" -t 10 -c:a libopus -b:a 24k "$SAIDA/silencio.ogg"
ff -f lavfi -i "anoisesrc=r=16000:color=brown:amplitude=0.05:seed=7" -t 10 -ac 1 -c:a libopus -b:a 24k "$SAIDA/ruido.ogg"

# Arquivo com cabeçalho Ogg válido e corpo corrompido, e arquivo vazio.
head -c 64 "$SAIDA/fala-pt.ogg" > "$SAIDA/corrompido.ogg"
LC_ALL=C awk 'BEGIN { srand(42); for (i = 0; i < 4096; i++) printf "%c", int(rand() * 256) }' >> "$SAIDA/corrompido.ogg"
: > "$SAIDA/vazio.ogg"

echo "vozes: pt=$VOZ_PT en=$VOZ_EN"
echo "amostras geradas em $SAIDA"
