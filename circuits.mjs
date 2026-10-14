import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { makeBoard, ROW as R } from "./lib.mjs";
import { resistor, filmCap, elcoCap, trimmer, transistor, plain } from "./markings.mjs";

const AMBER = "#BA7517";
const TEAL = "#1D9E75";
const RED = "#E24B4A";
const BLACK = "#2C2C2A";
const OUT = "out";
const pillsFile = "pills.json";
const placed = existsSync(pillsFile) ? JSON.parse(readFileSync(pillsFile, "utf8")) : {};
mkdirSync(OUT, { recursive: true });

const finish = (key, b, { names, info = {}, pinned = {}, VH, title, desc }) => {
  const spec = { ...pinned, ...placed[key] };
  const report = {};
  for (const [name, anchorKey, cls] of names) {
    const a = b.anchors[anchorKey];
    report[anchorKey] = a;
    const pos = spec[anchorKey] || [null, null];
    b.pill(name, pos[0], pos[1], cls || "c-purple", anchorKey, info[anchorKey]);
  }
  writeFileSync(`${OUT}/${key}.svg`, b.render(VH, title, desc, `bb-${key}`));
  writeFileSync(`${OUT}/${key}.3d.json`, JSON.stringify(b.model3d()));
  console.log(key, JSON.stringify(report));
};

const IN_NODE = plain("Input node", "CH1 probe, generator signal");
const LED_MARK = "Long leg is the anode (+)";

const ledBoard = () => {
  const b = makeBoard({ cols: 12, S: 20, X0: 360, Y0: 150 });
  b.box(30, 40, 160, 52, "V1 bench supply", ["+12 V / 0 V"]);
  b.wire([190, 58], 2, R.tp, RED);
  b.wire([190, 74], 2, R.tn, BLACK, { casing: true });
  b.tint(5, 4, 8, "#F7C1C1");
  b.anchors.D1 = b.led(5, R.tp, 5, R.a);
  b.anchors.R = b.resistor(5, R.c, 8, R.tn, 470);
  b.box(490, 40, 170, 70, "Multimeter, V DC", ["Across R", "Expect about 9.5 V"]);
  b.probe([545, 110], 5, R.e, RED);
  b.probe([605, 110], 9, R.tn, BLACK);
  b.anchors.node = b.node(5, 6.5);
  finish("led", b, {
    names: [["D1", "D1"], ["R", "R"], ["LED−R node", "node", "c-gray"]],
    info: {
      D1: plain("LED", "2.5 V at 20 mA", LED_MARK),
      R: resistor("Resistor", 470, "0.5 W"),
      node: plain("Node", "LED cathode, R and meter probe"),
    },
    VH: 500,
    title: "LED indicator on a breadboard",
    desc: "LED D1 from the +12 V rail into column 5, resistor R from column 5 to the ground rail, multimeter across R.",
  });
};

const filter = (key, kind) => {
  const b = makeBoard({ cols: 12, S: 21, X0: 377, Y0: 150 });
  b.box(30, 40, 170, 52, "Signal generator", [kind === "rl" ? "Square wave, Uin" : "Square wave, 5 V"]);
  b.wire([200, 58], 3, R.e, AMBER);
  b.wire([200, 78], 2, R.tn, BLACK, { dashed: true });
  b.box(500, 40, 150, 70, "Oscilloscope", ["CH1 Uin · CH2 Uut", "Ground clips to − rail"]);
  b.tint(3, 4, 8, "#FAC775");
  b.tint(8, 4, 8, "#9FE1CB");
  const names = [];
  let info;
  if (kind === "rl") {
    b.anchors.L1 = b.inductor(3, R.c, 8, R.c);
    b.anchors.R1 = b.resistor(8, R.b, 10, R.tn, 1e3);
    names.push(["L1", "L1"], ["R1", "R1"]);
    info = {
      L1: plain("Inductor", "e.g. 10 mH, try several"),
      R1: resistor("Resistor", 1e3),
      Uut: plain("Output node", "CH2 probe, across R1"),
    };
  } else {
    b.anchors.R = b.resistor(3, R.c, 8, R.c, 10e3);
    b.anchors.C = b.film(8, R.b, 10, R.tn);
    names.push(["R", "R"], ["C", "C"]);
    info = {
      R: resistor("Resistor", 10e3),
      C: filmCap("Film capacitor", 0.22e-6),
      Uut: plain("Output node", "CH2 probe, across C"),
    };
  }
  b.probe([530, 110], 3, R.a, AMBER, [4, R.tn]);
  b.probe([590, 110], 8, R.a, TEAL, [9, R.tn]);
  b.anchors.Uin = b.node(3, 8.3);
  b.anchors.Uut = b.node(8, 8.3);
  names.push(["Uin", "Uin", "c-amber"], ["Uut", "Uut", "c-teal"]);
  finish(key, b, {
    names,
    info: { ...info, Uin: IN_NODE },
    VH: 530,
    title: kind === "rl" ? "RL circuit on a breadboard" : "RC circuit on a breadboard",
    desc: kind === "rl" ? "Inductor L1 from the Uin strip to the Uut strip, R1 from Uut to ground, generator and two scope probes." : "Resistor R from the Uin strip to the Uut strip, capacitor C from Uut to ground, generator and two scope probes.",
  });
};
const ampBoard = () => {
  const b = makeBoard();
  b.box(40, 40, 150, 52, "V1 bench supply", ["+12 V / 0 V"]);
  b.wire([190, 58], 2, R.tp, RED);
  b.wire([190, 74], 2, R.tn, BLACK, { casing: true });
  b.box(20, 196, 160, 52, "Signal generator", ["1 kHz, 10 mVpp"]);
  b.wire([180, 214], 8, R.d, AMBER);
  b.wire([100, 248], 3, R.bn, BLACK, { dashed: true });
  b.box(500, 40, 150, 70, "Oscilloscope", ["CH1 Uin · CH2 Uut", "Ground clips to GND rail"]);
  b.tint(8, 4, 8, "#FAC775");
  b.tint(16, 4, 8, "#9FE1CB");
  b.jumper(10, R.e, 7, R.f, "#7F77DD");
  b.jumper(11, R.e, 11, R.f, "#D4537E");
  b.anchors.bridge = b.jumper(19, R.tn, 19, R.bn, BLACK, 26);
  const ohms = { R1: 27e3, R2: 12e3, R3: 2.2e3, R4: 1.5e3 };
  b.anchors.R1 = b.resistor(11, R.a, 11, R.tp, ohms.R1);
  b.anchors.R3 = b.resistor(12, R.a, 14, R.tp, ohms.R3);
  b.anchors.R2 = b.resistor(11, R.j, 11, R.bn, ohms.R2);
  b.anchors.R4 = b.resistor(7, R.j, 7, R.bn, ohms.R4);
  b.anchors.C1 = b.film(8, R.b, 11, R.b);
  b.anchors.C2 = b.film(12, R.c, 16, R.c);
  b.anchors.C3 = b.ecap(7, R.h, 9, R.bn);
  b.anchors.Q3 = b.transistor(11, R.d, { can: true });
  b.probe([530, 110], 8, R.a, AMBER, [9, R.tn]);
  b.probe([575, 110], 16, R.a, TEAL, [15, R.tn]);
  b.anchors.Uin = b.node(8, 8.3);
  b.anchors.Uut = b.node(16, 6);
  finish("amp", b, {
    names: [["R1", "R1"], ["R3", "R3"], ["C1", "C1"], ["C2", "C2"], ["Q3", "Q3"], ["R2", "R2"], ["R4", "R4"], ["C3", "C3"],
      ["Uin", "Uin", "c-amber"], ["Uut", "Uut", "c-teal"], ["GND bridge", "bridge", "c-gray"]],
    info: {
      R1: resistor("Resistor, upper bias", ohms.R1),
      R2: resistor("Resistor, lower bias", ohms.R2),
      R3: resistor("Resistor, collector", ohms.R3),
      R4: resistor("Resistor, emitter", ohms.R4),
      C1: filmCap("Film capacitor, input", 1e-6),
      C2: filmCap("Film capacitor, output", 1e-6),
      C3: elcoCap("Electrolytic capacitor", 100e-6, "+ to emitter"),
      Q3: transistor("NPN transistor, TO-18 can", "BC108B", `Printed "BC108B", tab marks E`),
      Uin: IN_NODE,
      Uut: plain("Output node", "CH2 probe, after C2"),
      bridge: plain("Jumper", "Joins top and bottom − rails"),
    },
    pinned: {
      R1: [455, 228], R3: [484, 308], C1: [420, 212], C2: [416, 322], Q3: [352, 226], R2: [292, 390], R4: [176, 352], C3: [232, 276],
      Uin: [290, 312], Uut: [412, 356], bridge: [548, 430],
    },
    VH: 510,
    title: "Common emitter amplifier on a breadboard",
    desc: "Breadboard with components R1, R2, R3, R4, C1, C2, C3 and Q3, plus supply, signal generator and scope probe connections.",
  });
};

const astable = (key, variable) => {
  const b = makeBoard({ cols: 21, S: 17, X0: 310, Y0: 165 });
  b.box(20, 40, 160, 52, "V1 bench supply", ["+9 V / 0 V (example)"]);
  b.wire([180, 58], 2, R.tp, RED);
  b.wire([100, 92], 1, R.bn, BLACK, { casing: true });
  b.box(500, 40, 160, 70, "Oscilloscope", ["CH1 left · CH2 right", "Ground clips to − rail"]);
  b.tint(7, 4, 8, "#FAC775");
  b.tint(14, 4, 8, "#9FE1CB");
  b.anchors.bridge = b.jumper(21, R.tn, 21, R.bn, BLACK, 24);
  b.jumper(5, R.e, 5, R.bn, BLACK, 18);
  b.jumper(16, R.e, 16, R.bn, BLACK, 18);
  const names = [];
  const Q1 = variable ? "UT1" : "Q1";
  const Q2 = variable ? "UT2" : "Q2";
  const cap = elcoCap("Electrolytic capacitor", 10e-6, "+ to collector side");
  const npn = transistor("NPN transistor, TO-92", "BC547B or similar", `Printed "BC547B" on the flat face`);
  const info = { C1: cap, C2: cap, Q1: npn, Q2: npn, bridge: plain("Jumper", "Joins top and bottom − rails") };
  const [rc, rb] = variable ? [470, 10e3] : [1e3, 47e3];
  b.anchors.Q1 = b.transistor(6, R.c);
  b.anchors.Q2 = b.transistor(15, R.c);
  b.anchors.C1 = b.ecap(7, R.b, 15, R.a, [9.6, 4.2]);
  b.anchors.C2 = b.ecap(14, R.b, 6, R.a, [12.4, 4.2]);
  if (!variable) {
    b.anchors.R1a = b.resistor(7, R.tp, 7, R.a, rc);
    b.anchors.R1b = b.resistor(14, R.tp, 14, R.a, rc);
    b.anchors.R2b = b.resistor(6, R.b, 4, R.tp, rb);
    b.anchors.R2a = b.resistor(15, R.b, 17, R.tp, rb);
    names.push(["R1", "R1a"], ["R1", "R1b"], ["R2", "R2a"], ["R2", "R2b"], ["C", "C1"], ["C", "C2"]);
    const collector = resistor("Resistor, collector", rc);
    const base = resistor("Resistor, base", rb);
    Object.assign(info, { R1a: collector, R1b: collector, R2a: base, R2b: base });
  } else {
    b.anchors.bridgeP = b.jumper(20, R.tp, 20, R.bp, RED, 30);
    b.anchors.LED1 = b.led(3, R.tp, 3, R.a);
    b.anchors.LED2 = b.led(18, R.tp, 18, R.a);
    b.anchors.R1a = b.resistor(3, R.b, 7, R.a, rc);
    b.anchors.R1b = b.resistor(18, R.b, 14, R.a, rc);
    b.anchors.RP1 = b.pot(10, R.g);
    b.jumper(10, R.j, 10, R.bp, RED, 8);
    b.anchors.R2a = b.resistor(15, R.e, 11, R.f, rb);
    b.anchors.R2b = b.resistor(6, R.e, 9, R.f, rb);
    names.push(["LED1", "LED1"], ["LED2", "LED2"], ["R1", "R1a"], ["R4", "R1b"], ["R2", "R2a"], ["R3", "R2b"], ["RP1", "RP1"], ["C1", "C1"], ["C2", "C2"]);
    const led = plain("LED, collector line", "about 15 mA", LED_MARK);
    const ledR = resistor("Resistor, LED current", rc);
    const base = resistor("Resistor, base", rb);
    Object.assign(info, {
      LED1: led, LED2: led, R1a: ledR, R1b: ledR, R2a: base, R2b: base,
      RP1: trimmer("Trimmer potentiometer", 100e3),
      bridgeP: plain("Jumper", "Joins top and bottom + rails"),
    });
  }
  names.push([Q1, "Q1"], [Q2, "Q2"], ["GND bridge", "bridge", "c-gray"]);
  if (variable) {
    names.push(["+ bridge", "bridgeP", "c-gray"]);
  }
  b.probe([540, 110], 7, R.d, AMBER, [8, R.tn]);
  b.probe([610, 110], 14, R.d, TEAL, [13, R.tn]);
  finish(key, b, {
    names,
    info,
    VH: 560,
    title: variable ? "Variable astable multivibrator on a breadboard" : "Astable multivibrator on a breadboard",
    desc: variable ? "Two transistors UT1 and UT2 with cross-coupled capacitors, LEDs in the collector lines, RP1 setting the base resistances, scope probes on both collectors." : "Two transistors Q1 and Q2 with cross-coupled capacitors C, collector resistors R1, base resistors R2, scope probes on both collectors.",
  });
};

ledBoard();
filter("rl", "rl");
filter("rc", "rc");
ampBoard();
astable("ast4", false);
astable("ast5", true);
