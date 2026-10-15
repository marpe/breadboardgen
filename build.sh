#!/usr/bin/env bash
# Builds every guide in guides/ (or only the ones named) into out/<guide>.html, then out/index.html.
set -euo pipefail
cd "$(dirname "$0")"
PYTHON="${PYTHON:-$(command -v python3 || command -v python)}"
guides=("$@")
if [ ${#guides[@]} -eq 0 ]; then
  for file in guides/*/guide.py; do
    guides+=("$(basename "$(dirname "$file")")")
  done
fi
for id in "${guides[@]}"; do
  if [[ ! "$id" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "build.sh: guide folder '$id' must be a valid Python identifier (letters, digits, _)" >&2
    exit 1
  fi
  if [ "$id" = index ]; then
    echo "build.sh: guide folder can't be named 'index'; out/index.html is the guide list" >&2
    exit 1
  fi
  if [ ! -f "guides/$id/guide.py" ]; then
    echo "build.sh: no guide guides/$id/guide.py" >&2
    exit 1
  fi
done
for id in "${guides[@]}"; do
  # Start each guide from an empty folder, so a board or schematic removed from the guide can't survive as stale output.
  rm -rf "out/$id"
  node engine/boards.mjs "$id"
  if [ -f "guides/$id/schematics.py" ]; then
    "$PYTHON" -m "guides.$id.schematics"
  fi
  "$PYTHON" -m engine.build_page "$id"
  echo "Built out/$id.html"
done
"$PYTHON" -m engine.build_index
echo "Built out/index.html"
