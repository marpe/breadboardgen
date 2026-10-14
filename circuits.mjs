import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { makeBoard, ROW as R } from "./lib.mjs";

const AMBER = "#BA7517";
const TEAL = "#1D9E75";
const RED = "#E24B4A";
const BLACK = "#2C2C2A";
const pillsFile = "pills.json";
const placed = existsSync(pillsFile) ? JSON.parse(readFileSync(pillsFile, "utf8")) : {};

const finish = (key, b, names, VH, title, desc) => {
  const spec = placed[key] || {};
  const report = {};
  for (const [name, anchorKey, cls] of names) {
    const a = b.anchors[anchorKey];
    report[anchorKey] = a;
    const pos = spec[anchorKey] || [null, null];
    b.pill(name, pos[0], pos[1], cls || "c-purple", anchorKey);
  }
  writeFileSync(`${key}.svg`, b.render(VH, title, desc));
  console.log(key, JSON.stringify(report));
};

{
  const b = makeBoard({ cols: 12, S: 20, X0: 360, Y0: 150 });
  b.box(30, 40, 160, 52, "V1 bench supply", ["+12 V / 0 V"]);
  b.wire([190, 58], 2, R.tp, RED);
  b.wire([190, 74], 2, R.tn, BLACK, { casing: true });
  b.tint(5, 4, 8, "#F7C1C1");
  b.anchors.D1 = b.led(5, R.tp, 5, R.a);
  b.anchors.R = b.resistor(5, R.c, 8, R.tn);
  b.box(490, 40, 170, 70, "Multimeter, V DC", ["Across R", "Expect about 9.5 V"]);
  b.probe([545, 110], 5, R.e, RED);
  b.probe([605, 110], 9, R.tn, BLACK);
  b.anchors.node = b.P(5, 6.5);
  finish("led", b, [["D1", "D1"], ["R", "R"], ["LED−R node", "node", "c-gray"]], 500,
    "LED indicator on a breadboard", "LED D1 from the +12 V rail into column 5, resistor R from column 5 to the ground rail, multimeter across R.");
}

const filter = (key, kind) => {
  const b = makeBoard({ cols: 12, S: 21, X0: 377, Y0: 150 });
  b.box(30, 40, 170, 52, "Signal generator", [kind === "rl" ? "Square wave, Uin" : "Square wave, 5 V"]);
  b.wire([200, 58], 3, R.e, AMBER);
  b.wire([200, 78], 2, R.tn, BLACK, { dashed: true });
  b.box(500, 40, 150, 70, "Oscilloscope", ["CH1 Uin · CH2 Uut", "Ground clips to − rail"]);
  b.tint(3, 4, 8, "#FAC775");
  b.tint(8, 4, 8, "#9FE1CB");
  const names = [];
  if (kind === "rl") {
    b.anchors.L1 = b.inductor(3, R.c, 8, R.c);
    b.anchors.R1 = b.resistor(8, R.b, 10, R.tn);
    names.push(["L1", "L1"], ["R1", "R1"]);
  } else {
    b.anchors.R = b.resistor(3, R.c, 8, R.c);
    b.anchors.C = b.film(8, R.b, 10, R.tn);
    names.push(["R", "R"], ["C", "C"]);
  }
  b.probe([530, 110], 3, R.a, AMBER, [4, R.tn]);
  b.probe([590, 110], 8, R.a, TEAL, [9, R.tn]);
  b.anchors.Uin = b.P(3, 8.3);
  b.anchors.Uut = b.P(8, 8.3);
  names.push(["Uin", "Uin", "c-amber"], ["Uut", "Uut", "c-teal"]);
  finish(key, b, names, 530,
    kind === "rl" ? "RL circuit on a breadboard" : "RC circuit on a breadboard",
    kind === "rl" ? "Inductor L1 from the Uin strip to the Uut strip, R1 from Uut to ground, generator and two scope probes." : "Resistor R from the Uin strip to the Uut strip, capacitor C from Uut to ground, generator and two scope probes.");
};
filter("rl", "rl");
filter("rc", "rc");

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
  b.anchors.Q1 = b.transistor(6, R.c);
  b.anchors.Q2 = b.transistor(15, R.c);
  b.anchors.C1 = b.ecap(7, R.b, 15, R.a, [9.6, 4.2]);
  b.anchors.C2 = b.ecap(14, R.b, 6, R.a, [12.4, 4.2]);
  if (!variable) {
    b.anchors.R1a = b.resistor(7, R.tp, 7, R.a);
    b.anchors.R1b = b.resistor(14, R.tp, 14, R.a);
    b.anchors.R2b = b.resistor(6, R.b, 4, R.tp);
    b.anchors.R2a = b.resistor(15, R.b, 17, R.tp);
    names.push(["R1", "R1a"], ["R1", "R1b"], ["R2", "R2a"], ["R2", "R2b"], ["C", "C1"], ["C", "C2"]);
  } else {
    b.anchors.bridgeP = b.jumper(20, R.tp, 20, R.bp, RED, 30);
    b.anchors.LED1 = b.led(3, R.tp, 3, R.a);
    b.anchors.LED2 = b.led(18, R.tp, 18, R.a);
    b.anchors.R1a = b.resistor(3, R.b, 7, R.a);
    b.anchors.R1b = b.resistor(18, R.b, 14, R.a);
    b.anchors.RP1 = b.pot(10, R.g);
    b.jumper(10, R.j, 10, R.bp, RED, 8);
    b.anchors.R2a = b.resistor(15, R.e, 11, R.f);
    b.anchors.R2b = b.resistor(6, R.e, 9, R.f);
    names.push(["LED1", "LED1"], ["LED2", "LED2"], ["R1", "R1a"], ["R4", "R1b"], ["R2", "R2a"], ["R3", "R2b"], ["RP1", "RP1"], ["C1", "C1"], ["C2", "C2"]);
  }
  names.push([Q1, "Q1"], [Q2, "Q2"], ["GND bridge", "bridge", "c-gray"]);
  if (variable) {
    names.push(["+ bridge", "bridgeP", "c-gray"]);
  }
  b.probe([540, 110], 7, R.d, AMBER, [8, R.tn]);
  b.probe([610, 110], 14, R.d, TEAL, [13, R.tn]);
  finish(key, b, names, 560,
    variable ? "Variable astable multivibrator on a breadboard" : "Astable multivibrator on a breadboard",
    variable ? "Two transistors UT1 and UT2 with cross-coupled capacitors, LEDs in the collector lines, RP1 setting the base resistances, scope probes on both collectors." : "Two transistors Q1 and Q2 with cross-coupled capacitors C, collector resistors R1, base resistors R2, scope probes on both collectors.");
};
astable("ast4", false);
astable("ast5", true);
