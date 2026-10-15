"""Generated Labb 5 schematics: python -m guides.labb5.schematics -> out/labb5/sch/sch_ast4.svg, sch_ast5.svg"""
from engine.schlib import AM, ARROW, P, TE, cap_h, dot, ground, led_down, npn, probe_box, res_v, save, t


def fig4():
    H = 430
    s = [f'<svg width="100%" viewBox="0 0 680 {H}" role="img" xmlns="http://www.w3.org/2000/svg"><title>Astable multivibrator schematic</title><desc>Two NPN transistors Q1 and Q2, collector resistors R1, base resistors R2 and cross-coupling capacitors C. Scope CH1 on Q1 collector, CH2 on Q2 collector.</desc>', ARROW]
    s.append(f'<g fill="none" stroke="{P}" stroke-width="1.2" stroke-linecap="round">')
    s.append('<path d="M140 60 H540 M140 380 H540"/>')
    s.append('<path d="M160 60 V80 M160 140 V178 M260 60 V80 M260 140 V220 M420 60 V80 M420 140 V220 M520 60 V80 M520 140 V178"/>')
    s.append('<path d="M160 178 V270 M520 178 V270 M160 330 V380 M520 330 V380"/>')
    s.append('</g>')
    s.append(f'<path d="M260 220 L440 300" fill="none" stroke="{P}" stroke-width="1.2"/>')
    s.append(f'<path d="M420 220 L240 300" fill="none" stroke="{P}" stroke-width="1.2"/>')
    for x in (160, 260, 420, 520):
        s.append(res_v(x, 80, 140))
    s.append(cap_h(160, 260, 180, True))
    s.append(cap_h(420, 520, 180, False))
    s.append(npn(200, 300, "left"))
    s.append(npn(480, 300, "right"))
    for x, y in ((160, 180), (260, 180), (420, 180), (520, 180), (260, 60), (420, 60), (520, 60), (160, 60), (160, 380), (520, 380), (340, 380)):
        s.append(dot(x, y))
    s.append(ground(340, 380))
    s.append(t(130, 60, "+9 V (example)", "th", "end"))
    s.append(t(144, 103, "R1", "th", "end") + t(144, 120, "1 kΩ", "ts", "end"))
    s.append(t(276, 103, "R2", "th") + t(276, 120, "47 kΩ", "ts"))
    s.append(t(404, 103, "R2", "th", "end") + t(404, 120, "47 kΩ", "ts", "end"))
    s.append(t(536, 103, "R1", "th") + t(536, 120, "1 kΩ", "ts"))
    s.append(t(210, 152, "C 10 µF", "ts", "middle"))
    s.append(t(470, 152, "C 10 µF", "ts", "middle"))
    s.append(t(212, 348, "Q1", "th") + t(212, 364, "BC547B", "ts"))
    s.append(t(468, 348, "Q2", "th", "end") + t(468, 364, "BC547B", "ts", "end"))
    s.append(probe_box(40, 205, "CH1", "Q1 C", "c-amber", 160, 223, AM))
    s.append(probe_box(560, 205, "CH2", "Q2 C", "c-teal", 520, 223, TE))
    s.append(t(340, 418, "Example values. f ≈ 1 / (1.39 · R2 · C) ≈ 1.5 Hz", "ts", "middle"))
    s.append('</svg>')
    return "".join(s)


def fig5():
    H = 450
    s = [f'<svg width="100%" viewBox="0 0 680 {H}" role="img" xmlns="http://www.w3.org/2000/svg"><title>Variable astable multivibrator schematic</title><desc>Astable multivibrator with LED1 and LED2 in the collector lines, R1 and R4 collector resistors, RP1 potentiometer feeding base resistors R2 and R3, capacitors C1 and C2, transistors UT1 and UT2 and a 9 V battery.</desc>', ARROW]
    s.append(f'<g fill="none" stroke="{P}" stroke-width="1.2" stroke-linecap="round">')
    s.append('<path d="M140 50 H640 M140 400 H640"/>')
    s.append('<path d="M160 50 V62 M160 84 V110 M160 160 V280 M520 50 V62 M520 84 V110 M520 160 V280"/>')
    s.append('<path d="M300 100 H260 V120 M260 180 V240 M380 100 H420 V120 M420 180 V240"/>')
    s.append('<path d="M160 340 V400 M520 340 V400"/>')
    s.append('<path d="M640 50 V188 M640 222 V400"/>')
    s.append('</g>')
    s.append(f'<path d="M628 188 H652 M634 196 H646 M628 206 H652 M634 214 H646" stroke="{P}" stroke-width="2"/>')
    s.append(f'<path d="M260 240 L440 310" fill="none" stroke="{P}" stroke-width="1.2"/>')
    s.append(f'<path d="M420 240 L240 310" fill="none" stroke="{P}" stroke-width="1.2"/>')
    s.append(f'<rect x="300" y="92" width="80" height="16" rx="2" fill="none" stroke="{P}" stroke-width="1.2"/>')
    s.append(f'<path d="M340 50 V84" fill="none" stroke="{P}" stroke-width="1.2" marker-end="url(#arrow)"/>')
    s.append(led_down(160, 62))
    s.append(led_down(520, 62))
    for x in (160, 520):
        s.append(res_v(x, 110, 160))
    for x in (260, 420):
        s.append(res_v(x, 120, 180))
    s.append(cap_h(160, 260, 200, True))
    s.append(cap_h(420, 520, 200, False))
    s.append(npn(200, 310, "left"))
    s.append(npn(480, 310, "right"))
    for x, y in ((160, 200), (260, 200), (420, 200), (520, 200), (340, 50), (520, 50), (160, 50), (160, 400), (520, 400), (340, 400)):
        s.append(dot(x, y))
    s.append(ground(340, 400))
    s.append(t(622, 186, "+", "th", "end"))
    s.append(t(618, 230, "9 V", "th", "end"))
    s.append(t(618, 246, "example", "ts", "end"))
    s.append(t(144, 73, "LED1", "th", "end"))
    s.append(t(552, 92, "LED2", "th"))
    s.append(t(144, 128, "R1", "th", "end") + t(144, 145, "470 Ω", "ts", "end"))
    s.append(t(536, 128, "R4", "th") + t(536, 145, "470 Ω", "ts"))
    s.append(t(244, 143, "R2", "th", "end") + t(244, 160, "10 kΩ", "ts", "end"))
    s.append(t(436, 143, "R3", "th") + t(436, 160, "10 kΩ", "ts"))
    s.append(t(340, 124, "RP1", "th", "middle") + t(340, 141, "100 kΩ", "ts", "middle"))
    s.append(t(210, 230, "C1 10 µF", "ts", "middle"))
    s.append(t(470, 230, "C2 10 µF", "ts", "middle"))
    s.append(t(212, 358, "UT1", "th") + t(212, 374, "BC547B", "ts"))
    s.append(t(468, 358, "UT2", "th", "end") + t(468, 374, "BC547B", "ts", "end"))
    s.append(probe_box(40, 222, "CH1", "UT1 C", "c-amber", 160, 240, AM))
    s.append(probe_box(540, 268, "CH2", "UT2 C", "c-teal", 520, 286, TE))
    s.append(t(340, 438, "Example values. RP1 shifts resistance between R2 and R3, changing the on/off times", "ts", "middle"))
    s.append('</svg>')
    return "".join(s)


save(__file__, {"sch_ast4.svg": fig4(), "sch_ast5.svg": fig5()})
