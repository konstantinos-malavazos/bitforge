#!/usr/bin/env bash
# Builds the two shippable artifacts:
#   dist/site/              a plain folder — drag onto app.netlify.com/drop for an
#                           HTTPS URL that installs to a phone home screen
#   dist/xor2048-itch.zip   the itch.io upload; index.html sits at the ZIP ROOT,
#                           not inside a folder, which itch.io requires
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dist="$root/dist"
site="$dist/site"
zipfile="$dist/xor2048-itch.zip"

command -v zip >/dev/null || { echo "error: 'zip' is not installed" >&2; exit 1; }

node "$root/tools/make-icons.mjs" >/dev/null

rm -rf "$site" "$zipfile"
mkdir -p "$site"

cd "$root"
cp index.html manifest.webmanifest sw.js "$site/"
cp -r icons "$site/"

# Zip the staged contents, so index.html lands at the archive root.
(cd "$site" && zip -q -r "$zipfile" .)

echo "built:"
echo "  $site/            → drag this folder onto https://app.netlify.com/drop"
echo "  $zipfile   → upload to itch.io"
echo
unzip -l "$zipfile"
