# Breadboard guide generator

Builds one page per guide in `guides/` (`out/<guide>.html`) plus `out/index.html` listing them: schematics and 3D breadboard layouts (with instruments, cables and probes). The first guide is the TNE108 Labb 5 circuits (`guides/labb5/`).

## Requirements

- Node.js 18 or newer
- Python 3
- Optional, for PNG previews: `pip install cairosvg`

## Build

```
./build.sh          # every guide, then the index
./build.sh labb5    # one guide, then the index
```

All generated files go to `out/` (git-ignored). Set `PYTHON` to override the interpreter; otherwise `python3`, then `python`, is used.

## Deploy

`.github/workflows/pages.yml` publishes the pages to GitHub Pages. On every push to `master` it builds every guide and serves the guide index as the site's `index.html`, with each guide at `/<guide>.html`. One-time setup: in the repository, set Settings → Pages → Source to **GitHub Actions**. The pages have to be served over HTTP(S) (not opened as a file) because they import their 3D viewer at runtime.

## Adding a guide

Create `guides/<id>/`. `<id>` must be a valid Python identifier, e.g. `labb6`, because guides are imported as Python modules. The folder holds:

- `boards.mjs`: `export default { <key>: () => ({ b, names, info, pinned, VH, title, desc }) }`. Build `b` with `makeBoard()` from `../../engine/lib.mjs`; see `guides/labb5/boards.mjs`.
- `guide.py`: `GUIDE = {"title", "eyebrow", "h1", "lede", "sections": [section(id=<key>, nav=(short, name), …)]}`, using the helpers in `engine.page_kit`. Every section `id` needs a board with the same key. An optional `"legend"` replaces the default legend. Keep the file free of side effects; the index imports it.
- `schematics/`: hand-written SVGs with a 680-wide `viewBox`, strokes in `var(--p)`, and labels as `<text>` whose first word is the tag name.
- Optional `schematics.py`: draws schematics with `engine.schlib` and writes them with `save(__file__, {name: svg})`.
- Optional `pills.json`: hand-placed tag positions.

A section's `schematic` file name must exist in exactly one of `guides/<id>/schematics/` or the generated output. Then run `./build.sh <id>`.

## Files

| File | What it does |
| --- | --- |
| `engine/lib.mjs` | Breadboard drawing library: isometric board, parts (resistor, inductor, film and electrolytic caps, LED, trimmer pot, TO-92 or TO-18 transistor), jumpers, instrument boxes, probes and ground clips, hole rings, and automatic tag placement |
| `engine/markings.mjs` | Component markings from values: resistor colour bands, EIA codes for caps and trimmers, value formatting, and the tooltip info helpers |
| `engine/boards.mjs` | Board runner: builds `guides/<id>/boards.mjs` into `out/<id>/<key>.svg` and `out/<id>/<key>.3d.json` |
| `engine/build_page.py` | Page runner: assembles `out/<id>.html` from `guides/<id>/guide.py`, the boards, the schematics, `page-head.html`, `viewer3d.mjs` and `page.mjs` |
| `engine/page_kit.py` | Helpers guides use to write sections: `section`, `node`, `c`, and the default legend |
| `engine/schlib.py` | Schematic drawing helpers for generated schematics, plus `save()` |
| `engine/build_index.py` | Writes `out/index.html` |
| `engine/page-head.html` | Fonts, colour tokens (light and dark) and styles |
| `engine/viewer3d.mjs` | Browser-side three.js viewer: builds a 3D breadboard, its instruments and cables from a board's `.3d.json` |
| `engine/page.mjs` | Page script: starts the 3D views (falling back to the SVG drawings) and links schematic labels to breadboard parts |
| `guides/labb5/` | The Labb 5 guide: LED indicator, RL, RC, amplifier and both astable circuits |
| `prev.py` | Renders an SVG to PNG for a quick look: `python3 prev.py out/labb5/rl.svg rl.png` |

## Changing a layout

Parts are placed by breadboard hole: column number, then a row from `ROW` (`a`–`j`, `tp`/`tn` for the top + and − rails, `bp`/`bn` for the bottom rails). For example:

```
b.resistor(3, R.c, 8, R.c);
```

puts a resistor from hole 3c to hole 8c.

Breadboards are shown in 3D (three.js from a CDN). The isometric SVG drawing (`out/<id>/<key>.svg`) is the fallback: it shows without JavaScript or WebGL, offline, and in print. Hovering a part's label in the schematic highlights it on the breadboard, and the other way round.

Hovering or focusing a tag shows the part's type and value and highlights it on the board. The text comes from each board's `info` map in `guides/<id>/boards.mjs`.

Tags are placed automatically unless pinned. The Labb 5 amplifier board pins its tags in `boards.mjs`. To pin one by hand, create `guides/<id>/pills.json` like `{"rl": {"L1": [360, 240]}}`; entries there override pins in code.
