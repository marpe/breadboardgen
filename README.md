# Labb 5 breadboard guide generator

Builds `labb5.html`: schematics and isometric breadboard layouts for the TNE108 Labb 5 circuits.

## Requirements

- Node.js 18 or newer
- Python 3
- Optional, for PNG previews: `pip install cairosvg`

## Build

```
./build.sh
```

## Files

| File | What it does |
| --- | --- |
| `lib.mjs` | Breadboard drawing library: isometric board, parts (resistor, inductor, film and electrolytic caps, LED, trimmer pot, TO-92 or TO-18 transistor), jumpers, instrument boxes, probes and ground clips, hole rings, and automatic tag placement |
| `circuits.mjs` | Board layouts for the LED indicator, RL, RC and both astable circuits. Writes `led.svg`, `rl.svg`, `rc.svg`, `ast4.svg`, `ast5.svg` |
| `bb.mjs` | The original standalone generator for the amplifier board (`bb.svg`), with hand-placed tags passed as JSON |
| `sch_ast.py` | Generates the two astable schematics (`sch_ast4.svg`, `sch_ast5.svg`) |
| `schematics/` | Hand-written schematics for the amplifier, LED, RL and RC circuits |
| `build_labb5.py` | Assembles the page from `page-head.html` and all SVGs |
| `page-head.html` | Page title, fonts, colour tokens (light and dark) and styles |
| `prev.py` | Renders an SVG to PNG for a quick look: `python3 prev.py rl.svg rl.png` |

## Changing a layout

Parts are placed by breadboard hole: column number, then a row from `ROW` (`a`–`j`, `tp`/`tn` for the top + and − rails, `bp`/`bn` for the bottom rails). For example:

```
b.resistor(3, R.c, 8, R.c);
```

puts a resistor from hole 3c to hole 8c.

Tags are placed automatically. To pin one by hand, create `pills.json` like `{"rl": {"L1": [360, 240]}}`.
