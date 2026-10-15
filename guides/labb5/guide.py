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
