#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== Animation Renderer / validation =="
python3 tools/validate_renderer.py --root "$ROOT"

echo
echo "== Required source files =="
for file in \
  renderer/index.html \
  renderer/css/app.css \
  renderer/js/app.js \
  renderer/js/video-engine.js \
  renderer/manifest.webmanifest \
  renderer/sw.js
do
  test -f "$file"
  echo "OK  $file"
done

echo
echo "Renderer checks complete."
