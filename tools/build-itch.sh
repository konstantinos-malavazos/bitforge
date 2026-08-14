#!/usr/bin/env bash
# Builds dist/xor2048-itch.zip for upload to itch.io.
# itch.io requires index.html at the ROOT of the zip, not inside a folder.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dist="$root/dist"
zipfile="$dist/xor2048-itch.zip"

command -v zip >/dev/null || { echo "error: 'zip' is not installed" >&2; exit 1; }

node "$root/tools/make-icons.mjs" >/dev/null

mkdir -p "$dist"
rm -f "$zipfile"

cd "$root"
# sw.js is intentionally included: registration no-ops inside itch's iframe,
# and the same zip stays usable for self-hosting.
zip -q -r "$zipfile" \
  index.html \
  manifest.webmanifest \
  sw.js \
  icons

echo "built $zipfile"
unzip -l "$zipfile"
