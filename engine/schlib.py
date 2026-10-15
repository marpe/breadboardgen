"""Schematic drawing helpers in the house style: 680-wide viewBox, var(--p) strokes, page CSS text classes."""
from pathlib import Path

P = "var(--p)"
AM = "#BA7517"
TE = "#1D9E75"


def npn(bar_x, cy, side):
    d = 1 if side == "left" else -1
    out_x = bar_x - 40 * d
    base_x = bar_x + 40 * d
    s = f'<circle cx="{bar_x - 15 * d}" cy="{cy}" r="30" fill="none" stroke="{P}" stroke-width="0.8"/>'
    s += f'<path d="M{bar_x} {cy - 20} V{cy + 20}" stroke="{P}" stroke-width="3" stroke-linecap="round"/>'
    s += f'<path d="M{bar_x} {cy} H{base_x} M{bar_x} {cy - 10} L{out_x} {cy - 30} M{bar_x} {cy + 10} L{out_x} {cy + 30}" fill="none" stroke="{P}" stroke-width="1.2" stroke-linecap="round"/>'
    ux, uy = (out_x - bar_x) / 44.72, 20 / 44.72
    tx, ty = bar_x + (out_x - bar_x) * 0.8, cy + 10 + 20 * 0.8
    px, py = -uy, ux
    b1 = (tx - ux * 10 + px * 5, ty - uy * 10 + py * 5)
    b2 = (tx - ux * 10 - px * 5, ty - uy * 10 - py * 5)
    s += f'<path d="M{tx:.1f} {ty:.1f} L{b1[0]:.1f} {b1[1]:.1f} L{b2[0]:.1f} {b2[1]:.1f} Z" fill="{P}"/>'
    return s


def res_v(x, y1, y2):
    return f'<rect x="{x - 8}" y="{y1}" width="16" height="{y2 - y1}" rx="2" fill="none" stroke="{P}" stroke-width="1.2"/>'


def cap_h(x1, x2, y, plus_left):
    m = (x1 + x2) / 2
    s = f'<path d="M{x1} {y} H{m - 5} M{m + 5} {y} H{x2}" fill="none" stroke="{P}" stroke-width="1.2"/>'
    s += f'<path d="M{m - 5} {y - 14} V{y + 14}" stroke="{P}" stroke-width="2"/>'
    s += f'<path d="M{m + 5} {y - 14} Q{m + 1} {y} {m + 5} {y + 14}" fill="none" stroke="{P}" stroke-width="2"/>'
    px = m - 13 if plus_left else m + 9
    s += f'<text class="ts" x="{px}" y="{y - 10}" dominant-baseline="central">+</text>'
    return s


def dot(x, y, c=P):
    return f'<circle cx="{x}" cy="{y}" r="3.5" fill="{c}"/>'


def t(x, y, txt, cls="ts", anchor="start"):
    return f'<text class="{cls}" x="{x}" y="{y}" text-anchor="{anchor}" dominant-baseline="central">{txt}</text>'


def ground(x, y):
    return f'<path d="M{x} {y} V{y + 14} M{x - 10} {y + 14} H{x + 10} M{x - 6} {y + 19} H{x + 6} M{x - 2} {y + 24} H{x + 2}" fill="none" stroke="{P}" stroke-width="1.2"/>'


def probe_box(x, y, title, sub, cls, ax, ay, color):
    s = f'<g class="{cls}"><rect x="{x}" y="{y}" width="80" height="36" rx="6" stroke-width="0.5"/>'
    s += f'<text class="th" x="{x + 40}" y="{y + 11}" text-anchor="middle" dominant-baseline="central">{title}</text>'
    s += f'<text class="ts" x="{x + 40}" y="{y + 27}" text-anchor="middle" dominant-baseline="central">{sub}</text></g>'
    sx = x + 80 if ax > x + 80 else x
    s += f'<path d="M{sx} {y + 18} H{ax + (-4 if ax > sx else 4)}" fill="none" stroke="{color}" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#arrow)"/>'
    return s


ARROW = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>'


def led_down(x, y):
    s = f'<path d="M{x - 13} {y} L{x + 13} {y} L{x} {y + 22} Z" fill="#E24B4A" stroke="#A32D2D" stroke-width="1"/>'
    s += f'<path d="M{x - 13} {y + 22} H{x + 13}" stroke="#A32D2D" stroke-width="2"/>'
    s += f'<g stroke="#E24B4A" stroke-width="1.2" fill="none" stroke-linecap="round"><path d="M{x + 14} {y + 8} l12 -10 M{x + 14} {y + 15} l12 -10 M{x + 26} {y - 2} l-6 1 M{x + 26} {y - 2} l-1 6 M{x + 26} {y + 5} l-6 1 M{x + 26} {y + 5} l-1 6"/></g>'
    return s


def save(guide_file, svgs):
    """Writes {file name: svg} to out/<guide>/, where <guide> is the folder of guide_file (pass __file__)."""
    out = Path("out") / Path(guide_file).parent.name
    out.mkdir(parents=True, exist_ok=True)
    for name, svg in svgs.items():
        with open(out / name, "w", encoding="utf-8") as fh:
            fh.write(svg)
