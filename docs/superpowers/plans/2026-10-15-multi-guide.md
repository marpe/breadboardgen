# Multi-guide Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Labb 5 generator into a reusable engine plus per-guide folders, so a new guide is added by creating `guides/<id>/` only.

**Architecture:** Engine files move to `engine/`. Two runners read guide content: `engine/boards.mjs` (Node) builds the boards and `engine/build_page.py` (Python) builds the page. `engine/build_index.py` lists every guide. Labb 5 content moves to `guides/labb5/`. The output for Labb 5 must stay byte-identical, and that is the test for every task.

**Tech Stack:** Node ≥ 18 (ESM, no deps), Python 3 stdlib, bash.

**Spec:** `docs/superpowers/specs/2026-10-15-multi-guide-design.md`

## Global Constraints

- No dependencies, no `package.json`. Node ESM `.mjs` and Python 3 standard library only.
- Run everything from the repo root.
- Open files in Python with `encoding="utf-8"`.
- Line endings are LF (`.gitattributes`); `build.sh` breaks under CRLF.
- JS style: `if` always uses braces; `{` stays on the same line; `}` goes on its own line.
- `out/labb5.html`, every `out/labb5/<key>.{svg,3d.json}` and `out/labb5/sch_ast{4,5}.svg` must be byte-identical to the pre-refactor baseline. The only exception is the `page.mjs` header comment, edited in the last task after the final check.
- `page-head.html`, `viewer3d.mjs` and `page.mjs` are inlined into the page, so do not edit them before the last task.
- Guide folder names must be valid Python identifiers.
- Guide modules (`guide.py`) must be side-effect free on import.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Use separate Bash calls instead of `&&` / `;` chains where each command is allowed on its own (user preference).

## Review Focus

1. **Guide folder with a hyphen** (`guides/labb-6/`): `./build.sh` must stop before building, with a message that the name must be a Python identifier. Test in Task 5.
2. **Unknown guide argument** (`./build.sh nosuch`): must exit 1 with "no guide guides/nosuch/guide.py". Test in Task 5.
3. **Schematic name missing, or present in both `out/<id>/` and `guides/<id>/schematics/`**: must fail with a message naming the file and both folders. Test in Task 4.
4. **Section id with no board in `boards.mjs`**: must fail with a message naming `guides/<id>/boards.mjs`, not a raw `FileNotFoundError`. Test in Task 4.
5. **Two guides sharing board keys** (both have `rc`): the builds must not overwrite each other, and Labb 5 must stay byte-identical. Test in Task 5 with a temporary copy guide.

---

## Shared verification

`SCRATCH` = `/c/Users/marpe/AppData/Local/Temp/claude/C--dev-bbgen/e1860909-b6e3-4e87-9482-33d152362dfc/scratchpad`

Task 1 creates `$SCRATCH/baseline/` (the pre-refactor `out/`) and `$SCRATCH/verify.sh`. Every task then checks its result with:

```
rm -rf out
./build.sh
bash $SCRATCH/verify.sh $SCRATCH/baseline
```

The expected result is that every line starts with `same` and the exit code is 0. `verify.sh` looks for each file at its final path (`out/labb5/…`) and falls back to the old flat path (`out/…`), so the same script works in every task.

---

### Task 1: Baseline and move engine files to `engine/`

**Files:**
- Create: `$SCRATCH/verify.sh`, `$SCRATCH/baseline/` (scratchpad, not committed)
- Move: `lib.mjs`, `markings.mjs`, `viewer3d.mjs`, `page.mjs`, `page-head.html` → `engine/`
- Modify: `circuits.mjs:2-3` (imports), `build_labb5.py:25,288,291` (read paths)

**Interfaces:**
- Produces: `engine/lib.mjs`, `engine/markings.mjs`, `engine/viewer3d.mjs`, `engine/page.mjs` and `engine/page-head.html`, with the same contents as before.

- [ ] **Step 1: Build the baseline from the clean tree**

```
git status --short
rm -rf out
./build.sh
cp -r out $SCRATCH/baseline
```
Expected: `git status` prints nothing, the build prints `Built out/labb5.html`, and the baseline holds `labb5.html`, the 6 board `.svg` files, the 6 `.3d.json` files and 2 `sch_ast*.svg` files.

- [ ] **Step 2: Write `$SCRATCH/verify.sh`**

```bash
#!/usr/bin/env bash
# Compares the current build in out/ with the pre-refactor baseline. Usage: verify.sh <baseline dir>
set -u
B="$1"
fail=0
check() {
  local base="$1" new="$2"
  if [ ! -f "$new" ]; then
    new="out/$(basename "$new")"
  fi
  if cmp -s "$base" "$new"; then
    echo "same  $new"
  else
    echo "DIFF  $new"
    fail=1
  fi
}
for k in led rl rc amp ast4 ast5; do
  check "$B/$k.svg" "out/labb5/$k.svg"
  check "$B/$k.3d.json" "out/labb5/$k.3d.json"
done
check "$B/sch_ast4.svg" "out/labb5/sch_ast4.svg"
check "$B/sch_ast5.svg" "out/labb5/sch_ast5.svg"
check "$B/labb5.html" "out/labb5.html"
exit $fail
```

- [ ] **Step 3: Check that verify passes on the unchanged build**

Run: `bash $SCRATCH/verify.sh $SCRATCH/baseline`
Expected: 15 `same` lines, exit 0.

- [ ] **Step 4: Move the engine files**

```
mkdir engine
git mv lib.mjs markings.mjs viewer3d.mjs page.mjs page-head.html engine/
```

- [ ] **Step 5: Run the old build to confirm it now fails**

Run: `./build.sh`
Expected: FAIL, with Node `ERR_MODULE_NOT_FOUND` for `./lib.mjs`.

- [ ] **Step 6: Update the paths**

In `circuits.mjs`:
```js
import { makeBoard, ROW as R } from "./engine/lib.mjs";
import { resistor, filmCap, elcoCap, trimmer, transistor, plain } from "./engine/markings.mjs";
```
In `build_labb5.py`, replace `read("page-head.html")` with `read("engine/page-head.html")`, `read("viewer3d.mjs")` with `read("engine/viewer3d.mjs")` and `read("page.mjs")` with `read("engine/page.mjs")`.

- [ ] **Step 7: Verify**

Run the shared verification. Expected: all `same`, exit 0.

- [ ] **Step 8: Commit**

```
git add -A
git commit -m "Move engine files into engine/" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Board runner and `guides/labb5/boards.mjs`

**Files:**
- Create: `engine/boards.mjs`
- Move: `circuits.mjs` → `guides/labb5/boards.mjs` (then edit)
- Modify: `engine/lib.mjs` (colour exports), `build_labb5.py:12,74` (read from `out/labb5/`), `build.sh:5`

**Interfaces:**
- Consumes: `makeBoard`, `ROW` from `engine/lib.mjs`.
- Produces:
  - CLI `node engine/boards.mjs <guide>`, which writes `out/<guide>/<key>.svg` and `out/<guide>/<key>.3d.json`.
  - Guide contract: `guides/<id>/boards.mjs` has `export default { [key]: () => ({ b, names, info?, pinned?, VH, title, desc }) }`.
  - `engine/lib.mjs` exports `AMBER = "#BA7517"`, `TEAL = "#1D9E75"`, `RED = "#E24B4A"` and `BLACK = "#2C2C2A"`.

- [ ] **Step 1: Add the colour exports to `engine/lib.mjs`**

Insert after the `export const ROW = …` line (line 4):
```js
// Lead and probe colours shared by every guide's boards.
export const AMBER = "#BA7517";
export const TEAL = "#1D9E75";
export const RED = "#E24B4A";
export const BLACK = "#2C2C2A";
```

- [ ] **Step 2: Write `engine/boards.mjs`**

```js
// Board runner: node engine/boards.mjs <guide>
// Builds every board in guides/<guide>/boards.mjs and writes out/<guide>/<key>.svg (fallback drawing) and
// out/<guide>/<key>.3d.json (3D model). Prints each board's anchor coordinates as JSON, for pinning tags.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
if (!id) {
  console.error("usage: node engine/boards.mjs <guide>");
  process.exit(1);
}
const guideDir = join(root, "guides", id);
const boardsFile = join(guideDir, "boards.mjs");
if (!existsSync(boardsFile)) {
  console.error(`boards.mjs: no board file guides/${id}/boards.mjs`);
  process.exit(1);
}
const pillsFile = join(guideDir, "pills.json");
const placed = existsSync(pillsFile) ? JSON.parse(readFileSync(pillsFile, "utf8")) : {};
const out = join(root, "out", id);
mkdirSync(out, { recursive: true });

// Tag position precedence: pills.json[key][anchorKey] > pinned > auto-placement.
const finish = (key, { b, names, info = {}, pinned = {}, VH, title, desc }) => {
  const spec = { ...pinned, ...placed[key] };
  const report = {};
  for (const [name, anchorKey, cls] of names) {
    const a = b.anchors[anchorKey];
    report[anchorKey] = a;
    const pos = spec[anchorKey] || [null, null];
    b.pill(name, pos[0], pos[1], cls || "c-purple", anchorKey, info[anchorKey]);
  }
  writeFileSync(join(out, `${key}.svg`), b.render(VH, title, desc, `bb-${key}`));
  writeFileSync(join(out, `${key}.3d.json`), JSON.stringify(b.model3d()));
  console.log(key, JSON.stringify(report));
};

const { default: boards } = await import(pathToFileURL(boardsFile).href);
for (const [key, build] of Object.entries(boards)) {
  finish(key, build());
}
```

- [ ] **Step 3: Move `circuits.mjs` and edit it into a guide file**

```
mkdir -p guides/labb5
git mv circuits.mjs guides/labb5/boards.mjs
```
Then make these exact edits in `guides/labb5/boards.mjs`:

a. Replace lines 1–26 (the imports, the colour constants, `OUT`, `pillsFile`, `placed`, `mkdirSync` and the whole `finish` function) with:
```js
// Labb 5 boards. Each builder returns the board plus its tags; engine/boards.mjs places the tags and writes the files.
import { makeBoard, ROW as R, AMBER, TEAL, RED, BLACK } from "../../engine/lib.mjs";
import { resistor, filmCap, elcoCap, trimmer, transistor, plain } from "../../engine/markings.mjs";
```

b. In `ledBoard`: replace `  finish("led", b, {` with `  return {` followed by a new line `    b,`, and replace that call's closing `  });` with `  };`.

c. `const filter = (key, kind) => {` becomes `const filter = (kind) => {`. Replace `  finish(key, b, {` with `  return {` followed by `    b,`, and its closing `  });` with `  };`.

d. In `ampBoard`: replace `  finish("amp", b, {` with `  return {` followed by `    b,`, and its closing `  });` with `  };`.

e. `const astable = (key, variable) => {` becomes `const astable = (variable) => {`. Replace `  finish(key, b, {` with `  return {` followed by `    b,`, and its closing `  });` with `  };`.

f. Replace the six calls at the end of the file (`ledBoard();` through `astable("ast5", true);`) with:
```js
export default {
  led: ledBoard,
  rl: () => filter("rl"),
  rc: () => filter("rc"),
  amp: ampBoard,
  ast4: () => astable(false),
  ast5: () => astable(true),
};
```

- [ ] **Step 4: Point `build.sh` and `build_labb5.py` at the new runner and paths**

In `build.sh`, replace `node circuits.mjs` with `node engine/boards.mjs labb5`.

In `build_labb5.py`:
- `view3d`: `read(f"{OUT}/{key}.3d.json")` becomes `read(f"{OUT}/labb5/{key}.3d.json")`.
- `section`: `read(f"{OUT}/{bb}.svg")` becomes `read(f"{OUT}/labb5/{bb}.svg")`.

- [ ] **Step 5: Verify**

Run the shared verification. Expected: all `same` (the board files are now found at `out/labb5/`), exit 0.

- [ ] **Step 6: Commit**

```
git add -A
git commit -m "Add board runner and move Labb 5 boards to guides/labb5" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Schematic helpers and `guides/labb5/schematics.py`

**Files:**
- Move: `sch_ast.py` → `engine/schlib.py` (then trim it)
- Create: `engine/__init__.py` (empty), `guides/labb5/schematics.py`
- Modify: `build.sh:6`, `build_labb5.py:196,231`

**Interfaces:**
- Produces:
  - `engine.schlib` exports `P`, `AM`, `TE`, `ARROW`, `npn(bar_x, cy, side)`, `res_v(x, y1, y2)`, `cap_h(x1, x2, y, plus_left)`, `dot(x, y, c=P)`, `t(x, y, txt, cls="ts", anchor="start")`, `ground(x, y)`, `probe_box(x, y, title, sub, cls, ax, ay, color)` and `led_down(x, y)`.
  - CLI `python -m guides.labb5.schematics`, which writes `out/labb5/sch_ast4.svg` and `out/labb5/sch_ast5.svg`.

- [ ] **Step 1: Move and trim**

```
git mv sch_ast.py engine/schlib.py
```
Create an empty `engine/__init__.py`. In `engine/schlib.py`:
- Delete `import os`, the blank line after it, and `OUT = "out"`.
- Add the docstring `"""Schematic drawing helpers in the house style: 680-wide viewBox, var(--p) strokes, page CSS text classes."""` as line 1.
- Cut `def fig4():` … `return "".join(s)` (the whole function) and `def fig5():` … its `return "".join(s)`, and paste them into the new file below.
- Delete the last five lines (`os.makedirs(...)` and both `with open(...)` blocks).
- Keep `led_down`.

- [ ] **Step 2: Write `guides/labb5/schematics.py`**

```python
"""Generated Labb 5 schematics: python -m guides.labb5.schematics -> out/labb5/sch_ast4.svg, sch_ast5.svg"""
from pathlib import Path

from engine.schlib import AM, ARROW, P, TE, cap_h, dot, ground, led_down, npn, probe_box, res_v, t

OUT = Path("out/labb5")


# <paste fig4() exactly as cut from sch_ast.py>


# <paste fig5() exactly as cut from sch_ast.py>


OUT.mkdir(parents=True, exist_ok=True)
for name, svg in (("sch_ast4.svg", fig4()), ("sch_ast5.svg", fig5())):
    with open(OUT / name, "w", encoding="utf-8") as fh:
        fh.write(svg)
```
The two paste markers stand for code moved verbatim (it is shown in full in `sch_ast.py` at commit `e63aec0`, lines 63–95 and 105–151). Replace each marker with the function body; leave no marker in the file.

- [ ] **Step 3: Point `build.sh` and `build_labb5.py` at the new paths**

In `build.sh`, replace `"$PYTHON" sch_ast.py` with `"$PYTHON" -m guides.labb5.schematics`.
In `build_labb5.py`, replace `f"{OUT}/sch_ast4.svg"` with `f"{OUT}/labb5/sch_ast4.svg"` and `f"{OUT}/sch_ast5.svg"` with `f"{OUT}/labb5/sch_ast5.svg"`.

- [ ] **Step 4: Verify**

Run the shared verification. Expected: all `same`, exit 0.

- [ ] **Step 5: Commit**

```
git add -A
git commit -m "Split schematic helpers into engine/schlib.py" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Page runner, page kit and `guides/labb5/guide.py`

**Files:**
- Create: `engine/page_kit.py`, `engine/build_page.py`, `guides/labb5/guide.py`
- Move: `schematics/` → `guides/labb5/schematics/`
- Delete: `build_labb5.py`
- Modify: `build.sh:7-8`

**Interfaces:**
- Consumes: `out/<id>/<key>.svg` and `.3d.json` (Task 2), `out/labb5/sch_ast*.svg` (Task 3).
- Produces:
  - `engine.page_kit`: `TABLE_HEADS`, `LEGEND`, `node(label, kind="")`, `c(x)`, `table(rows)`, `cards(items)` and `section(*, id, nav, eyebrow, title, lede, schematic, rows, cards, sch_cap, bb_cap) -> dict`.
  - `engine.build_page`: `ENGINE`, `ROOT`, `OUT` (`Path`s), `read(path)`, `fail(msg)`, and the CLI `python -m engine.build_page <guide>`.
  - Guide contract: `guides/<id>/guide.py` defines `GUIDE = {"title", "eyebrow", "h1", "lede", "sections", optional "legend"}`.

- [ ] **Step 1: Write `engine/page_kit.py`**

```python
"""Content helpers for guide pages. A guide's guide.py imports these to write its sections."""

# Node table columns. data-label repeats them on each cell for the stacked small-screen layout (page-head.html).
TABLE_HEADS = ["Node", "Board location", "What plugs in"]

LEGEND = """<section class="card" aria-label="How to read the drawings">
<h3>How to read the drawings</h3>
<div class="legend">
<span><i class="swatch-tag" style="background:var(--tag-fill);border-color:var(--tag-stroke)"></i>Component tag, purple pointer</span>
<span><i class="swatch-tag" style="background:var(--amber-fill);border-color:var(--amber-stroke)"></i>Input node, CH1</span>
<span><i class="swatch-tag" style="background:var(--teal-fill);border-color:var(--teal-stroke)"></i>Output node, CH2</span>
<span><i class="swatch-tag" style="background:var(--chip);border-color:var(--line-strong)"></i>Bridges and helper wires</span>
<span><i class="sw" style="height:8px;width:8px;border-radius:50%;background:#fff;border:2px solid #D85A30"></i>Hole in use</span>
<span><i class="sw" style="background:#E24B4A"></i>Supply + lead</span>
<span><i class="sw" style="background:#2C2C2A;outline:1px solid var(--line-strong)"></i>Ground wire</span>
<span><i class="sw" style="height:4px;background:repeating-linear-gradient(90deg,#2C2C2A 0 7px,#F6F4EE 7px 11px);outline:1px solid var(--line-strong)"></i>Ground clip lead</span>
</div>
<p class="note">Holes are written column then row, so <code>8a</code> is column 8, row a. Each column's five holes a–e are connected, and so are f–j. The long + and − rails run along the edges.</p>
</section>
"""


def node(label, kind=""):
    return f'<span class="node {kind}">{label}</span>'


def c(x):
    return f"<code>{x}</code>"


def table(rows):
    cells = lambda row: "".join(f'<td data-label="{h}">{v}</td>' for h, v in zip(TABLE_HEADS, row))
    body = "".join(f"<tr>{cells(row)}</tr>" for row in rows)
    head = "".join(f"<th>{h}</th>" for h in TABLE_HEADS)
    return f'<div class="table-wrap"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def cards(items):
    out = []
    for title, kind, content in items:
        if kind == "dl":
            inner = "<dl>" + "".join(f"<dt>{k}</dt><dd>{v}</dd>" for k, v in content) + "</dl>"
        else:
            inner = "<ul>" + "".join(f"<li>{x}</li>" for x in content) + "</ul>"
        out.append(f'<div class="card"><h3>{title}</h3>{inner}</div>')
    return '<div class="cols">' + "".join(out) + "</div>"


def section(*, id, nav, eyebrow, title, lede, schematic, rows, cards, sch_cap, bb_cap):
    """One circuit. id is also the board key in boards.mjs and the nav anchor; nav is (short label, name);
    schematic is a file name in out/<guide>/ (generated) or guides/<guide>/schematics/ (hand-written)."""
    return {"id": id, "nav": nav, "eyebrow": eyebrow, "title": title, "lede": lede, "schematic": schematic,
            "rows": rows, "cards": cards, "sch_cap": sch_cap, "bb_cap": bb_cap}
```
Copy the `LEGEND` text from `build_labb5.py:27-41` (the `legend = """…"""` string) byte for byte; the block above should match it exactly.

- [ ] **Step 2: Write `engine/build_page.py`**

```python
"""Page runner: python -m engine.build_page <guide>

Assembles out/<guide>.html from guides/<guide>/guide.py, the boards built by engine/boards.mjs and the schematics."""
import importlib
import sys
from pathlib import Path

from engine.page_kit import LEGEND, cards, table

ENGINE = Path(__file__).parent
ROOT = ENGINE.parent
OUT = ROOT / "out"
THREE = "https://cdn.jsdelivr.net/npm/three@0.186.1"


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def fail(msg):
    sys.exit(f"build_page: {msg}")


def view3d(gid, key):
    # Model JSON sits in a data script; "</" is escaped so the JSON can't close the script element early.
    model = read(OUT / gid / f"{key}.3d.json").replace("</", "<\\/")
    return (f'<div class="drawing view-3d"><div class="stage" data-model="model-{key}"></div>'
            f'<p class="note">Drag to orbit, right-drag to pan, scroll to zoom. On touch screens, swipe sideways to orbit, or use two fingers to tilt and zoom.</p>'
            f'<script type="application/json" id="model-{key}">{model}</script></div>')


def caption(label, text):
    # The full-screen button only works with the page script, which unhides it.
    button = ('<button type="button" class="fs-toggle" hidden><svg viewBox="0 0 16 16" aria-hidden="true">'
              '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg><span>Full screen</span></button>')
    return f'<figcaption><b>{label}</b> <span>{text}</span>{button}</figcaption>'


def schematic(gid, name):
    places = [OUT / gid / name, ROOT / "guides" / gid / "schematics" / name]
    found = [p for p in places if p.exists()]
    if len(found) != 1:
        where = "both" if found else "neither"
        fail(f"schematic {name} must be in exactly one of out/{gid}/ (generated) or guides/{gid}/schematics/ (hand-written); found in {where}")
    return read(found[0])


def board(gid, key):
    path = OUT / gid / f"{key}.svg"
    if not path.exists():
        fail(f"no board for section '{key}': add it to guides/{gid}/boards.mjs and run node engine/boards.mjs {gid}")
    return read(path)


def render_section(gid, s):
    key = s["id"]
    sch = schematic(gid, s["schematic"])
    bb = board(gid, key)
    sch_cap = caption("SCHEMATIC", s["sch_cap"])
    bb_cap = caption("BREADBOARD", s["bb_cap"])
    return f"""<section class="circuit" id="{key}">
<header><div class="eyebrow">{s['eyebrow']}</div><h2>{s['title']}</h2><p>{s['lede']}</p></header>
<figure>{sch_cap}<div class="drawing">{sch}</div></figure>
<figure>{bb_cap}<div class="drawing view-iso">{bb}</div>{view3d(gid, key)}</figure>
{table(s['rows'])}
{cards(s['cards'])}
</section>
"""


def load_guide(gid):
    if not (ROOT / "guides" / gid / "guide.py").exists():
        fail(f"no guide guides/{gid}/guide.py")
    return importlib.import_module(f"guides.{gid}.guide").GUIDE


def build(gid):
    guide = load_guide(gid)
    sections = guide["sections"]
    head = read(ENGINE / "page-head.html") + f"<title>{guide['title']}</title>\n"
    legend = guide.get("legend", LEGEND)
    body_sections = "".join(render_section(gid, s) for s in sections)
    # On wide screens the nav is a sticky sidebar spanning every row of main's content column: the header, toolbar,
    # legend and one row per section (see page-head.html).
    links = "".join(f'<a href="#{s["id"]}"><span>{s["nav"][0]}</span>{s["nav"][1]}</a>' for s in sections)
    nav = f'<nav class="jump" aria-label="Circuits" style="--rows: {3 + len(sections)}">{links}</nav>'
    body = f"""<main>
<header>
<div class="eyebrow">{guide['eyebrow']}</div>
<h1>{guide['h1']}</h1>
<p class="lede">{guide['lede']}</p>
</header>
{nav}
<div class="toolbar">
<fieldset class="seg">
<legend>Labels</legend>
<label><input type="checkbox" id="show-tags" checked>Show</label>
</fieldset>
</div>
{legend}
{body_sections}
</main>
<script type="importmap">{{"imports": {{"three": "{THREE}/build/three.module.js", "three/addons/": "{THREE}/examples/jsm/"}}}}</script>
<script type="text/plain" id="viewer-src">
{read(ENGINE / "viewer3d.mjs")}
</script>
<script type="module">
{read(ENGINE / "page.mjs")}
</script>
"""
    with open(OUT / f"{gid}.html", "w", encoding="utf-8") as fh:
        fh.write(head + body)
    print(len(head + body))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        fail("usage: python -m engine.build_page <guide>")
    build(sys.argv[1])
```

- [ ] **Step 3: Move the hand-written schematics**

```
git mv schematics guides/labb5/schematics
```

- [ ] **Step 4: Write `guides/labb5/guide.py`**

```python
"""Labb 5 page content. Section ids match the board keys in boards.mjs."""
from engine.page_kit import c, node, section

SECTIONS = [
    section(
        id="led", nav=("p.2", "LED indicator"), eyebrow="Prep task · page 2", title="LED voltage indicator",
        lede="A LED shows that the 12 V supply is on. R limits the current so the LED gets its 2.5 V and 20 mA.",
        schematic="sch_led.svg",
        rows=[
            (node("Uin +12 V"), "Top + rail", "Supply red lead at col 2; LED anode (long leg) at col 5"),
            (node("LED–R"), "Col 5, rows a–e", f"LED cathode {c('5a')}, R {c('5c')}, multimeter red probe {c('5e')}"),
            (node("Uin 0 V"), "Top − rail", "Supply black lead at col 2; R at col 8; multimeter black probe at col 9"),
        ],
        cards=[
            ("Worked value", "dl", [
                ("R", "(12 V − 2.5 V) / 20 mA = 475 Ω → 470 Ω (E12)"),
                ("I", "9.5 V / 470 Ω ≈ 20.2 mA"),
                ("P<sub>R</sub>", "9.5 V × 20 mA ≈ 0.19 W"),
                ("Rating", "0.5 W. A 0.25 W part would run at about 80 % of its limit and get hot."),
            ]),
            ("Wiring checks", "ul", [
                "The LED's long leg (anode) goes to +12 V. The flat edge on the rim marks the cathode.",
                "Put the multimeter on DC volts and probe across R. Expect about 9.5 V.",
                "To read the current, break the circuit at col 5 and put the meter in series on its mA range.",
            ]),
        ],
        sch_cap="Uin through D1 and R, multimeter across R",
        bb_cap="LED from the + rail into col 5, R from col 5 to the − rail",
    ),
    section(
        id="rl", nav=("Fig 1", "RL circuit"), eyebrow="Figure 1 · page 3", title="RL circuit",
        lede="The inductor resists fast changes in current, so a square wave at Uin comes out with rounded edges across R1. The rounding gets worse as the frequency rises.",
        schematic="sch_rl.svg",
        rows=[
            (node("Uin", "in"), "Col 3, rows a–e", f"CH1 probe tip {c('3a')}, L1 {c('3c')}, generator signal {c('3e')}"),
            (node("Uut", "out"), "Col 8, rows a–e", f"CH2 probe tip {c('8a')}, R1 {c('8b')}, L1 {c('8c')}"),
            (node("GND"), "Top − rail", "Generator ground clip col 2, CH1 clip col 4, CH2 clip col 9, R1 col 10"),
        ],
        cards=[
            ("Settings", "ul", [
                "Generator: square wave, a few volts peak.",
                "Sweep 10 Hz to 100 kHz, two points per decade: 10, 30, 100, 300 Hz and so on.",
                "For the DC part, swap the generator for the bench supply at 10 V: + lead into col 3, − lead into the − rail.",
            ]),
            ("What to expect", "dl", [
                ("τ", "L / R. With 10 mH and 1 kΩ, τ = 10 µs"),
                ("Edges", "Visibly rounded once each half-period is only a few τ, around 10 kHz for 10 mH"),
                ("Level", "Uut settles a little below Uin, because the coil's own wire resistance is in series with R1"),
            ]),
        ],
        sch_cap="L1 in series with R1, Uut across R1",
        bb_cap="L1 from col 3 to col 8, R1 from col 8 to the − rail",
    ),
    section(
        id="rc", nav=("Fig 3", "RC circuit"), eyebrow="Figure 3 · page 4", title="RC charging circuit",
        lede="The capacitor charges and discharges through R each time the square wave flips. CH2 shows the charge curve.",
        schematic="sch_rc.svg",
        rows=[
            (node("Uin", "in"), "Col 3, rows a–e", f"CH1 probe tip {c('3a')}, R {c('3c')}, generator signal {c('3e')}"),
            (node("Uut", "out"), "Col 8, rows a–e", f"CH2 probe tip {c('8a')}, C {c('8b')}, R {c('8c')}"),
            (node("GND"), "Top − rail", "Generator ground clip col 2, CH1 clip col 4, CH2 clip col 9, C col 10"),
        ],
        cards=[
            ("Settings", "dl", [
                ("τ", "R · C = 10 kΩ × 0.22 µF = 2.2 ms (f = 1/τ ≈ 455 Hz)"),
                ("Pulse", "20 τ = 44 ms high, 44 ms low: about 11.4 Hz"),
                ("Amplitude", "5.0 V"),
                ("Scope", "About 20 ms/div shows two pulses"),
            ]),
            ("What to expect", "ul", [
                "63 % of the final value (about 3.2 V) after 2.2 ms.",
                "Essentially fully charged after about 5 τ, roughly 11 ms.",
                "C is 0.22 µF film, so it has no polarity.",
            ]),
        ],
        sch_cap="R in series with C, Uut across C",
        bb_cap="R from col 3 to col 8, C from col 8 to the − rail",
    ),
    section(
        id="amp", nav=("Fig 2", "Amplifier"), eyebrow="Figure 2 · page 5", title="Common emitter amplifier",
        lede="One BC108B gives a large, inverted copy of a small input signal.",
        schematic="sch.svg",
        rows=[
            (node("V1 +12 V"), "Top + rail", "Supply red lead at col 2; R1 to rail at col 11; R3 to rail at col 14"),
            (node("GND"), "Top − rail, bottom − rail, bridged at col 19", "Supply black lead (col 2, top); CH1 and CH2 ground clips (cols 9 and 15, top); generator ground (col 3, bottom); R2, R4 and C3 (−) on the bottom rail"),
            (node("Uin", "in"), "Col 8, rows a–e", f"CH1 probe tip {c('8a')}, C1 {c('8b')}, generator signal {c('8d')}"),
            (node("B"), "Col 11, a–e and f–j", f"R1 {c('11a')}, C1 {c('11b')}, Q3 base {c('11d')}, jumper {c('11e')}→{c('11f')}, R2 {c('11j')}"),
            (node("C"), "Col 12, rows a–e", f"R3 {c('12a')}, C2 {c('12c')}, Q3 collector {c('12d')}"),
            (node("E"), "Col 10 a–e, col 7 f–j", f"Q3 emitter {c('10d')}, jumper {c('10e')}→{c('7f')}, C3 (+) {c('7i')}, R4 {c('7j')}"),
            (node("Uut", "out"), "Col 16, rows a–e", f"CH2 probe tip {c('16a')}, C2 {c('16c')}"),
        ],
        cards=[
            ("Expected DC levels", "dl", [
                ("V<sub>B</sub>", "≈ 3.6 V (12 V × 12k / 39k)"),
                ("V<sub>E</sub>", "≈ 3.0 V"),
                ("I<sub>C</sub>", "≈ 2.0 mA (V<sub>E</sub> / R4)"),
                ("V<sub>C</sub>", "≈ 7.6 V (12 V − 2 mA × 2.2k)"),
            ]),
            ("Settings and readings", "ul", [
                "Make about 10 mV by setting 100 mVpp and dividing with 10 kΩ in series and 1 kΩ to ground: 100 × 1/11 ≈ 9 mVpp.",
                "CH2: about 1.5–1.7 Vpp, inverted from CH1.",
                "Gain ≈ R3 / r<sub>e</sub> ≈ 2.2k / 13 Ω ≈ 170. Pull C3 and it drops to about 1.5.",
                "Low-frequency roll-off around 60 Hz, set mostly by C1.",
            ]),
            ("Wiring checks", "ul", [
                "BC108B is a TO-18 metal can. The tab marks the emitter; going round from it the pins are E, B, C.",
                "C1 and C2 are 1 µF non-polarised. C3 is electrolytic with + to the emitter.",
                "Above about 20 mVpp in, the output starts to distort.",
            ]),
        ],
        sch_cap="Voltage-divider bias, bypassed emitter, probe points",
        bb_cap="Q3 across cols 10–12, input strip col 8, output strip col 16",
    ),
    section(
        id="ast4", nav=("Fig 4", "Astable"), eyebrow="Figure 4 · page 6", title="Astable multivibrator",
        lede="Two transistors take turns switching each other on and off through the capacitors, so each collector makes a square wave. Values here are examples, since the PDF doesn't give any.",
        schematic="sch_ast4.svg",
        rows=[
            (node("+9 V"), "Top + rail", "Supply red lead col 2; R1 at cols 7 and 14; R2 at cols 4 and 17"),
            (node("GND"), "Bottom − rail, top − rail via col 21 bridge", "Supply black lead col 1 (bottom); emitter jumpers from cols 5 and 16; CH1 clip col 8 and CH2 clip col 13 (top)"),
            (node("Q1 C", "in"), "Col 7, rows a–e", f"R1 {c('7a')}, C (+) {c('7b')}, Q1 collector {c('7c')}, CH1 tip {c('7d')}"),
            (node("Q1 B"), "Col 6, rows a–e", f"C (−) from Q2's collector {c('6a')}, R2 {c('6b')}, Q1 base {c('6c')}"),
            (node("Q1 E"), "Col 5", f"Q1 emitter {c('5c')}, jumper {c('5e')} → bottom − rail"),
            (node("Q2 C", "out"), "Col 14, rows a–e", f"R1 {c('14a')}, C (+) {c('14b')}, Q2 collector {c('14c')}, CH2 tip {c('14d')}"),
            (node("Q2 B"), "Col 15, rows a–e", f"C (−) from Q1's collector {c('15a')}, R2 {c('15b')}, Q2 base {c('15c')}"),
            (node("Q2 E"), "Col 16", f"Q2 emitter {c('16c')}, jumper {c('16e')} → bottom − rail"),
        ],
        cards=[
            ("Example values", "dl", [
                ("R1", "1 kΩ (collector)"),
                ("R2", "47 kΩ (base)"),
                ("C", "10 µF electrolytic, + to the collector side"),
                ("Q", "BC547B or similar NPN"),
                ("f", "≈ 1 / (1.39 · R2 · C) ≈ 1.5 Hz"),
            ]),
            ("Measuring", "ul", [
                "CH1 on Q1's collector, CH2 on Q2's collector, timebase about 200 ms/div.",
                "The two collectors swing between near 0 V and +9 V in opposite phase.",
                "Move a probe to a base to see the sharp negative dip when the capacitor flips.",
            ]),
            ("Wiring checks", "ul", [
                "Q1's legs land E, B, C in cols 5, 6, 7. Q2's land C, B, E in cols 14, 15, 16. Check your transistor's pinout.",
                "The capacitor legs cross behind the transistors, like the X in the schematic.",
            ]),
        ],
        sch_cap="Cross-coupled pair with collector resistors R1 and base resistors R2",
        bb_cap="Q1 in cols 5–7, Q2 in cols 14–16, capacitors crossing behind them",
    ),
    section(
        id="ast5", nav=("Fig 5", "Variable astable"), eyebrow="Figure 5 · page 6", title="Variable astable multivibrator",
        lede="The Sagitta kit version: LEDs in the collector lines show the switching, and RP1 shifts resistance between the two base resistors so you can change the blink times. Values are examples.",
        schematic="sch_ast5.svg",
        rows=[
            (node("+9 V"), "Top + rail, bottom + rail via col 20 bridge", "Supply red lead col 2; LED1 anode col 3; LED2 anode col 18; RP1 wiper jumper from col 10 (bottom)"),
            (node("GND"), "Bottom − rail, top − rail via col 21 bridge", "Supply black lead col 1 (bottom); emitter jumpers from cols 5 and 16; CH1 clip col 8 and CH2 clip col 13 (top)"),
            (node("LED1–R1"), "Col 3, rows a–e", f"LED1 cathode {c('3a')}, R1 {c('3b')}"),
            (node("UT1 C", "in"), "Col 7, rows a–e", f"R1 {c('7a')}, C1 (+) {c('7b')}, UT1 collector {c('7c')}, CH1 tip {c('7d')}"),
            (node("UT1 B"), "Col 6, rows a–e", f"C2 (−) {c('6a')}, UT1 base {c('6c')}, R3 {c('6e')}"),
            (node("UT2 C", "out"), "Col 14, rows a–e", f"R4 {c('14a')}, C2 (+) {c('14b')}, UT2 collector {c('14c')}, CH2 tip {c('14d')}"),
            (node("UT2 B"), "Col 15, rows a–e", f"C1 (−) {c('15a')}, UT2 base {c('15c')}, R2 {c('15e')}"),
            (node("RP1"), "Cols 9–11, row g", f"Ends: col 9 to R3 {c('9f')}, col 11 to R2 {c('11f')}. Wiper col 10, jumper {c('10j')} → bottom + rail"),
        ],
        cards=[
            ("Example values", "dl", [
                ("R1, R4", "470 Ω (LED current ≈ 15 mA)"),
                ("R2, R3", "10 kΩ"),
                ("RP1", "100 kΩ trimmer"),
                ("C1, C2", "10 µF electrolytic, + to the collector side"),
                ("Half-period", "≈ 0.69 · (R + RP1 part) · C: about 0.07 s to 0.76 s"),
            ]),
            ("Measuring", "ul", [
                "CH1 on UT1's collector, CH2 on UT2's collector.",
                "Turn RP1 and watch one half-period grow while the other shrinks.",
                "With RP1 centred, expect about 1.2 Hz and LEDs blinking alternately.",
            ]),
            ("Wiring checks", "ul", [
                "LED long legs go into the + rail.",
                "R2 and R3 cross the centre channel to reach the pot in the bottom half.",
                "The bottom + rail only gets power through the red bridge at col 20.",
            ]),
        ],
        sch_cap="LEDs in the collector lines, RP1 setting the base resistance",
        bb_cap="Same transistor layout as Fig. 4, pot RP1 in the bottom half",
    ),
]

GUIDE = {
    "title": "Labb 5 Breadboard Guide",
    "eyebrow": "TNE108 Labbintroduktion · Labb 5 Analoga kopplingar",
    "h1": "Labb 5 circuits, schematic to breadboard",
    "lede": "Every circuit from the lab PM, drawn as a schematic and as a breadboard layout with the same part names. Each one shows where the supply, generator and scope probes connect.",
    "sections": SECTIONS,
}
```
All text strings are copied verbatim from `build_labb5.py`; `verify.sh` catches any typo.

- [ ] **Step 5: Switch `build.sh` over and delete the old builder**

In `build.sh`, replace the last two lines with:
```
"$PYTHON" -m engine.build_page labb5
echo "Built out/labb5.html"
```
Then run `git rm build_labb5.py`.

- [ ] **Step 6: Verify**

Run the shared verification. Expected: all `same`, exit 0. If `labb5.html` differs, diff it against the baseline with `cmp` and `diff <(tr '>' '\n' < $SCRATCH/baseline/labb5.html) <(tr '>' '\n' < out/labb5.html) | head` and fix the copied text.

- [ ] **Step 7: Review Focus #3, missing or duplicated schematic**

Run: `git mv guides/labb5/schematics/sch_rc.svg guides/labb5/schematics/sch_rc.tmp`, then `python -m engine.build_page labb5`
Expected: exit 1, `build_page: schematic sch_rc.svg must be in exactly one of out/labb5/ (generated) or guides/labb5/schematics/ (hand-written); found in neither`.
Restore it: `git mv guides/labb5/schematics/sch_rc.tmp guides/labb5/schematics/sch_rc.svg`

Run: `cp guides/labb5/schematics/sch_rc.svg out/labb5/sch_rc.svg`, then `python -m engine.build_page labb5`
Expected: exit 1, `… found in both`.
Clean up: `rm out/labb5/sch_rc.svg`

- [ ] **Step 8: Review Focus #4, section without a board**

Run: `rm out/labb5/rc.svg`, then `python -m engine.build_page labb5`
Expected: exit 1, `build_page: no board for section 'rc': add it to guides/labb5/boards.mjs and run node engine/boards.mjs labb5`.
Run the shared verification again to restore `out/`. Expected: all `same`.

- [ ] **Step 9: Commit**

```
git add -A
git commit -m "Add page runner and move Labb 5 page content to guides/labb5" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Index page, multi-guide `build.sh`, deploy

**Files:**
- Create: `engine/build_index.py`
- Modify: `build.sh` (full rewrite), `.github/workflows/pages.yml:1,35`

**Interfaces:**
- Consumes: `ENGINE`, `ROOT`, `OUT`, `read` from `engine.build_page`; `GUIDE` from each `guides/*/guide.py`.
- Produces: `out/index.html`; `./build.sh [guide…]`.

- [ ] **Step 1: Write `engine/build_index.py`**

```python
"""Index page: python -m engine.build_index

Writes out/index.html with one card per guide in guides/, linking to <guide>.html."""
import importlib

from engine.build_page import ENGINE, OUT, ROOT, read

# Index-only CSS. page-head.html is inlined into every guide page, so index styles stay out of it.
STYLE = """<style>
/* No circuit nav here, so no sidebar column on wide screens. */
@media (min-width: 1180px) {
  main.index { max-width: 900px; grid-template-columns: none; }
  main.index > * { grid-column: auto; }
}
a.card { color: inherit; text-decoration: none; transition: border-color 150ms; }
a.card:hover, a.card:focus-visible { border-color: var(--ink); outline: none; }
a.card p { margin: 0; color: var(--muted); }
@media (prefers-reduced-motion: reduce) {
  a.card { transition: none; }
}
</style>
"""


def guide_ids():
    return sorted(p.parent.name for p in (ROOT / "guides").glob("*/guide.py"))


def card(gid):
    g = importlib.import_module(f"guides.{gid}.guide").GUIDE
    return (f'<a class="card" href="{gid}.html"><div class="eyebrow">{g["eyebrow"]}</div>'
            f'<h3>{g["h1"]}</h3><p>{g["lede"]}</p></a>')


def build():
    head = read(ENGINE / "page-head.html") + "<title>Breadboard Guides</title>\n" + STYLE
    links = "".join(card(gid) for gid in guide_ids())
    body = f"""<main class="index">
<header>
<div class="eyebrow">Breadboard guides</div>
<h1>Schematic to breadboard</h1>
<p class="lede">Lab circuits drawn as schematics and as 3D breadboard layouts, with the same part names in both.</p>
</header>
<div class="cols">{links}</div>
</main>
"""
    OUT.mkdir(exist_ok=True)
    with open(OUT / "index.html", "w", encoding="utf-8") as fh:
        fh.write(head + body)


if __name__ == "__main__":
    build()
```

- [ ] **Step 2: Rewrite `build.sh`**

```bash
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
  if [ ! -f "guides/$id/guide.py" ]; then
    echo "build.sh: no guide guides/$id/guide.py" >&2
    exit 1
  fi
done
for id in "${guides[@]}"; do
  node engine/boards.mjs "$id"
  if [ -f "guides/$id/schematics.py" ]; then
    "$PYTHON" -m "guides.$id.schematics"
  fi
  "$PYTHON" -m engine.build_page "$id"
  echo "Built out/$id.html"
done
"$PYTHON" -m engine.build_index
echo "Built out/index.html"
```
Every guide is validated before any is built, so a bad folder fails fast.

- [ ] **Step 3: Verify Labb 5 is unchanged**

Run the shared verification. Expected: all `same`, exit 0, and `out/index.html` exists.

- [ ] **Step 4: Review Focus #1 and #2, bad guide names**

Run: `./build.sh nosuch`
Expected: exit 1, `build.sh: no guide guides/nosuch/guide.py`.

Run: `mkdir guides/bad-name`, then `cp guides/labb5/guide.py guides/bad-name/`, then `./build.sh`
Expected: exit 1, `build.sh: guide folder 'bad-name' must be a valid Python identifier (letters, digits, _)`, printed before any `node` output.
Clean up: `rm -r guides/bad-name`

- [ ] **Step 5: Review Focus #5 and success criterion 4, a second guide with the same board keys**

```
cp -r guides/labb5 guides/demo
rm -rf out
./build.sh
bash $SCRATCH/verify.sh $SCRATCH/baseline
ls out out/demo
grep -o 'href="[a-z0-9_]*\.html"' out/index.html
```
Expected:
- the verify lines are all `same`;
- `out/demo.html` and `out/demo/rc.svg` exist alongside `out/labb5/`;
- the index has `href="demo.html"` and `href="labb5.html"`, in that order.

Clean up: `rm -r guides/demo out/demo out/demo.html`

- [ ] **Step 6: Browser check**

Start `python -m http.server 8000 --directory out` in the background. In Chrome (claude-in-chrome), open `http://localhost:8000/index.html?v=1` and check:
- the card links to `labb5.html`;
- `labb5.html?v=1` loads its 3D boards;
- the index at 1280 px wide shows no empty sidebar column;
- at 320 px wide there is no sideways scroll;
- light and dark themes both work (emulate `prefers-color-scheme`).

Run the `marpe-web` skill on `engine/build_index.py`'s markup and CSS and fix what it finds.

- [ ] **Step 7: Update the deploy workflow**

In `.github/workflows/pages.yml`, line 1 becomes `# Builds every guide plus the index page and publishes them to GitHub Pages.` and `cp out/labb5.html _site/index.html` becomes `cp out/*.html _site/`.

- [ ] **Step 8: Commit**

```
git add -A
git commit -m "Add guide index page and build every guide" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Docs and the `page.mjs` header

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `engine/page.mjs:2-3`

- [ ] **Step 1: README**

- **Line 3:** `Builds one page per guide in guides/ (out/<guide>.html) plus out/index.html listing them: schematics and 3D breadboard layouts (with instruments, cables and probes). The first guide is the TNE108 Labb 5 circuits.`
- **Build section:** add `./build.sh labb5` (one guide plus the index) under `./build.sh`.
- **Deploy paragraph:** "serves `labb5.html` as the site's `index.html`" becomes "serves every guide page plus the guide index as the site's `index.html`".
- **File table:** replace the rows with:

| File | What it does |
| --- | --- |
| `engine/lib.mjs` | Breadboard drawing library (unchanged description) |
| `engine/markings.mjs` | (unchanged description) |
| `engine/boards.mjs` | Board runner: builds `guides/<id>/boards.mjs` into `out/<id>/<key>.svg` and `.3d.json` |
| `engine/build_page.py` | Page runner: assembles `out/<id>.html` from `guides/<id>/guide.py` |
| `engine/page_kit.py` | Helpers guides use to write sections: `section`, `node`, `c`, the default legend |
| `engine/schlib.py` | Schematic drawing helpers for generated schematics |
| `engine/build_index.py` | Writes `out/index.html` |
| `engine/viewer3d.mjs`, `engine/page.mjs`, `engine/page-head.html` | (existing descriptions) |
| `guides/labb5/` | The Labb 5 guide |

- **Paths:** change `circuits.mjs` to `guides/<id>/boards.mjs` in the tooltip and tag paragraphs. The `pills.json` example becomes `guides/<id>/pills.json`.
- **New section "Adding a guide":**

```markdown
## Adding a guide

Create `guides/<id>/` (`<id>` must be a valid Python identifier, e.g. `labb6`) with:

- `boards.mjs`: `export default { <key>: () => ({ b, names, info, pinned, VH, title, desc }) }`. Build `b` with `makeBoard()` from `../../engine/lib.mjs`; see `guides/labb5/boards.mjs`.
- `guide.py`: `GUIDE = {"title", "eyebrow", "h1", "lede", "sections": [section(id=<key>, nav=(short, name), …)]}`, using helpers from `engine.page_kit`. Every section `id` needs a board with the same key. Keep it free of side effects; the index imports it.
- `schematics/`: hand-written SVGs (680-wide `viewBox`, strokes `var(--p)`, labels as `<text>` whose first word is the tag name).
- Optional `schematics.py`: generates schematics into `out/<id>/` with `engine.schlib`.
- Optional `pills.json`: hand-placed tag positions.

Then run `./build.sh <id>`.
```

- [ ] **Step 2: CLAUDE.md**

- **"What this is":** `Static generator for breadboard guides: one page per folder in guides/ (out/<guide>.html) plus out/index.html. The first guide, guides/labb5, covers the TNE108 Labb 5 circuits. Each circuit gets …` (rest unchanged).
- **Commands block:**
```
./build.sh                                # every guide + index -> out/ (git-ignored)
./build.sh labb5                          # one guide + index
node engine/boards.mjs labb5              # boards -> out/labb5/<key>.svg (fallback) and out/labb5/<key>.3d.json (3D model)
python -m guides.labb5.schematics         # generated schematics -> out/labb5/sch_ast{4,5}.svg
python -m engine.build_page labb5         # assemble out/labb5.html (needs the steps above first)
python -m engine.build_index              # out/index.html
python prev.py out/labb5/rl.svg rl.png    # PNG preview of an SVG, needs `pip install cairosvg`
```
- `node circuits.mjs` prints… becomes `node engine/boards.mjs <guide>` prints…
- **Pipeline 1–3:**
  1. `engine/boards.mjs` runs each builder from `guides/<id>/boards.mjs` (built with `makeBoard()` from `engine/lib.mjs`), places tags and writes `out/<id>/<key>.svg` and `.3d.json`.
  2. Optional `guides/<id>/schematics.py` generates schematics into `out/<id>/` with `engine/schlib.py`; hand-written ones live in `guides/<id>/schematics/`. A section's `schematic` name must exist in exactly one of those two places.
  3. `engine/build_page.py` concatenates `engine/page-head.html` with the body built from `GUIDE` in `guides/<id>/guide.py`. Page text lives in `guide.py`; the helpers (`section`, `node`, `c`, `LEGEND`, `TABLE_HEADS`) live in `engine/page_kit.py`. Each section's `id` is its board key and its nav anchor, and its `nav` tuple is its nav label. `engine/build_index.py` imports every `guide.py` (so they must be side-effect free) to write `out/index.html`, with index-only CSS inline. Keep the rest of that paragraph.
- **Other paths:** `TABLE_HEADS` in `build_labb5.py` becomes `TABLE_HEADS` in `engine/page_kit.py`. `finish(...)` in `circuits.mjs` becomes: "Each builder in `guides/<id>/boards.mjs` returns `{ b, names, info, pinned, VH, title, desc }`; `finish()` in `engine/boards.mjs` places the tags". "cards in `build_labb5.py`" becomes "cards in `guide.py`". `pills.json[key]` becomes `guides/<id>/pills.json[key]`.
- **Gotchas:** add "Guide folder names must be valid Python identifiers (they're imported as `guides.<id>.guide`)" and "`page-head.html`, `viewer3d.mjs` and `page.mjs` are inlined into every guide page; index-only CSS goes in `engine/build_index.py`."

- [ ] **Step 3: Final byte-identical check, then fix the `page.mjs` header**

Run the shared verification. Expected: all `same`.

Then replace `engine/page.mjs` lines 2–3 with:
```js
// Page behaviour for guide pages, inlined by engine/build_page.py: starts the 3D breadboards and links each schematic
// to its breadboard, so hovering a part's label in one highlights the part in the other.
```
Run the shared verification once more. Expected: only `DIFF  out/labb5.html`. Confirm the difference is that comment alone: `diff <(grep -v '^// ' $SCRATCH/baseline/labb5.html) <(grep -v '^// ' out/labb5.html)` prints nothing.

- [ ] **Step 4: Commit**

```
git add -A
git commit -m "Document the multi-guide layout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
