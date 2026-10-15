"""Index page: python -m engine.build_index

Writes out/index.html with one card per guide in guides/, linking to <guide>.html."""
from engine.build_page import ENGINE, OUT, ROOT, load_guide, read

# Index-only CSS. page-head.html is inlined into every guide page, so index styles stay out of it.
STYLE = """<style>
/* No circuit nav here, so no sidebar column on wide screens. */
@media (min-width: 1180px) {
  main.index { max-width: 900px; grid-template-columns: none; }
  main.index > * { grid-column: auto; }
}
a.card { color: inherit; text-decoration: none; overflow-wrap: break-word; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
a.card:hover, a.card:focus-visible { border-color: var(--ink); outline: none; }
a.card h3 { text-wrap: balance; }
a.card p { margin: 0; color: var(--muted); }
/* page-head.html strips card chrome on phones; the index cards are links, so they keep it as their tap and focus cue. */
@media (max-width: 560px) {
  a.card { padding: 16px 18px; border: 1px solid var(--line); border-radius: 10px; background: var(--paper); }
}
</style>
"""


def guide_ids():
    # Only guides that still exist and have been built, so `./build.sh <one guide>` doesn't link to missing pages.
    ids = (p.parent.name for p in (ROOT / "guides").glob("*/guide.py"))
    return sorted(gid for gid in ids if (OUT / f"{gid}.html").exists())


def card(gid):
    g = load_guide(gid)
    return (f'<a class="card" href="{gid}.html"><div class="eyebrow">{g["eyebrow"]}</div>'
            f'<h3>{g["h1"]}</h3><p>{g["lede"]}</p></a>')


def build():
    head = read(ENGINE / "page-head.html") + "<title>Breadboard Guides</title>\n" + STYLE
    links = "".join(card(gid) for gid in guide_ids()) or '<p class="note">No guides yet. Add a folder under guides/.</p>'
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
