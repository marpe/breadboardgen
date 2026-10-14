#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PYTHON="${PYTHON:-$(command -v python3 || command -v python)}"
node circuits.mjs
"$PYTHON" sch_ast.py
"$PYTHON" build_labb5.py
echo "Built out/labb5.html"
