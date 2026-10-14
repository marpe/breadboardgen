# Labb 5 breadboard guide generator

Builds `out/labb5.html`: schematics and 3D breadboard layouts (with instruments, cables and probes) for the TNE108 Labb 5 circuits.

## Requirements

- Node.js 18 or newer
- Python 3
- Optional, for PNG previews: `pip install cairosvg`

## Build

```
./build.sh
```

All generated files go to `out/` (git-ignored). Set `PYTHON` to override the interpreter; otherwise `python3`, then `python`, is used.

## Files

| File | What it does |
| --- | --- |
| `lib.mjs` | Breadboard drawing library: isometric board, parts (resistor, inductor, film and electrolytic caps, LED, trimmer pot, TO-92 or TO-18 transistor), jumpers, instrument boxes, probes and ground clips, hole rings, and automatic tag placement |
| `markings.mjs` | Component markings from values: resistor colour bands, EIA codes for caps and trimmers, value formatting, and the tooltip info helpers |
| `circuits.mjs` | Board layouts for the LED indicator, RL, RC, amplifier and both astable circuits. Writes `led.svg`, `rl.svg`, `rc.svg`, `amp.svg`, `ast4.svg`, `ast5.svg` |
| `sch_ast.py` | Generates the two astable schematics (`sch_ast4.svg`, `sch_ast5.svg`) |
| `schematics/` | Hand-written schematics for the amplifier, LED, RL and RC circuits |
| `build_labb5.py` | Assembles the page from `page-head.html`, `schematics/`, the generated SVGs and 3D models, `viewer3d.mjs` and `page.mjs` |
| `page-head.html` | Page title, fonts, colour tokens (light and dark) and styles |
| `viewer3d.mjs` | Browser-side three.js viewer: builds a 3D breadboard, its instruments and cables from a board's `out/<key>.3d.json` |
| `page.mjs` | Page script: starts the 3D views (falling back to the SVG drawings) and links schematic labels to breadboard parts |
| `prev.py` | Renders an SVG to PNG for a quick look: `python3 prev.py out/rl.svg rl.png` |

## Changing a layout

Parts are placed by breadboard hole: column number, then a row from `ROW` (`a`–`j`, `tp`/`tn` for the top + and − rails, `bp`/`bn` for the bottom rails). For example:

```
b.resistor(3, R.c, 8, R.c);
```

puts a resistor from hole 3c to hole 8c.

Breadboards are shown in 3D (three.js from a CDN). The isometric SVG drawing (`out/<key>.svg`) is the fallback: it shows without JavaScript or WebGL, offline, and in print. Hovering a part's label in the schematic highlights it on the breadboard, and the other way round.

Hovering or focusing a tag shows the part's type and value and highlights it on the board. The text comes from each board's `info` map in `circuits.mjs`.

Tags are placed automatically, except on the amplifier board, whose tags are pinned in `circuits.mjs`. To pin one by hand, create `pills.json` like `{"rl": {"L1": [360, 240]}}`; entries there override pins in code.
