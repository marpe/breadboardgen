# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static generator for `out/labb5.html`, a single-page guide to the TNE108 Labb 5 circuits. Each circuit gets a schematic and an isometric breadboard drawing (inline SVG), a node table and info cards. Plain Node (ESM `.mjs`, no dependencies, no `package.json`) and Python 3 standard library. There are no tests and no linter.

## Commands

```
./build.sh                       # full build -> out/ (git-ignored)
node circuits.mjs                # breadboard SVGs only -> out/{led,rl,rc,amp,ast4,ast5}.svg
python sch_ast.py                # astable schematics -> out/sch_ast{4,5}.svg
python build_labb5.py            # assemble out/labb5.html (needs the two steps above first)
python prev.py out/rl.svg rl.png # PNG preview, needs `pip install cairosvg`
```

Run everything from the repo root; scripts use relative paths. `build.sh` uses `$PYTHON`, else `python3`, else `python`.

`node circuits.mjs` prints each board's anchor coordinates as JSON. Use them when pinning tags.

To check a refactor, build before and after and `cmp` the SVGs in `out/`. Unchanged boards should be byte-identical.

## Pipeline

1. `circuits.mjs` builds each breadboard with `makeBoard()` from `lib.mjs` and writes `out/<key>.svg`.
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
- Part functions return an anchor point, which callers store in `b.anchors[key]`. Each part registers its drawing through `part()`, keyed by that returned anchor array (a `WeakMap`). That is how tag `R1` finds the drawing to highlight, so a new part function must end with `return part(depth, s, anchor)` and return a fresh array.

## Tags (pills)

`finish(key, b, { names, info, pinned, VH, title, desc })` in `circuits.mjs`:
- `names` is a list of `[label, anchorKey, cssClass?]` entries. Labels can repeat (e.g. two `R1` tags on different anchors); anchor keys must be unique.
- `info[anchorKey]` is `[type, value]` for the hover tooltip, e.g. `["Resistor", "27 kΩ"]`. Take values from the schematics and the cards in `build_labb5.py`; they must agree. A tag without `info` is not focusable and gets no tooltip.
- Position precedence: `pills.json[key][anchorKey]` > `pinned` > auto-placement. Only the amplifier board pins its tags in code.

## Hover tooltips and highlight (no script)

Hovering or keyboard-focusing a tag shows its tooltip and highlights its part, using CSS only:
- `render()` wraps each part in `<g class="part" data-part=…>` and the overlay in `<g class="overlay">`. Each tag is a focusable `<g class="pill" data-for=…>`; tags whose anchor is a part also get the class `linked`. Tooltips are `<g class="tip" visibility="hidden">` drawn last, so they sit above everything.
- CSS can't match one attribute value against another, so each SVG carries its own `<style>` with per-tag `#bb-<key>:has(.pill[data-for=…]:is(:hover, :focus-visible))` rules. These show the tooltip and un-dim and glow the part (`--part-glow`).
- The shared dimming, focus and tooltip styles live in `page-head.html`.
- Tooltip side (below, above, right, left) is chosen at build time to avoid covering the anchor's surroundings and the leader.
- Node tags (`Uin`, `Uut`, …) anchor to `b.P(...)` points, not parts, so they get a tooltip but no highlight.

## Gotchas

- Always open files in Python with `encoding="utf-8"`. The content has `Ω`, `µ` and `−`, and the Windows default (cp1252) crashes on them.
- Line endings are LF (`.gitattributes`). `build.sh` breaks under CRLF.
- To test in a browser, serve `out/` over HTTP (`python -m http.server --directory out`). Browser automation can't open `file://`.
