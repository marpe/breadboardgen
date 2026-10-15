# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static generator for breadboard guides: one page per folder in `guides/` (`out/<guide>.html`) plus `out/index.html` listing them. The engine lives in `engine/`; the first guide, `guides/labb5/`, covers the TNE108 Labb 5 circuits. Each circuit gets a schematic, a breadboard (3D with three.js, with an isometric SVG drawing as fallback), a node table and info cards. Plain Node (ESM `.mjs`, no dependencies, no `package.json`) and Python 3 standard library. There are no tests and no linter.

## Commands

```
./build.sh                              # every guide + index -> out/ (git-ignored)
./build.sh labb5                        # one guide + index
node engine/boards.mjs labb5            # boards -> out/labb5/<key>.svg (fallback drawing) and out/labb5/<key>.3d.json (3D model)
python -m guides.labb5.schematics       # generated schematics -> out/labb5/sch_ast{4,5}.svg
python -m engine.build_page labb5       # assemble out/labb5.html (needs the steps above first)
python -m engine.build_index            # out/index.html
python prev.py out/labb5/rl.svg rl.png  # PNG preview of an SVG, needs `pip install cairosvg`
```

Run everything from the repo root; scripts use relative paths and `python -m` module names. `build.sh` uses `$PYTHON`, else `python3`, else `python`. It validates every guide name before building any.

`node engine/boards.mjs <guide>` prints each board's anchor coordinates as JSON. Use them when pinning tags.

To check a refactor, build before and after and `cmp` the files in `out/`. Unchanged boards should be byte-identical. `page-head.html`, `viewer3d.mjs` and `page.mjs` are inlined into every guide page, so any edit to them changes every page's bytes.

To test in a browser, serve `out/` over HTTP (`python -m http.server --directory out`); browser automation can't open `file://`. Chrome caches the page, so add a query string (`labb5.html?v=2`) after rebuilding.

## Pipeline

A guide is a folder `guides/<id>/` (`<id>` must be a Python identifier; it's imported as `guides.<id>.guide`) with `boards.mjs`, `guide.py`, `schematics/`, and optionally `schematics.py` and `pills.json`. README's "Adding a guide" has the contract.

1. `engine/boards.mjs <id>` runs each builder in the default export of `guides/<id>/boards.mjs`. Builders make a board with `makeBoard()` from `engine/lib.mjs` and return `{ b, names, info, pinned, VH, title, desc }`; the runner places the tags and writes `out/<id>/<key>.svg` and `out/<id>/<key>.3d.json`. Both come from the same calls, so the drawing and the 3D view always agree.
2. Optional `guides/<id>/schematics.py` draws schematics with `engine/schlib.py` and writes them to `out/<id>/` with `save(__file__, {...})`. Hand-written schematics live in `guides/<id>/schematics/`. A section's `schematic` name must exist in exactly one of the two places, or `build_page` stops with an error.
3. `engine/build_page.py <id>` concatenates `engine/page-head.html` (fonts, CSS; each build script adds its own `<title>`) with the body built from `GUIDE` in `guides/<id>/guide.py`. All page text lives in `guide.py`: the `section(...)` calls carry ledes, node tables and cards, using helpers from `engine/page_kit.py`. A section's `id` is its board key and its nav anchor; its `nav` tuple is the nav label. Each breadboard figure holds `.view-iso` (the SVG) and `.view-3d` (a stage plus that board's model JSON). The page inlines `viewer3d.mjs` as a `text/plain` script and `page.mjs` as the page's module script.
4. `engine/build_index.py` imports every `guides/*/guide.py` (so guide modules must be side-effect free) and writes `out/index.html`, one card per guide. Its index-only CSS is inline in `build_index.py`, since anything added to `page-head.html` lands in every guide page.

## Page behaviour (page.mjs)

- **3D with SVG fallback:** CSS shows the SVG by default, so it's what you get without JavaScript. `page.mjs` adds `has-3d` to `<html>` when WebGL2 is available, which swaps every figure to 3D. If three.js can't load (offline) it removes the class again; if one board's `mountBoard()` fails, that figure gets `.fallback`. `@media print` always shows the SVG.
- **Loading:** the viewer is imported from a blob URL made from the inlined source (the page's import map still resolves `three`, pinned to `three@0.186.1` on jsDelivr). Each board mounts when its stage comes within 400 px of the viewport. Viewer and page code must not contain `</script`, since they sit in raw script elements.
- **Schematic ↔ breadboard:** a schematic `<text>` whose first word equals a tag name ("C1 10 µF" → C1) becomes `.sch-ref`. Hovering it highlights that part in 3D (`controller.highlight(keys)`) and in the SVG (`.part.xhl`). Hovering a 3D tag (the viewer's `tag-hover` event) or an SVG tag marks the schematic label `.is-hot`. Same-named parts (the astable's two R1s) all light up, since a schematic label can't say which it means.
- The sticky `.toolbar` has one control, `#show-tags`, which hides tags and tooltips in both the SVG and 3D.
- **Full screen:** each figure's caption has a `.fs-toggle` button, shown at ≤ 560 px or on coarse pointers. It is emitted `hidden` and unhidden by `page.mjs`.
  - The button calls `requestFullscreen()` on the figure. Where that is missing or refused (iPhone Safari), the figure becomes a fixed overlay instead; Esc closes it.
  - Either way the figure gets `.is-full`, and its drawing or stage fills the remaining height.
  - Full screen shows only the drawing or 3D view, edge to edge, with the button floating over it. The caption text sits in a `<span>` so CSS can hide it.
  - Full-screen drawings (schematics, SVG fallback) zoom and pan through `zoomable()` in `page.mjs`, which sets a CSS transform on the `<svg>`. Pinch or the wheel zooms, a drag pans, a double tap zooms in or resets. Scale runs from 1 to `MAX_ZOOM` and the drawing can't be pulled off an edge. It resets on close.
  - A 3D board is switched with `controller.setExpanded(on)`.
- **Circuit nav (scrollspy):** `nav.jump` is a direct child of `main` with `--rows` set by the build (it spans every grid row). At ≥ 1180 px it is a sticky sidebar column. The current link is styled with `:is(:target-current, .\:target-current)`. Where `scroll-target-group` is supported, the browser tracks it natively and `page.mjs` only mirrors `aria-current` after `scrollend`. Elsewhere an IntersectionObserver sets the `.\:target-current` class.

## Responsive layout (page-head.html)

The page must work down to 320 px with no sideways page scroll.
- Scrollbars are thin. `scrollbar-color` is set on `:root` and inherits. `scrollbar-width` doesn't inherit, so it is set on `*`.
- Card grids use `minmax(min(260px, 100%), 1fr)`.
- Schematics and SVG boards have no minimum width; they always scale to the column.
- The 3D overlays scale through the `stage` container query, not the viewport.
- At ≤ 560 px:
  - figures, cards and tables lose their card chrome (border, background, padding);
  - the stage is 4:3 with no `min-height`;
  - the nav becomes a single horizontally scrolling row;
  - node tables stack, with each cell labelled from `data-label` (`TABLE_HEADS` in `engine/page_kit.py`).
- `.stage` needs `width: 100%`. A grid item with `aspect-ratio` doesn't stretch; its width would follow `min-height` and overflow the card.

## SVGs depend on page CSS

The SVGs are inlined into the HTML and styled by `page-head.html`, so they do not render correctly standalone:
- Schematic strokes use `var(--p)` / `var(--t)`, set by the `.drawing` wrapper rule.
- Text and tag classes (`th`, `ts`, `bbl`, `c-purple`, `c-amber`, `c-teal`, `c-gray`) are defined only in the page CSS, with light and dark variants.
- `prev.py` fakes this by injecting a small light-theme stylesheet and substituting the CSS variables before rendering.

When you add a class or variable to an SVG, define it in `page-head.html` for both themes. All drawings use a 680-wide `viewBox`. `lib.mjs` hardcodes that width in tag placement.

## lib.mjs board model

- `P(u, v, h)` maps board coordinates to isometric screen space: `u` = column, `v` = row position, `h` = height above the board in px. `toBoard([x, y])` is its inverse on the board plane.
- `v` is not a row index. `ROW` maps names to positions with gaps: `tp`=1, `tn`=2, `a`–`e`=4–8, centre channel at 9, `f`–`j`=10–14, `bp`=16, `bn`=17. Fractional `v` (such as `8.3`) is used for anchor points between holes.
- Calling `hole(c, v)` (done by every part, wire and probe) records the hole, and each recorded hole gets an orange "in use" ring.
- Render layers, in order: board → tints → hole rings → `draws` (parts and jumpers, sorted by depth `u + v` plus a small per-part offset for isometric overlap) → `overlay` (instrument boxes, wires, probes) → tags → tooltips.
- Each part pushes sample points into `obs` (obstacles). The tag auto-placer scores candidate positions on rings around each anchor and penalises obstacles, overlap with other tags, and leaders crossing other tags. Tags with fixed positions are placed first.
- Part functions return an anchor point, which callers store in `b.anchors[key]`. Each part registers its drawing through `part()`, keyed by that returned anchor array (a `WeakMap`); that is how tag `R1` finds the drawing to highlight. So a new part function must end with `return part(depth, s, anchor)` and return a fresh array. It must also be wrapped in `def()` in the returned object, which records its footprint (obstacle points, so tooltips avoid it) and links its 3D model entries to its anchor.
- **3D model:** every part, instrument box (`box`), wire and probe `rec()`s a view-independent entry (kind, holes, colours, bands; instruments and cable starts are converted with `toBoard`). `b.model3d()` returns `{ cols, tints, used, parts, tags }` with tag keys attached. Node tags must be anchored with `b.node(u, v)`, not `b.P(u, v)`: `node()` remembers the board position the 3D tag needs.

## Tags (pills)

Each builder in `guides/<id>/boards.mjs` returns `{ b, names, info, pinned, VH, title, desc }`; `finish()` in `engine/boards.mjs` places the tags:
- `names` is a list of `[label, anchorKey, cssClass?]` entries. Labels can repeat (e.g. two `R1` tags on different anchors); anchor keys must be unique.
- `info[anchorKey]` is the hover tooltip, built with the helpers in `markings.mjs`: `resistor(type, ohms, note?)`, `filmCap`, `elcoCap`, `trimmer`, `transistor`, `plain(type, value, mark?)`. They return `{ type, value, bands? | mark? }`. The helpers derive the value text and the marking (4-band colour code, EIA code such as "105") from the number. Take values from the schematics and the cards in `guide.py`; they must agree. A tag without `info` is not focusable and gets no tooltip.
- Pass the same resistance to the drawn part, e.g. `b.resistor(c1, v1, c2, v2, ohms.R1)`, so the board shows the same bands as the tooltip. Each board keeps its values in one place (e.g. an `ohms` object) for that reason. Without a value, the resistor draws placeholder bands.
- Position precedence in the SVG: `guides/<id>/pills.json[key][anchorKey]` > `pinned` > auto-placement. Only the Labb 5 amplifier board pins its tags in code.

## SVG tooltips and highlight (no script)

- `render()` wraps each part in `<g class="part" data-part=…>` and the overlay in `<g class="overlay">`. Each tag is a focusable `<g class="pill" data-for=…>`; tags whose anchor is a part also get the class `linked`. Tooltips are `<g class="tip" visibility="hidden">` drawn last, so they sit above everything.
- CSS can't match one attribute value against another, so each SVG carries its own `<style>` with per-tag `#bb-<key>:has(.pill[data-for=…]:is(:hover, :focus-visible))` rules. These show the tooltip and un-dim and glow the part (`--part-glow`).
- Tooltip position is chosen at build time from 8 px slides along the rows above and below the tag and the columns either side. It avoids the part's footprint (or, for node tags, a box round the anchor) and the leader, never covers its own tag, and prefers staying centred. The invisible hover strip is computed from the tag and tip rectangles, so any adjacent position keeps the tip open while the pointer crosses over.

## 3D viewer (viewer3d.mjs)

- `mountBoard(stage, model)` returns a controller `{ highlight(keys) }`, or `null` if WebGL fails. All per-board state lives in its closure, so each board has its own renderer, camera and labels.
- **Geometry** is built from three.js primitives (no downloaded models). Units are hole pitches: x = column, z = ROW position, y = up, with the board top at y = 0. Builders take `(part, at)`, where `at` maps board coordinates to world space, so a new part kind needs a `rec()` in `lib.mjs` and a builder here.
- **The board** is slabs separated by recessed grooves (`GROOVES`: by each power rail pair and the centre channel). Each slab shows its slice of one canvas texture (holes, rails, labels, tints, in-use rings).
- **Jumpers** lie flat on the board.
- **Instruments** sit raised (`INSTRUMENT_BASE`, three board heights) and turn to face the board. Each kind has its own model in `models` (supply, generator, oscilloscope, multimeter, chosen from the box title). Screens are canvas textures showing values parsed from the 2D box's lines (e.g. "+12 V" → "12.00"). Each model also declares its socket row.
- **Cables:** `assignSockets()` gives each cable a socket on its nearest instrument, ordered so cables don't cross. Cables arc out of the socket and come straight down from above (`arcPoints()`, a cubic Bézier), ending in a plug, a hanging crocodile clip (ground leads) or a scope probe whose ground lead arcs over to its clip.
- **Supply terminals:** supply leads (lead parts whose nearest instrument is the supply) plug into banana binding posts on a dark blue head across the board's left short end, with short flat wires from each post to the rail hole. Seen head-up, GND is on the left and + on the right, which here puts + toward the back (by the top + rail) and GND toward the front. Polarity comes from the lead colour (red is +).
- **Camera:** framed so every corner of the setup's bounding box is in view, re-fitted on resize until the reader moves it. Mouse: left orbits, right pans, the wheel zooms while over the view (so it doesn't scroll the page there). Pressing right while orbiting switches the drag to panning until all buttons are released (releasing right alone doesn't switch back). OrbitControls fixes its mode at pointerdown, so the drag is restarted as a right-button drag; only a trusted final pointerup clears the flag, so the synthetic restart doesn't. Touch: the canvas has `touch-action: pan-y`, so a one-finger up/down swipe scrolls the page (the browser cancels the orbit) and a sideways swipe orbits. Two fingers orbit and zoom. Multi-finger touches are `preventDefault`ed so `pan-y` can't turn them into a page scroll. Full screen (`setExpanded`): `touch-action: none`, one finger orbits in every direction, two pinch and pan.
- **Labels:** tags are HTML `<button>`s in a `CSS2DRenderer` layer, lifted above their part with a leader line (node tags sit at their node position). They use the same names, colours and tooltip content as the SVG tags. Hover or focus shows a tooltip; hover takes priority while it lasts; Esc closes it. Hover handlers ignore touch, since a tap fires `pointerenter` and `pointerleave` together. A tap toggles the tooltip and focus instead (iOS doesn't focus buttons on tap), and a tap on the canvas dismisses it. Whether to open or close is decided at `pointerdown`: Android focuses the button during the tap, which already opens the tooltip before `click`. The label layer has its own `z-index` so its depth-sorted tags stay below the tooltip. Instrument name labels (`.inst3d`) always show.
- **Outlines:** a custom `ShaderPass` (`OutlineShader`), not `OutlinePass`, which blends edges additively so dark edges vanish. Components are on layer 1 and rendered white into a mask; the pass draws a dark ring just outside it. Highlighted parts (own tag or `highlight()`) are also on layer 2 and get a thicker purple ring. Their holes light up too: `def()` logs the holes each part plugs into (`holes` in the model), and `holeGlow()` puts a ring and pulsing halo on each. These draw on top (`depthTest: false`) so holes under the part's body still show; the pulse keeps rendering every frame while a glow is visible, except under reduced motion. Shadows are computed once (`shadowMap.autoUpdate = false`) because each frame renders the scene three times.
- A generated `RoomEnvironment` gives the metal parts something to reflect.

## Gotchas

- Always open files in Python with `encoding="utf-8"`. The content has `Ω`, `µ` and `−`, and the Windows default (cp1252) crashes on them.
- Line endings are LF (`.gitattributes`). `build.sh` breaks under CRLF.
- Guide folder names must be valid Python identifiers (`labb6`, not `labb-6`); `build.sh` refuses others.
- Index-only CSS goes in `engine/build_index.py`, not `page-head.html`, which is inlined into every guide page.
