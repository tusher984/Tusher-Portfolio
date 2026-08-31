#!/bin/bash
# ==========================================================================
# Build the web-sized copies of every photograph, plus the manifest the site
# reads to write its srcset attributes.
#
#   ./tools/optimize-images.sh                 resize everything, then write
#                                              assets/img/opt/manifest.json
#   ./tools/optimize-images.sh --manifest-only rebuild the manifest from the
#                                              files already in opt/
#
# Run it from anywhere; it works on the repository it lives in. It needs only
# sips, which every Mac already has — no Homebrew, no npm, no Python.
#
# Why this exists: the camera originals in assets/img are 5–15 MB each. They
# are the archive and they stay in the repository, but nothing on the site
# ever links to them. Every <img> points at a copy from assets/img/opt.
#
# Run it after adding photographs through the dashboard, then commit both the
# new originals and the new files in assets/img/opt.
# ==========================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

SRC="assets/img"
OUT="assets/img/opt"
EDGES="480 960 1600"   # longest edge, in pixels
QUALITY=72             # JPEG quality, 1-100

MANIFEST_ONLY=0
[ "${1:-}" = "--manifest-only" ] && MANIFEST_ONLY=1

mkdir -p "$OUT"

# "1600 1067" for a file, straight out of sips.
dims() {
  sips -g pixelWidth -g pixelHeight "$1" 2>/dev/null |
    awk '/pixelWidth/ {w=$2} /pixelHeight/ {h=$2} END {print w, h}'
}

entries=""
made=0
kept=0

for src in "$SRC"/*.jpg "$SRC"/*.jpeg "$SRC"/*.JPG "$SRC"/*.png; do
  [ -e "$src" ] || continue

  name="$(basename "$src")"
  base="${name%.*}"

  read -r origw origh <<EOF
$(dims "$src")
EOF
  case "$origw$origh" in ''|*[!0-9]*) echo "skipped $name (no dimensions)"; continue;; esac

  long="$origw"
  [ "$origh" -gt "$long" ] && long="$origh"

  variants=""
  count=0
  bigw=""
  bigh=""

  for edge in $EDGES; do
    dst="$OUT/$base-$edge.jpg"

    if [ "$MANIFEST_ONLY" -eq 1 ]; then
      [ -f "$dst" ] || break
      kept=$((kept + 1))
    else
      sips -Z "$edge" -s format jpeg -s formatOptions "$QUALITY" \
           "$src" --out "$dst" >/dev/null
      made=$((made + 1))
    fi

    read -r w h <<EOF
$(dims "$dst")
EOF
    variants="$variants,[$w,$h,\"$dst\"]"
    count=$((count + 1))
    bigw="$w"
    bigh="$h"

    # One copy at full size is enough: past the original's longest edge every
    # further pass would write the same pixels under a bigger name.
    [ "$edge" -ge "$long" ] && break
  done

  [ -n "$variants" ] || continue
  entries="$entries,\"$src\":{\"w\":$bigw,\"h\":$bigh,\"v\":[${variants#,}]}"
  printf '%-56s %5s x %-5s -> %s copies\n' "$name" "$origw" "$origh" "$count"
done

printf '{%s}\n' "${entries#,}" > "$OUT/manifest.json"

echo
if [ "$MANIFEST_ONLY" -eq 1 ]; then
  echo "manifest rebuilt from $kept existing files"
else
  echo "$made copies written to $OUT"
fi
echo "wrote $OUT/manifest.json ($(wc -c < "$OUT/manifest.json" | tr -d ' ') bytes)"
