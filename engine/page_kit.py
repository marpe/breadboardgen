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
