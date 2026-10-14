#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
cp schematics/*.svg .
node circuits.mjs
VH=510 node bb.mjs '{"R1":[455,228],"R3":[484,308],"C1":[420,212],"C2":[416,322],"Q3":[352,226],"R2":[292,390],"R4":[176,352],"C3":[232,276],"Uin":[290,312,"c-amber"],"Uut":[412,356,"c-teal"],"GND bridge":[548,430,"c-gray"]}' bb.svg
python3 sch_ast.py
python3 build_labb5.py
echo "Built labb5.html"
