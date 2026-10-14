# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static generator for `out/labb5.html`, a single-page guide to the TNE108 Labb 5 circuits. Each circuit gets a schematic and a breadboard drawing in two views, isometric and top-down (inline SVGs), plus a node table and info cards. Plain Node (ESM `.mjs`, no dependencies, no `package.json`) and Python 3 standard library. There are no tests and no linter.

## Commands

```
./build.sh                       # full build -> out/ (git-ignored)
node circuits.mjs                # breadboard SVGs only -> out/<key>.svg and out/<key>-top.svg
python sch_ast.py                # astable schematics -> out/sch_ast{4,5}.svg
python build_labb5.py            # assemble out/labb5.html (needs the two steps above first)
python prev.py out/rl.svg rl.png # PNG preview, needs `pip install cairosvg`
```

Run everything from the repo root; scripts use relative paths. `build.sh` uses `$PYTHON`, else `python3`, else `python`.

`node circuits.mjs` prints each board's anchor coordinates as JSON. Use them when pinning tags.

To check a refactor, build before and after and `cmp` the SVGs in `out/`. Unchanged boards should be byte-identical.

## Pipeline

1. `circuits.mjs` builds each breadboard twice with `makeBoard()` from `lib.mjs`, once per view, and writes `out/<key>.svg` (isometric) and `out/<key>-top.svg`. Each board is a function of `view` and is called from the loop at the bottom of the file.
2. `sch_ast.py` draws the two astable schematics. The other schematics are hand-written files in `schematics/`.
3. `build_labb5.py` concatenates `page-head.html` (title, fonts, CSS) with the generated body. All page text lives here: the `section(...)` calls carry ledes, node tables and cards. Section ids (`led`, `rl`, `rc`, `amp`, `ast4`, `ast5`) match the SVG keys and the `nav_items` anchors.

## SVGs depend on page CSS

The SVGs are inlined into the HTML and styled by `page-head.html`, so they do not render correctly standalone:
- Schematic strokes use `var(--p)` / `var(--t)`, set by the `.drawing` wrapper rule.
- Text and tag classes (`th`, `ts`, `bbl`, `c-purple`, `c-amber`, `c-teal`, `c-gray`) are defined only in the page CSS, with light and dark variants.
- `prev.py` fakes this by injecting a small light-theme stylesheet and substituting the CSS variables before rendering.

When you add a class or variable to an SVG, define it in `page-head.html` for both themes. All drawings use a 680-wide `viewBox`. `lib.mjs` hardcodes that width in tag placement.

## lib.mjs board model

- `P(u, v, h)` maps board coordinates to screen: `u` = column, `v` = row position, `h` = height above the board in px.
- `v` is not a row index. `ROW` maps names to positions with gaps: `tp`=1, `tn`=2, `a`–`e`=4–8, centre channel at 9, `f`–`j`=10–14, `bp`=16, `bn`=17. Fractional `v` (such as `8.3`) is used for anchor points between holes.
- Calling `hole(c, v)` (done by every part, wire and probe) records the hole, and each recorded hole gets an orange "in use" ring.
- Render layers, in order: board → tints → hole rings → `draws` (parts and jumpers, sorted by depth `u + v` plus a small per-part offset for isometric overlap) → `overlay` (instrument boxes, wires, probes) → tags.
- Each part pushes sample points into `obs` (obstacles). The tag auto-placer scores candidate positions on rings around each anchor and penalises obstacles, overlap with other tags, and leaders crossing other tags. Tags with fixed positions are placed first.
- Part functions return an anchor point, which callers store in `b.anchors[key]`. Each part registers its drawing through `part()`, keyed by that returned anchor array (a `WeakMap`). That is how tag `R1` finds the drawing to highlight, so a new part function must end with `return part(depth, s, anchor)` and return a fresh array. It must also be wrapped in `def()` in the returned object, which records the obstacle points it added as its footprint, so tooltips avoid covering it.

## Views

`makeBoard({ view: "top" })` swaps `P` for a flat projection `[X0 + u·S, Y0 + v·S]` that ignores `h`. Defaults: `S` = 24, board centred, and `b.height` (fitted to the board) is used as the viewBox height.
- Resistors, inductors, jumpers and wires need no special code; with `h` ignored they draw flat on their own. `ecap`, `film`, `led`, `pot` and `transistor` have an `if (flat)` branch with a top-down body, sized relative to `S`.
- In the flat view the "in use" rings are drawn above the parts, because bodies cover their own pins from above. The pot body is offset below its pins, and probes are shortened.
- Instrument boxes are in screen coordinates and shared by both views. The flat board starts at `Y0 = 150`, below the boxes along the top; a board with a box on its left side (the amplifier) passes its own `X0`.
- The sticky `.toolbar` in `build_labb5.py` holds two CSS-only controls. The view radio group drives `main:has(input[value="top"]:checked)` rules in `page-head.html` that swap `.view-iso` and `.view-top`. The `#show-tags` checkbox hides every `.pill` and `.tip` in the breadboard drawings when unchecked.

## Tags (pills)

`finish(key, b, { names, info, pinned, VH, title, desc })` in `circuits.mjs`:
- `names` is a list of `[label, anchorKey, cssClass?]` entries. Labels can repeat (e.g. two `R1` tags on different anchors); anchor keys must be unique.
- `info[anchorKey]` is the hover tooltip, built with the helpers in `markings.mjs`: `resistor(type, ohms, note?)`, `filmCap`, `elcoCap`, `trimmer`, `transistor`, `plain(type, value, mark?)`. They return `{ type, value, bands? | mark? }`. The helpers derive the value text and the marking (4-band colour code, EIA code such as "105") from the number. Take values from the schematics and the cards in `build_labb5.py`; they must agree. A tag without `info` is not focusable and gets no tooltip.
- Pass the same resistance to the drawn part, e.g. `b.resistor(c1, v1, c2, v2, ohms.R1)`, so the board shows the same bands as the tooltip. Each board keeps its values in one place (e.g. an `ohms` object) for that reason. Without a value, the resistor draws placeholder bands.
- Position precedence: `pills.json[file][anchorKey]` > `pinned` > auto-placement, where `file` is `amp` or `amp-top` and so on. Only the amplifier board pins its tags in code, and only for the isometric view.

## Hover tooltips and highlight (no script)

Hovering or keyboard-focusing a tag shows its tooltip and highlights its part, using CSS only:
- `render()` wraps each part in `<g class="part" data-part=…>` and the overlay in `<g class="overlay">`. Each tag is a focusable `<g class="pill" data-for=…>`; tags whose anchor is a part also get the class `linked`. Tooltips are `<g class="tip" visibility="hidden">` drawn last, so they sit above everything.
- CSS can't match one attribute value against another, so each SVG carries its own `<style>` with per-tag `#bb-<key>:has(.pill[data-for=…]:is(:hover, :focus-visible))` rules. These show the tooltip and un-dim and glow the part (`--part-glow`).
- The shared dimming, focus and tooltip styles live in `page-head.html`.
- Tooltip position is chosen at build time from 8 px slides along the rows above and below the tag and the columns either side. It avoids the part's footprint (or, for node tags, a box round the anchor) and the leader, never covers its own tag, and prefers staying centred. The invisible hover strip is computed from the tag and tip rectangles, so any adjacent position keeps the tip open while the pointer crosses over.
- Node tags (`Uin`, `Uut`, …) anchor to `b.P(...)` points, not parts, so they get a tooltip but no highlight.

## Gotchas

- Always open files in Python with `encoding="utf-8"`. The content has `Ω`, `µ` and `−`, and the Windows default (cp1252) crashes on them.
- Line endings are LF (`.gitattributes`). `build.sh` breaks under CRLF.
- To test in a browser, serve `out/` over HTTP (`python -m http.server --directory out`). Browser automation can't open `file://`.
