OUT = "out"
THREE = "https://cdn.jsdelivr.net/npm/three@0.186.1"


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def view3d(key):
    # Model JSON sits in a data script; "</" is escaped so the JSON can't close the script element early.
    model = read(f"{OUT}/labb5/{key}.3d.json").replace("</", "<\\/")
    return (f'<div class="drawing view-3d"><div class="stage" data-model="model-{key}"></div>'
            f'<p class="note">Drag to orbit, right-drag to pan, scroll to zoom. On touch screens, swipe sideways to orbit, or use two fingers to tilt and zoom.</p>'
            f'<script type="application/json" id="model-{key}">{model}</script></div>')


def caption(label, text):
    # The full-screen button only works with the page script, which unhides it.
    button = ('<button type="button" class="fs-toggle" hidden><svg viewBox="0 0 16 16" aria-hidden="true">'
              '<path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg><span>Full screen</span></button>')
    return f'<figcaption><b>{label}</b> <span>{text}</span>{button}</figcaption>'


head = read("engine/page-head.html") + "<title>Labb 5 Breadboard Guide</title>\n"

legend = """<section class="card" aria-label="How to read the drawings">
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


TABLE_HEADS = ["Node", "Board location", "What plugs in"]


def table(rows):
    # data-label repeats the column name on each cell, for the stacked small-screen layout (page-head.html).
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


def section(sid, eyebrow, title, lede, sch, bb, rows, card_items, sch_cap, bb_cap):
    return f"""<section class="circuit" id="{sid}">
<header><div class="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{lede}</p></header>
<figure>{caption("SCHEMATIC", sch_cap)}<div class="drawing">{read(sch)}</div></figure>
<figure>{caption("BREADBOARD", bb_cap)}<div class="drawing view-iso">{read(f"{OUT}/labb5/{bb}.svg")}</div>{view3d(bb)}</figure>
{table(rows)}
{cards(card_items)}
</section>
"""


c = lambda x: f"<code>{x}</code>"
S = []
S.append(section(
    "led", "Prep task · page 2", "LED voltage indicator",
    "A LED shows that the 12 V supply is on. R limits the current so the LED gets its 2.5 V and 20 mA.",
    "schematics/sch_led.svg", "led",
    [
        (node("Uin +12 V"), "Top + rail", "Supply red lead at col 2; LED anode (long leg) at col 5"),
        (node("LED–R"), "Col 5, rows a–e", f"LED cathode {c('5a')}, R {c('5c')}, multimeter red probe {c('5e')}"),
        (node("Uin 0 V"), "Top − rail", "Supply black lead at col 2; R at col 8; multimeter black probe at col 9"),
    ],
    [
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
    "Uin through D1 and R, multimeter across R",
    "LED from the + rail into col 5, R from col 5 to the − rail",
))
S.append(section(
    "rl", "Figure 1 · page 3", "RL circuit",
    "The inductor resists fast changes in current, so a square wave at Uin comes out with rounded edges across R1. The rounding gets worse as the frequency rises.",
    "schematics/sch_rl.svg", "rl",
    [
        (node("Uin", "in"), "Col 3, rows a–e", f"CH1 probe tip {c('3a')}, L1 {c('3c')}, generator signal {c('3e')}"),
        (node("Uut", "out"), "Col 8, rows a–e", f"CH2 probe tip {c('8a')}, R1 {c('8b')}, L1 {c('8c')}"),
        (node("GND"), "Top − rail", "Generator ground clip col 2, CH1 clip col 4, CH2 clip col 9, R1 col 10"),
    ],
    [
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
    "L1 in series with R1, Uut across R1",
    "L1 from col 3 to col 8, R1 from col 8 to the − rail",
))
S.append(section(
    "rc", "Figure 3 · page 4", "RC charging circuit",
    "The capacitor charges and discharges through R each time the square wave flips. CH2 shows the charge curve.",
    "schematics/sch_rc.svg", "rc",
    [
        (node("Uin", "in"), "Col 3, rows a–e", f"CH1 probe tip {c('3a')}, R {c('3c')}, generator signal {c('3e')}"),
        (node("Uut", "out"), "Col 8, rows a–e", f"CH2 probe tip {c('8a')}, C {c('8b')}, R {c('8c')}"),
        (node("GND"), "Top − rail", "Generator ground clip col 2, CH1 clip col 4, CH2 clip col 9, C col 10"),
    ],
    [
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
    "R in series with C, Uut across C",
    "R from col 3 to col 8, C from col 8 to the − rail",
))

amp_rows = [
    (node("V1 +12 V"), "Top + rail", "Supply red lead at col 2; R1 to rail at col 11; R3 to rail at col 14"),
    (node("GND"), "Top − rail, bottom − rail, bridged at col 19", "Supply black lead (col 2, top); CH1 and CH2 ground clips (cols 9 and 15, top); generator ground (col 3, bottom); R2, R4 and C3 (−) on the bottom rail"),
    (node("Uin", "in"), "Col 8, rows a–e", f"CH1 probe tip {c('8a')}, C1 {c('8b')}, generator signal {c('8d')}"),
    (node("B"), "Col 11, a–e and f–j", f"R1 {c('11a')}, C1 {c('11b')}, Q3 base {c('11d')}, jumper {c('11e')}→{c('11f')}, R2 {c('11j')}"),
    (node("C"), "Col 12, rows a–e", f"R3 {c('12a')}, C2 {c('12c')}, Q3 collector {c('12d')}"),
    (node("E"), "Col 10 a–e, col 7 f–j", f"Q3 emitter {c('10d')}, jumper {c('10e')}→{c('7f')}, C3 (+) {c('7i')}, R4 {c('7j')}"),
    (node("Uut", "out"), "Col 16, rows a–e", f"CH2 probe tip {c('16a')}, C2 {c('16c')}"),
]
S.append(section(
    "amp", "Figure 2 · page 5", "Common emitter amplifier",
    "One BC108B gives a large, inverted copy of a small input signal.",
    "schematics/sch.svg", "amp", amp_rows,
    [
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
    "Voltage-divider bias, bypassed emitter, probe points",
    "Q3 across cols 10–12, input strip col 8, output strip col 16",
))
S.append(section(
    "ast4", "Figure 4 · page 6", "Astable multivibrator",
    "Two transistors take turns switching each other on and off through the capacitors, so each collector makes a square wave. Values here are examples, since the PDF doesn't give any.",
    f"{OUT}/labb5/sch_ast4.svg", "ast4",
    [
        (node("+9 V"), "Top + rail", "Supply red lead col 2; R1 at cols 7 and 14; R2 at cols 4 and 17"),
        (node("GND"), "Bottom − rail, top − rail via col 21 bridge", "Supply black lead col 1 (bottom); emitter jumpers from cols 5 and 16; CH1 clip col 8 and CH2 clip col 13 (top)"),
        (node("Q1 C", "in"), "Col 7, rows a–e", f"R1 {c('7a')}, C (+) {c('7b')}, Q1 collector {c('7c')}, CH1 tip {c('7d')}"),
        (node("Q1 B"), "Col 6, rows a–e", f"C (−) from Q2's collector {c('6a')}, R2 {c('6b')}, Q1 base {c('6c')}"),
        (node("Q1 E"), "Col 5", f"Q1 emitter {c('5c')}, jumper {c('5e')} → bottom − rail"),
        (node("Q2 C", "out"), "Col 14, rows a–e", f"R1 {c('14a')}, C (+) {c('14b')}, Q2 collector {c('14c')}, CH2 tip {c('14d')}"),
        (node("Q2 B"), "Col 15, rows a–e", f"C (−) from Q1's collector {c('15a')}, R2 {c('15b')}, Q2 base {c('15c')}"),
        (node("Q2 E"), "Col 16", f"Q2 emitter {c('16c')}, jumper {c('16e')} → bottom − rail"),
    ],
    [
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
    "Cross-coupled pair with collector resistors R1 and base resistors R2",
    "Q1 in cols 5–7, Q2 in cols 14–16, capacitors crossing behind them",
))
S.append(section(
    "ast5", "Figure 5 · page 6", "Variable astable multivibrator",
    "The Sagitta kit version: LEDs in the collector lines show the switching, and RP1 shifts resistance between the two base resistors so you can change the blink times. Values are examples.",
    f"{OUT}/labb5/sch_ast5.svg", "ast5",
    [
        (node("+9 V"), "Top + rail, bottom + rail via col 20 bridge", "Supply red lead col 2; LED1 anode col 3; LED2 anode col 18; RP1 wiper jumper from col 10 (bottom)"),
        (node("GND"), "Bottom − rail, top − rail via col 21 bridge", "Supply black lead col 1 (bottom); emitter jumpers from cols 5 and 16; CH1 clip col 8 and CH2 clip col 13 (top)"),
        (node("LED1–R1"), "Col 3, rows a–e", f"LED1 cathode {c('3a')}, R1 {c('3b')}"),
        (node("UT1 C", "in"), "Col 7, rows a–e", f"R1 {c('7a')}, C1 (+) {c('7b')}, UT1 collector {c('7c')}, CH1 tip {c('7d')}"),
        (node("UT1 B"), "Col 6, rows a–e", f"C2 (−) {c('6a')}, UT1 base {c('6c')}, R3 {c('6e')}"),
        (node("UT2 C", "out"), "Col 14, rows a–e", f"R4 {c('14a')}, C2 (+) {c('14b')}, UT2 collector {c('14c')}, CH2 tip {c('14d')}"),
        (node("UT2 B"), "Col 15, rows a–e", f"C1 (−) {c('15a')}, UT2 base {c('15c')}, R2 {c('15e')}"),
        (node("RP1"), "Cols 9–11, row g", f"Ends: col 9 to R3 {c('9f')}, col 11 to R2 {c('11f')}. Wiper col 10, jumper {c('10j')} → bottom + rail"),
    ],
    [
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
    "LEDs in the collector lines, RP1 setting the base resistance",
    "Same transistor layout as Fig. 4, pot RP1 in the bottom half",
))

nav_items = [("led", "p.2", "LED indicator"), ("rl", "Fig 1", "RL circuit"), ("rc", "Fig 3", "RC circuit"), ("amp", "Fig 2", "Amplifier"), ("ast4", "Fig 4", "Astable"), ("ast5", "Fig 5", "Variable astable")]
# On wide screens the nav is a sticky sidebar spanning every row of main's content column: the header, toolbar,
# legend and one row per section (see page-head.html).
nav = f'<nav class="jump" aria-label="Circuits" style="--rows: {3 + len(S)}">' + "".join(f'<a href="#{i}"><span>{n}</span>{t}</a>' for i, n, t in nav_items) + "</nav>"

body = f"""<main>
<header>
<div class="eyebrow">TNE108 Labbintroduktion · Labb 5 Analoga kopplingar</div>
<h1>Labb 5 circuits, schematic to breadboard</h1>
<p class="lede">Every circuit from the lab PM, drawn as a schematic and as a breadboard layout with the same part names. Each one shows where the supply, generator and scope probes connect.</p>
</header>
{nav}
<div class="toolbar">
<fieldset class="seg">
<legend>Labels</legend>
<label><input type="checkbox" id="show-tags" checked>Show</label>
</fieldset>
</div>
{legend}
{''.join(S)}
</main>
<script type="importmap">{{"imports": {{"three": "{THREE}/build/three.module.js", "three/addons/": "{THREE}/examples/jsm/"}}}}</script>
<script type="text/plain" id="viewer-src">
{read("engine/viewer3d.mjs")}
</script>
<script type="module">
{read("engine/page.mjs")}
</script>
"""
with open(f"{OUT}/labb5.html", "w", encoding="utf-8") as fh:
    fh.write(head + body)
print(len(head + body))
