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
# Run it from anywhere; it works on the repository it lives in.
#
# It runs in two places and must behave identically in both: on a Mac, where
# sips is already installed, and on the GitHub Actions runner that publishes
# the site, where ImageMagick is. That is the only reason this script knows
# about two image tools — so the copies a browser upload produces in CI match
# the ones you would have made by hand.
#
# Why this exists: the camera originals in assets/img are 5-15 MB each. They
# are the archive and they stay in the repository, but nothing on the site
# ever links to them. Every <img> points at a copy from assets/img/opt.
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

# Settle on one tool up front rather than testing inside the loop.
if command -v sips >/dev/null 2>&1; then
  TOOL=sips
elif command -v magick >/dev/null 2>&1; then
  TOOL=magick
elif command -v convert >/dev/null 2>&1; then
  TOOL=convert
else
  echo "No image tool found. On a Mac sips is built in; on Linux install" >&2
  echo "ImageMagick (apt-get install imagemagick)." >&2
  exit 1
fi

# "1600 1067" for a file. [0] takes the first frame, so a stray multi-page
# TIFF or an animated file cannot print two lines and break the read below.
dims() {
  case "$TOOL" in
    sips)
      sips -g pixelWidth -g pixelHeight "$1" 2>/dev/null |
        awk '/pixelWidth/ {w=$2} /pixelHeight/ {h=$2} END {print w, h}' ;;
    magick)  magick identify -format '%w %h' "$1[0]" 2>/dev/null ;;
    convert) identify -format '%w %h' "$1[0]" 2>/dev/null ;;
  esac
}

# Scale so the longest edge is EDGE, keeping the aspect ratio. -auto-orient is
# what makes ImageMagick agree with sips: sips already applies the camera's
# EXIF rotation, and without this flag portrait photographs would come out of
# CI lying on their side.
resize() { # src edge dst
  case "$TOOL" in
    sips)
      sips -Z "$2" -s format jpeg -s formatOptions "$QUALITY" \
           "$1" --out "$3" >/dev/null ;;
    magick)
      magick "$1[0]" -auto-orient -resize "$2x$2" -quality "$QUALITY" "$3" ;;
    convert)
      convert "$1[0]" -auto-orient -resize "$2x$2" -quality "$QUALITY" "$3" ;;
  esac
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
      resize "$src" "$edge" "$dst"
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
echo "image tool: $TOOL"
if [ "$MANIFEST_ONLY" -eq 1 ]; then
  echo "manifest rebuilt from $kept existing files"
else
  echo "$made copies written to $OUT"
fi
echo "wrote $OUT/manifest.json ($(wc -c < "$OUT/manifest.json" | tr -d ' ') bytes)"
