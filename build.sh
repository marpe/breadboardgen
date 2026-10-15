#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PYTHON="${PYTHON:-$(command -v python3 || command -v python)}"
node engine/boards.mjs labb5
"$PYTHON" -m guides.labb5.schematics
"$PYTHON" -m engine.build_page labb5
echo "Built out/labb5.html"
