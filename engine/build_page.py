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
