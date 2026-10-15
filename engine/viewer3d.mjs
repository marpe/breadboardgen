// @env browser
// Builds 3D breadboards from the board models written by engine/boards.mjs (out/<guide>/<key>.3d.json). One mountBoard() per board.
// Units are hole pitches (2.54 mm): x = column, z = row position v (as in ROW), y = up from the board's top face.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// Board texture resolution, in canvas pixels per hole pitch; high enough to keep the labels crisp up close.
const PX = 96;
const V_MIN = -1.4;
const V_MAX = 19.4;
const BOARD_T = 1.4;
const HOLE_ROWS = [1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17];
const RAIL_ROWS = [1, 2, 16, 17];
const ROW_NAMES = [["a", 4], ["b", 5], ["c", 6], ["d", 7], ["e", 8], ["f", 10], ["g", 11], ["h", 12], ["i", 13], ["j", 14]];
const LEG_DEPTH = -0.4;

// Board coordinates to world space for a board with W = cols + 1, centred on the origin.
const placer = (W) => (c, v, y = 0) => new THREE.Vector3(c - W / 2, y, v - 9);

function boardTexture(data) {
  const W = data.cols + 1;
  const canvas = document.createElement("canvas");
  canvas.width = W * PX;
  canvas.height = (V_MAX - V_MIN) * PX;
  const g = canvas.getContext("2d");
  const X = (u) => u * PX;
  const Y = (v) => (v - V_MIN) * PX;
  g.fillStyle = "#F6F4EE";
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (const [c, v1, v2, fill] of data.tints) {
    g.globalAlpha = 0.85;
    g.fillStyle = fill;
    g.fillRect(X(c - 0.42), Y(v1 - 0.45), 0.84 * PX, (v2 - v1 + 0.9) * PX);
    g.globalAlpha = 1;
  }
  g.lineWidth = 0.06 * PX;
  for (const [v, color] of [[0.35, "#E24B4A"], [2.65, "#378ADD"], [15.35, "#E24B4A"], [17.65, "#378ADD"]]) {
    g.strokeStyle = color;
    g.beginPath();
    g.moveTo(X(0.6), Y(v));
    g.lineTo(X(W - 0.6), Y(v));
    g.stroke();
  }
  g.fillStyle = "#55544F";
  for (const v of HOLE_ROWS) {
    for (let c = 1; c <= data.cols; c++) {
      if (RAIL_ROWS.includes(v) && c % 6 === 0) {
        continue;
      }
      g.fillRect(X(c) - 0.18 * PX, Y(v) - 0.18 * PX, 0.36 * PX, 0.36 * PX);
    }
  }
  g.strokeStyle = "#D85A30";
  g.lineWidth = 0.08 * PX;
  for (const [c, v] of data.used) {
    g.beginPath();
    g.arc(X(c), Y(v), 0.3 * PX, 0, Math.PI * 2);
    g.stroke();
  }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `700 ${0.62 * PX}px system-ui, sans-serif`;
  g.fillStyle = "#1A1A18";
  for (let c = 1; c <= data.cols; c++) {
    g.fillText(String(c), X(c), Y(-0.75));
    g.fillText(String(c), X(c), Y(18.75));
  }
  for (const [name, v] of ROW_NAMES) {
    g.fillText(name, X(0.3), Y(v));
    g.fillText(name, X(W - 0.3), Y(v));
  }
  g.font = `800 ${0.75 * PX}px system-ui, sans-serif`;
  for (const [sign, v, color] of [["+", 1, "#A32D2D"], ["−", 2, "#185FA5"], ["+", 16, "#A32D2D"], ["−", 17, "#185FA5"]]) {
    g.fillStyle = color;
    g.fillText(sign, X(0.3), Y(v));
    g.fillText(sign, X(W - 0.3), Y(v));
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...opts });
const METAL = mat(0xc9ccd1, { metalness: 0.85, roughness: 0.3 });
const shadowed = (mesh) => {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};
const mesh = (geometry, material) => shadowed(new THREE.Mesh(geometry, material));

// A leg or wire through the given points, rounded at the bends.
const tube = (points, radius, material) => {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  // Enough segments that long cables stay smooth through their bends.
  return mesh(new THREE.TubeGeometry(curve, Math.max(48, Math.ceil(curve.getLength() * 16)), radius, 10), material);
};
// A component leg: straight up out of its hole, then bent over to where it enters the body.
const leg = (hole, end, radius = 0.07) => {
  const rise = hole.clone().setY(Math.max(end.y - 0.25, 0.05));
  return tube([hole.clone().setY(LEG_DEPTH), rise, end], radius, METAL);
};
const alongY = (dir) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

function axial({ a, b, body, bands, at: bandAt }, at, radius) {
  const group = new THREE.Group();
  const A = at(...a);
  const B = at(...b);
  const span = A.distanceTo(B);
  const dir = B.clone().sub(A).normalize();
  const y = radius + 0.3;
  const point = (t) => A.clone().addScaledVector(dir, t * span).setY(y);
  group.add(leg(A, point(0.22)), leg(B, point(0.78)));
  // Body spans 22-78 % of the hole-to-hole length, matching the 2D drawings so band positions carry over.
  const length = 0.56 * span;
  const capsule = mesh(new THREE.CapsuleGeometry(radius, Math.max(length - 2 * radius, 0.05), 8, 24), mat(body));
  capsule.position.copy(point(0.5));
  capsule.quaternion.copy(alongY(dir));
  group.add(capsule);
  bands.forEach((color, i) => {
    const band = mesh(new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, 0.13, 24), mat(color, { roughness: 0.45 }));
    band.position.copy(point(bandAt[i]));
    band.quaternion.copy(alongY(dir));
    group.add(band);
  });
  return group;
}

function film({ a, b }, at) {
  const group = new THREE.Group();
  const A = at(...a);
  const B = at(...b);
  const dir = B.clone().sub(A).normalize();
  const mid = A.clone().lerp(B, 0.5);
  const bottom = 0.45;
  const box = mesh(new THREE.BoxGeometry(1.5, 1.15, 0.65), mat("#E8C547", { roughness: 0.4 }));
  box.position.copy(mid).setY(bottom + 0.575);
  box.rotation.y = -Math.atan2(dir.z, dir.x);
  group.add(box);
  group.add(leg(A, mid.clone().addScaledVector(dir, -0.45).setY(bottom)), leg(B, mid.clone().addScaledVector(dir, 0.45).setY(bottom)));
  return group;
}

function ecap({ plus, minus, at: centre }, at) {
  const group = new THREE.Group();
  const P = at(...plus);
  const M = at(...minus);
  const C = at(...centre);
  const r = 0.85;
  const h = 2.6;
  const bottom = 0.4;
  const can = mesh(new THREE.CylinderGeometry(r, r, h, 40), mat("#185FA5", { roughness: 0.35 }));
  can.position.copy(C).setY(bottom + h / 2);
  group.add(can);
  // Light stripe on the side facing the − leg, as printed on the real sleeve.
  const toMinus = M.clone().sub(C).setY(0).normalize();
  const theta = Math.atan2(toMinus.x, toMinus.z);
  const stripe = mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, h * 0.97, 16, 1, true, theta - 0.5, 1), mat("#B5D4F4", { side: THREE.DoubleSide }));
  stripe.position.copy(can.position);
  group.add(stripe);
  const lid = mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.04, 40), METAL);
  lid.position.copy(C).setY(bottom + h + 0.02);
  group.add(lid);
  group.add(leg(P, C.clone().addScaledVector(toMinus, -0.3).setY(bottom)), leg(M, C.clone().addScaledVector(toMinus, 0.3).setY(bottom)));
  return group;
}

function led({ anode, cathode }, at) {
  const group = new THREE.Group();
  const A = at(...anode);
  const K = at(...cathode);
  const C = A.clone().lerp(K, 0.5);
  const dir = K.clone().sub(A).setY(0).normalize();
  const bottom = 1.1;
  const r = 0.55;
  const lens = mat("#E24B4A", { roughness: 0.15, emissive: "#7A1414", transparent: true, opacity: 0.92 });
  const flange = mesh(new THREE.CylinderGeometry(r + 0.08, r + 0.08, 0.14, 32), lens);
  flange.position.copy(C).setY(bottom + 0.07);
  const body = mesh(new THREE.CylinderGeometry(r, r, 0.8, 32), lens);
  body.position.copy(C).setY(bottom + 0.54);
  const dome = mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), lens);
  dome.position.copy(C).setY(bottom + 0.94);
  group.add(flange, body, dome);
  group.add(leg(A, C.clone().addScaledVector(dir, -0.2).setY(bottom)), leg(K, C.clone().addScaledVector(dir, 0.2).setY(bottom)));
  return group;
}

function pot({ at: [c, v] }, at) {
  const group = new THREE.Group();
  const bottom = 0.35;
  const body = mesh(new THREE.BoxGeometry(2.4, 0.9, 1.8), mat("#185FA5", { roughness: 0.5 }));
  body.position.copy(at(c, v + 0.85, bottom + 0.45));
  const knob = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.22, 32), mat("#F1EFE8"));
  knob.position.copy(at(c, v + 0.85, bottom + 1.0));
  const slot = mesh(new THREE.BoxGeometry(0.75, 0.06, 0.12), mat("#5F5E5A"));
  slot.position.copy(at(c, v + 0.85, bottom + 1.12));
  slot.rotation.y = 0.6;
  group.add(body, knob, slot);
  for (const dc of [-1, 0, 1]) {
    group.add(leg(at(c + dc, v), at(c + dc, v + 0.15, bottom)));
  }
  return group;
}

function to92({ at: [c, v] }, at) {
  const group = new THREE.Group();
  const bottom = 0.6;
  // D-shaped outline in the board plane: flat face toward +v (front), rounded back toward −v.
  const shape = new THREE.Shape();
  shape.moveTo(-0.95, -0.2);
  shape.lineTo(0.95, -0.2);
  shape.absarc(0, -0.2, 0.95, 0, Math.PI, false);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.8, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
  const body = mesh(geometry, mat("#2C2C2A", { roughness: 0.6 }));
  body.rotation.x = -Math.PI / 2;
  body.position.copy(at(c, v, bottom));
  group.add(body);
  for (const dc of [-1, 0, 1]) {
    group.add(leg(at(c + dc, v), at(c + dc * 0.5, v - 0.2, bottom)));
  }
  return group;
}

function to18({ at: [c, v] }, at) {
  const group = new THREE.Group();
  const bottom = 0.5;
  const C = at(c, v - 0.2);
  const can = mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.8, 40), METAL);
  can.position.copy(C).setY(bottom + 0.9);
  const rim = mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 40), METAL);
  rim.position.copy(C).setY(bottom + 0.06);
  // The tab marks the emitter, which sits on the c − 1 side.
  const tab = mesh(new THREE.BoxGeometry(0.4, 0.12, 0.25), METAL);
  tab.position.copy(C).add(new THREE.Vector3(-1.1, bottom + 0.06, 0.35));
  tab.rotation.y = 0.3;
  group.add(can, rim, tab);
  for (const dc of [-1, 0, 1]) {
    group.add(leg(at(c + dc, v), at(c + dc * 0.4, v - 0.2, bottom)));
  }
  return group;
}

const WIRE_R = 0.13;

// Jumpers lie flat on the board, like pre-cut jumper wire: straight down into each hole, a short bend, a flat run.
function jumper({ a, b, color }, at) {
  const A = at(...a);
  const B = at(...b);
  const dir = B.clone().sub(A).normalize();
  const bend = Math.min(0.35, A.distanceTo(B) / 2 - 0.01);
  const points = [A.clone().setY(LEG_DEPTH), A.clone().setY(WIRE_R), A.clone().addScaledVector(dir, bend).setY(WIRE_R),
    B.clone().addScaledVector(dir, -bend).setY(WIRE_R), B.clone().setY(WIRE_R), B.clone().setY(LEG_DEPTH)];
  return tube(points, WIRE_R, mat(color, { roughness: 0.5 }));
}

// Instruments sit raised above the board (three board heights up), turned to face it, and their cables arc down to the
// board from above. Each kind has its own model; cables plug into sockets on its front panel. buildScene assigns each
// cable its socket (part.socket) before building it, and adds the name label.
const TABLE_Y = -BOARD_T;
const INSTRUMENT_BASE = 3 * BOARD_T;
const PLUG_LEN = 0.55;

// A flat panel showing a canvas drawing that glows like a lit display. `draw(g, w, h)` paints the canvas.
function screen(width, height, draw) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = Math.round((512 * height) / width);
  draw(canvas.getContext("2d"), canvas.width, canvas.height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.75, roughness: 0.3 }));
}
const digits = (text, color, bg) => (g, w, h) => {
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = color;
  g.font = `600 ${Math.round(h * 0.7)}px ui-monospace, Consolas, monospace`;
  g.textAlign = "right";
  g.textBaseline = "middle";
  g.fillText(text, w * 0.94, h * 0.54);
};
// A wave across a canvas strip: sine or square, given amplitude (share of height) and phase.
const wave = (g, w, h, { color, amp, square = false, invert = false, cycles = 2.5, mid = h / 2, width = 4 }) => {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const s = Math.sin((x / w) * cycles * Math.PI * 2);
    const y = (square ? Math.sign(s) : s) * amp * h * (invert ? -1 : 1);
    g[x ? "lineTo" : "moveTo"](x, mid - y);
  }
  g.stroke();
};
const knob = (r, color = "#D3D1C7") => {
  const group = new THREE.Group();
  const body = mesh(new THREE.CylinderGeometry(r, r * 1.08, r * 0.8, 28), mat(color, { roughness: 0.35 }));
  body.rotation.x = Math.PI / 2;
  const mark = mesh(new THREE.BoxGeometry(r * 0.14, r * 0.7, 0.02), mat("#2C2C2A"));
  mark.position.set(0, r * 0.35, r * 0.41);
  group.add(body, mark);
  return group;
};
const button = (w, h, color) => mesh(new THREE.BoxGeometry(w, h, 0.12), mat(color, { roughness: 0.5 }));
const firstNumber = (text, re) => {
  const m = re.exec(text);
  return m ? Number(m[1]) : null;
};

// Each model returns { group (front panel facing local +z), height, sockets: { y, x0, x1, z } } in local coordinates.
const models = {
  supply(width, lines) {
    const group = new THREE.Group();
    const [h, d] = [2.2, 4.0];
    const body = mesh(new RoundedBoxGeometry(width, h, d, 3, 0.18), mat("#D8D5CB", { roughness: 0.55 }));
    body.position.y = h / 2;
    const face = mesh(new THREE.BoxGeometry(width - 0.3, h - 0.3, 0.04), mat("#B9B6AC", { roughness: 0.6 }));
    face.position.set(0, h / 2, d / 2 + 0.01);
    group.add(body, face);
    const volts = firstNumber(lines.join(" "), /\+?(\d+(?:\.\d+)?)\s*V/) ?? 0;
    [[`${volts.toFixed(2)}`, "#FF5A4E"], ["0.020", "#6BE38A"]].forEach(([text, color], i) => {
      const x = -width / 2 + 1.05 + i * 1.75;
      const display = screen(1.5, 0.55, digits(text, color, "#141412"));
      display.position.set(x, h * 0.7, d / 2 + 0.04);
      const k = knob(0.3);
      k.position.set(x, h * 0.32, d / 2 + 0.03);
      group.add(display, k);
    });
    const power = button(0.35, 0.22, "#2C2C2A");
    power.position.set(-width / 2 + 0.45, 0.3, d / 2 + 0.05);
    group.add(power);
    return { group, height: h, sockets: { y: h * 0.32, x0: width / 2 - 2.0, x1: width / 2 - 0.55, z: d / 2 } };
  },

  generator(width, lines) {
    const group = new THREE.Group();
    const [h, d] = [1.9, 4.2];
    const body = mesh(new RoundedBoxGeometry(width, h, d, 3, 0.18), mat("#2E3440", { roughness: 0.5 }));
    body.position.y = h / 2;
    group.add(body);
    const text = lines.join(" ");
    const freq = firstNumber(text, /(\d+(?:\.\d+)?)\s*k?Hz/);
    const unit = /kHz/.test(text) ? "kHz" : "Hz";
    const square = /square/i.test(text);
    const lcd = screen(width * 0.48, h * 0.55, (g, w, hh) => {
      g.fillStyle = "#9EC6E8";
      g.fillRect(0, 0, w, hh);
      wave(g, w, hh, { color: "#1C3550", amp: 0.22, square, mid: hh * 0.62, cycles: 3, width: 5 });
      g.fillStyle = "#1C3550";
      g.font = `600 ${Math.round(hh * 0.24)}px ui-monospace, Consolas, monospace`;
      g.fillText(freq !== null ? `${freq.toFixed(3)} ${unit}` : square ? "SQUARE" : "SINE", w * 0.05, hh * 0.24);
    });
    lcd.position.set(-width / 2 + 0.25 + (width * 0.48) / 2, h * 0.6, d / 2 + 0.01);
    group.add(lcd);
    for (let i = 0; i < 6; i++) {
      const b = button(0.32, 0.2, i === 0 ? "#E8B828" : "#C9CDD3");
      b.position.set(-width / 2 + 0.45 + i * 0.45, h * 0.18, d / 2 + 0.05);
      group.add(b);
    }
    const dial = knob(0.45, "#9AA3AE");
    dial.position.set(width / 2 - 1.0, h * 0.6, d / 2 + 0.05);
    group.add(dial);
    return { group, height: h, sockets: { y: h * 0.2, x0: width / 2 - 1.5, x1: width / 2 - 0.45, z: d / 2 } };
  },

  oscilloscope(width) {
    const group = new THREE.Group();
    const w = width + 1.2;
    const [h, d] = [3.2, 4.4];
    const body = mesh(new RoundedBoxGeometry(w, h, d, 3, 0.25), mat("#2B2F36", { roughness: 0.5 }));
    body.position.y = h / 2;
    const face = mesh(new THREE.BoxGeometry(w - 0.3, h - 0.3, 0.04), mat("#C9CDD3", { roughness: 0.55 }));
    face.position.set(0, h / 2, d / 2 + 0.01);
    group.add(body, face);
    const sw = w * 0.55;
    const display = screen(sw, h * 0.6, (g, cw, ch) => {
      g.fillStyle = "#0E1512";
      g.fillRect(0, 0, cw, ch);
      g.strokeStyle = "rgba(160, 190, 170, 0.25)";
      g.lineWidth = 1;
      for (let i = 1; i < 10; i++) {
        g.beginPath();
        g.moveTo((cw * i) / 10, 0);
        g.lineTo((cw * i) / 10, ch);
        g.stroke();
      }
      for (let i = 1; i < 8; i++) {
        g.beginPath();
        g.moveTo(0, (ch * i) / 8);
        g.lineTo(cw, (ch * i) / 8);
        g.stroke();
      }
      wave(g, cw, ch, { color: "#F2A93B", amp: 0.08, mid: ch * 0.3, cycles: 2 });
      wave(g, cw, ch, { color: "#3DD6A3", amp: 0.2, invert: true, mid: ch * 0.66, cycles: 2 });
    });
    display.position.set(-w / 2 + 0.3 + sw / 2, h * 0.6, d / 2 + 0.04);
    group.add(display);
    const panelX = -w / 2 + 0.3 + sw + 0.35;
    for (let i = 0; i < 6; i++) {
      const k = knob(i < 2 ? 0.28 : 0.18);
      k.position.set(panelX + (i % 2) * 0.75 + 0.3, h * 0.82 - Math.floor(i / 2) * 0.55, d / 2 + 0.03);
      group.add(k);
    }
    // Carry handle across the top.
    const handle = mesh(new THREE.TorusGeometry(w * 0.32, 0.08, 10, 32, Math.PI), mat("#1A1A18", { roughness: 0.6 }));
    handle.position.set(0, h, 0);
    group.add(handle);
    return { group, height: h + w * 0.32, sockets: { y: h * 0.14, x0: -w / 2 + 0.6, x1: w / 2 - 0.6, z: d / 2 } };
  },

  multimeter(width, lines) {
    const group = new THREE.Group();
    const [w, h, d] = [2.8, 4.4, 1.2];
    const holster = mesh(new RoundedBoxGeometry(w, h, d, 4, 0.3), mat("#E3B422", { roughness: 0.6 }));
    holster.position.y = h / 2;
    const face = mesh(new THREE.BoxGeometry(w - 0.5, h - 0.5, 0.04), mat("#3A3A36", { roughness: 0.5 }));
    face.position.set(0, h / 2, d / 2 + 0.01);
    group.add(holster, face);
    const reading = firstNumber(lines.join(" "), /(\d+(?:\.\d+)?)\s*V/);
    const lcd = screen(w - 0.9, 0.9, digits(reading !== null ? reading.toFixed(2) : "0.00", "#1D221C", "#B9C4AE"));
    lcd.position.set(0, h - 1.0, d / 2 + 0.04);
    const dial = knob(0.7, "#2C2C2A");
    dial.position.set(0, h * 0.42, d / 2 + 0.03);
    group.add(lcd, dial);
    return { group, height: h, sockets: { y: 0.5, x0: -0.7, x1: 0.7, z: d / 2 } };
  },
};
const modelFor = (title) =>
  /oscilloscope/i.test(title) ? models.oscilloscope
    : /multimeter/i.test(title) ? models.multimeter
      : /generator/i.test(title) ? models.generator
        : models.supply;

function instrument({ at: [u, v], width, title, lines }, at) {
  const { group: model, height, sockets } = modelFor(title)(width, lines);
  model.traverse((o) => {
    if (o.isMesh) {
      shadowed(o);
    }
  });
  const group = new THREE.Group();
  group.add(model);
  group.position.copy(at(u, v, INSTRUMENT_BASE));
  // Face the board's centre: local +z (the front panel) points at it.
  group.rotation.y = Math.atan2(-group.position.x, -group.position.z);
  group.userData = { labelAt: new THREE.Vector3(0, height + 0.4, 0), title, sockets, cables: [] };
  return group;
}

// Gives each cable a socket on the front panel of the instrument it comes from (the nearest one to its 2D start
// point). Sockets are spread across the model's socket row, ordered by where each cable heads so they don't cross.
function assignSockets(instruments, cables, at) {
  for (const part of cables) {
    const start = at(...part.from);
    const nearest = instruments.reduce((best, inst) => (inst.position.distanceTo(start) < best.position.distanceTo(start) ? inst : best));
    nearest.userData.cables.push(part);
    part.instrument = nearest.userData.title;
  }
  for (const inst of instruments) {
    const { cables: list, sockets: { y, x0, x1, z } } = inst.userData;
    inst.updateMatrixWorld();
    const lateral = new THREE.Vector3(1, 0, 0).applyQuaternion(inst.quaternion);
    const out = new THREE.Vector3(0, 0, 1).applyQuaternion(inst.quaternion);
    list.sort((a, b) => at(...a.to).dot(lateral) - at(...b.to).dot(lateral));
    const spacing = list.length > 1 ? Math.min(0.9, (x1 - x0) / (list.length - 1)) : 0;
    list.forEach((part, i) => {
      const x = (x0 + x1) / 2 + (i - (list.length - 1) / 2) * spacing;
      const socket = inst.localToWorld(new THREE.Vector3(x, y, z));
      // A dark socket ring on the panel and the cable's plug sticking out of it.
      const ring = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 20), mat("#1A1A18", { roughness: 0.4 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, y, z + 0.03);
      const plug = mesh(new THREE.CylinderGeometry(0.13, 0.15, PLUG_LEN, 16), mat(part.color, { roughness: 0.45 }));
      plug.rotation.x = Math.PI / 2;
      plug.position.set(x, y, z + PLUG_LEN / 2);
      inst.add(ring, plug);
      part.socket = { pos: socket.addScaledVector(out, PLUG_LEN), out };
    });
  }
}

// Points along a smooth arc from `from`, leaving along `out`, to `to`, arriving straight down from above. The arc's
// reach scales with the distance, so long cables swing out wide and short leads stay compact.
const arcPoints = (from, out, to, n = 40) => {
  const reach = from.distanceTo(to) * 0.4;
  const curve = new THREE.CubicBezierCurve3(from, from.clone().addScaledVector(out, reach), to.clone().setY(to.y + reach), to);
  return curve.getPoints(n);
};

// A cable from an instrument socket, arcing over and coming down into `endTop`, then on through `tail`.
const cable = ({ socket, color }, endTop, tail, radius) =>
  tube([...arcPoints(socket.pos, socket.out, endTop), ...tail], radius, mat(color, { roughness: 0.5 }));

// A crocodile clip hanging on a short bare stub in the hole. Its lead enters the top of the jaw at clipTop(hole).
const CLIP_TOP = 1.05;
const clipTop = (hole) => hole.clone().setY(CLIP_TOP);
const clip = (hole) => {
  const group = new THREE.Group();
  group.add(leg(hole, hole.clone().setY(0.3), 0.05));
  const jaw = mesh(new THREE.BoxGeometry(0.3, 0.8, 0.34), mat("#2C2C2A", { roughness: 0.5 }));
  jaw.position.copy(hole).setY(0.25 + 0.4);
  group.add(jaw);
  return group;
};

// Breadboards have a dark blue head across one short end with banana binding posts. Seen with the head at the top,
// GND is on the left and + on the right; here that puts + toward the back (by the top + rail) and GND toward the front.
// The bench supply plugs into the posts, and short wires run from the posts to the rails. buildScene adds the head and
// posts and gives supply leads their post.
const HEAD_W = 2.6;
const POST_TOP = 0.95;

function bindingPosts(W) {
  const group = new THREE.Group();
  const x = -W / 2 - HEAD_W / 2 - 0.05;
  const head = mesh(new THREE.BoxGeometry(HEAD_W, BOARD_T, V_MAX - V_MIN), mat("#2A3A5C", { roughness: 0.6 }));
  head.position.set(x, -BOARD_T / 2, (V_MIN + V_MAX) / 2 - 9);
  group.add(head);
  const posts = {};
  for (const [polarity, v, color] of [["plus", 2, "#C93A32"], ["minus", 6, "#2C2C2A"]]) {
    const base = new THREE.Vector3(x, 0, v - 9);
    const nut = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.18, 6), METAL);
    nut.position.copy(base).setY(0.09);
    const cap = mesh(new THREE.CylinderGeometry(0.36, 0.4, POST_TOP - 0.2, 24), mat(color, { roughness: 0.4 }));
    cap.position.copy(base).setY(0.18 + (POST_TOP - 0.2) / 2);
    const socket = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 16), mat("#111110", { roughness: 0.6 }));
    socket.position.copy(base).setY(POST_TOP - 0.01);
    group.add(nut, cap, socket);
    posts[polarity] = { top: base.clone().setY(POST_TOP), foot: base.clone().setY(0.12) };
  }
  return { group, posts };
}

function lead(part, at) {
  const group = new THREE.Group();
  const hole = at(...part.to);
  if (part.clip) {
    group.add(cable(part, clipTop(hole), [], 0.1), clip(hole));
    return group;
  }
  if (part.post) {
    // Supply lead into its binding post, then a short flat wire from the post's foot to the rail hole.
    const { top, foot } = part.post;
    const dir = hole.clone().sub(foot).setY(0).normalize();
    const wire = [foot, foot.clone().addScaledVector(dir, 0.5).setY(WIRE_R), hole.clone().addScaledVector(dir, -0.35).setY(WIRE_R),
      hole.clone().setY(WIRE_R), hole.clone().setY(LEG_DEPTH)];
    group.add(cable(part, top, [], 0.11), tube(wire, 0.1, mat(part.color, { roughness: 0.5 })));
    return group;
  }
  // A plugged-in wire: coloured insulation down to just above the hole, bare end into it.
  group.add(cable(part, hole.clone().setY(0.3), [], 0.11), leg(hole, hole.clone().setY(0.35), 0.06));
  return group;
}

function probe(part, at) {
  const { to, color, clip: clipAt } = part;
  const group = new THREE.Group();
  const hole = at(...to);
  const bottom = 0.5;
  const length = 2.3;
  const body = mesh(new THREE.CylinderGeometry(0.2, 0.24, length, 20), mat(color, { roughness: 0.45 }));
  body.position.copy(hole).setY(bottom + length / 2);
  group.add(body, leg(hole, hole.clone().setY(bottom), 0.04));
  // The probe cable comes down into the top of the probe.
  group.add(cable(part, hole.clone().setY(bottom + length), [], 0.08));
  if (clipAt) {
    // The short ground lead leaves the side of the probe body and arcs over to its clip, clear of the board.
    const clipHole = at(...clipAt);
    const toClip = clipHole.clone().sub(hole).setY(0).normalize();
    const side = hole.clone().addScaledVector(toClip, 0.22).setY(bottom + length * 0.4);
    group.add(tube(arcPoints(side, toClip, clipTop(clipHole), 24), 0.045, mat("#2C2C2A", { roughness: 0.5 })), clip(clipHole));
  }
  return group;
}

const builders = {
  resistor: (p, at) => axial(p, at, 0.3),
  inductor: (p, at) => axial(p, at, 0.42),
  film,
  ecap,
  led,
  pot,
  to92,
  to18,
  jumper,
  instrument,
  lead,
  probe,
};

// Layers used to render the outline masks: every component, and the one whose tag is hovered or focused.
const LAYER_PARTS = 1;
const LAYER_HIGHLIGHT = 2;
const LEADER = { "c-purple": "#534AB7", "c-amber": "#BA7517", "c-teal": "#0F6E56", "c-gray": "#5F5E5A" };
const LABEL_LIFT = 1.5;
const GLOW = "#8F87F0";

// Glowing markers on the holes a part plugs into, shown while the part is highlighted: a bright ring round each hole
// and a soft halo under it (its opacity pulses in the render loop). They draw on top of everything, so holes under the
// part's own body still show. Not on the outline layers, so they aren't outlined.
function holeGlow(holes, at) {
  const group = new THREE.Group();
  const onTop = { transparent: true, depthTest: false, depthWrite: false };
  const ring = new THREE.MeshBasicMaterial({ color: GLOW, opacity: 0.95, side: THREE.DoubleSide, ...onTop });
  const halo = new THREE.MeshBasicMaterial({ color: GLOW, opacity: 0.35, blending: THREE.AdditiveBlending, ...onTop });
  for (const [c, v] of holes) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.38, 32), ring);
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.75, 32), halo);
    for (const [m, y, order] of [[h, 0.008, 10], [r, 0.014, 11]]) {
      m.rotation.x = -Math.PI / 2;
      m.position.copy(at(c, v, y));
      m.renderOrder = order;
      group.add(m);
    }
  }
  group.visible = false;
  group.userData.halo = halo;
  return group;
}

// Recessed grooves across the board, as on real breadboards: [from v, to v, depth]. One between each pair of power
// rails and the terminal strips, and the wider centre channel between rows e and f.
const GROOVES = [[2.85, 3.15, 0.35], [8.6, 9.4, 0.6], [14.85, 15.15, 0.35]];

// The board as slabs separated by grooves. Each slab's top shows its own slice of the board texture.
function buildBoard(W, texture) {
  const board = new THREE.Group();
  const span = V_MAX - V_MIN;
  const side = mat("#E3E0D6", { roughness: 0.85 });
  const floor = mat("#A8A396", { roughness: 0.9 });
  const slice = (v0, v1) => {
    const map = texture.clone();
    map.repeat.set(1, (v1 - v0) / span);
    map.offset.set(0, 1 - (v1 - V_MIN) / span);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.85 });
  };
  const slab = (v0, v1, sunk, top) => {
    const piece = new THREE.Mesh(new THREE.BoxGeometry(W, BOARD_T - sunk, v1 - v0), [side, side, top, side, side, side]);
    piece.position.set(0, -BOARD_T / 2 - sunk / 2, (v0 + v1) / 2 - 9);
    piece.receiveShadow = true;
    return piece;
  };
  let v = V_MIN;
  for (const [g0, g1, depth] of GROOVES) {
    board.add(slab(v, g0, 0, slice(v, g0)), slab(g0, g1, depth, floor));
    v = g1;
  }
  board.add(slab(v, V_MAX, 0, slice(v, V_MAX)));
  return board;
}

function buildScene(renderer, data, at) {
  const W = data.cols + 1;
  const scene = new THREE.Scene();
  // Metal (legs, the TO-18 can) only looks like metal with something to reflect; a generated room needs no download.
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  const texture = boardTexture(data);
  // Keeps the printed labels sharp when the board is seen at a shallow angle.
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const board = buildBoard(W, texture);
  scene.add(board);
  // Everything that should be in frame: board, parts, instruments and cables (not the table or the labels).
  const bounds = new THREE.Box3().setFromObject(board);
  const partsByKey = new Map();
  const glowByKey = new Map();
  // Instruments first, so every cable knows which socket it leaves from before it is built.
  const instruments = new Map(data.parts.filter((p) => p.kind === "instrument").map((p) => [p, instrument(p, at)]));
  assignSockets([...instruments.values()], data.parts.filter((p) => p.kind === "lead" || p.kind === "probe"), at);
  // Supply leads plug into binding posts at the board's head; red is +, anything else −.
  const supplyLeads = data.parts.filter((p) => p.kind === "lead" && !p.clip && /supply/i.test(p.instrument));
  if (supplyLeads.length) {
    const { group, posts } = bindingPosts(W);
    group.traverse((o) => o.layers.enable(LAYER_PARTS));
    scene.add(group);
    bounds.expandByObject(group);
    for (const part of supplyLeads) {
      part.post = posts[/^#E24B4A$/i.test(part.color) ? "plus" : "minus"];
    }
  }
  for (const part of data.parts) {
    const object = instruments.get(part) ?? builders[part.kind]?.(part, at);
    if (!object) {
      continue;
    }
    object.traverse((o) => o.layers.enable(LAYER_PARTS));
    scene.add(object);
    bounds.expandByObject(object);
    if (part.key) {
      partsByKey.set(part.key, object);
      if (part.holes?.length) {
        const glow = holeGlow(part.holes, at);
        scene.add(glow);
        glowByKey.set(part.key, glow);
      }
    }
    if (part.kind === "instrument") {
      const label = document.createElement("div");
      label.className = "inst3d";
      const title = document.createElement("b");
      title.textContent = part.title;
      label.append(title, ...part.lines.map((text) => Object.assign(document.createElement("span"), { textContent: text })));
      const tag = new CSS2DObject(label);
      tag.position.copy(object.localToWorld(object.userData.labelAt.clone()));
      tag.center.set(0.5, 1);
      scene.add(tag);
    }
  }
  // Catches shadows on the table around the board without drawing a visible floor.
  const table = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.18 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = TABLE_Y - 0.001;
  table.receiveShadow = true;
  scene.add(table);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a80, 0.9));
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const R = sphere.radius;
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.copy(sphere.center).add(new THREE.Vector3(-R * 0.35, R * 1.1, R * 0.7));
  sun.target.position.copy(sphere.center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: R * 4 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  return { scene, partsByKey, glowByKey, bounds };
}

// Draws an outline just outside the silhouette in a mask: dark for every component, thicker tag-purple for the
// highlighted one. OutlinePass can't do this because it blends its edges additively, so dark edges vanish.
const OutlineShader = {
  uniforms: {
    tDiffuse: { value: null },
    tParts: { value: null },
    tHighlight: { value: null },
    texel: { value: new THREE.Vector2() },
    partColor: { value: new THREE.Color("#1A1A18") },
    highlightColor: { value: new THREE.Color("#7F77DD") },
    partWidth: { value: 2.5 },
    highlightWidth: { value: 4.5 },
    hasHighlight: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tParts, tHighlight;
    uniform vec2 texel;
    uniform vec3 partColor, highlightColor;
    uniform float partWidth, highlightWidth, hasHighlight;
    varying vec2 vUv;
    // How much of the mask lies within \`width\` pixels of this pixel, minus the pixel itself: an outline just outside
    // the silhouette. Samples three rings of 16 directions, so the cost doesn't grow with the width.
    float ring(sampler2D mask, float width) {
      float inside = texture2D(mask, vUv).a;
      float near = 0.0;
      for (int i = 0; i < 16; i++) {
        float a = float(i) * 0.39269908;
        vec2 d = vec2(cos(a), sin(a)) * width * texel;
        near = max(near, texture2D(mask, vUv + d).a);
        near = max(near, texture2D(mask, vUv + d * 0.66).a);
        near = max(near, texture2D(mask, vUv + d * 0.33).a);
      }
      return clamp(near - inside, 0.0, 1.0);
    }
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      float p = ring(tParts, partWidth) * 0.85;
      base.rgb = mix(base.rgb, partColor, p);
      base.a = max(base.a, p);
      if (hasHighlight > 0.5) {
        float h = ring(tHighlight, highlightWidth);
        base.rgb = mix(base.rgb, highlightColor, h);
        base.a = max(base.a, h);
      }
      gl_FragColor = base;
    }`,
};

// Tags as HTML buttons pinned above their part (or node), with a leader line down to it.
function buildLabels(scene, partsByKey, data, at) {
  const leaders = new THREE.Group();
  scene.add(leaders);
  const labels = [];
  for (const tag of data.tags) {
    const part = partsByKey.get(tag.key);
    let anchor;
    if (part) {
      const box = new THREE.Box3().setFromObject(part);
      anchor = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
    } else if (tag.at) {
      anchor = at(...tag.at, 0.1);
    } else {
      continue;
    }
    const top = anchor.clone().setY(anchor.y + LABEL_LIFT);
    leaders.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([anchor, top]), new THREE.LineBasicMaterial({ color: LEADER[tag.cls] || LEADER["c-purple"] })));
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag3d ${tag.cls}`;
    button.textContent = tag.name;
    if (tag.tip) {
      const { type, value, bands, mark } = tag.tip;
      const spoken = [type, value, bands ? `bands ${bands.map(([n]) => n).join(", ")}` : mark].filter(Boolean).join(", ");
      button.setAttribute("aria-label", `${tag.name}: ${spoken}`);
    }
    const label = new CSS2DObject(button);
    label.position.copy(top);
    // Bottom-centre of the tag sits on the leader's top end.
    label.center.set(0.5, 1);
    scene.add(label);
    labels.push({ tag, button, part });
  }
  return { leaders, labels };
}

function tipContent(tip) {
  const fragment = document.createDocumentFragment();
  const type = document.createElement("b");
  type.textContent = tip.type;
  const value = document.createElement("span");
  value.className = "value";
  value.textContent = tip.value;
  fragment.append(type, value);
  if (tip.bands || tip.mark) {
    const marks = document.createElement("span");
    marks.className = "marks";
    for (const [, hex] of tip.bands || []) {
      const swatch = document.createElement("i");
      swatch.className = "sw";
      swatch.style.background = hex;
      marks.append(swatch);
    }
    marks.append(tip.bands ? tip.bands.map(([n]) => n).join(" · ") : tip.mark);
    fragment.append(marks);
  }
  return fragment;
}

export function mountBoard(container, data) {
  const W = data.cols + 1;
  const at = placer(W);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    // The page shows the board's SVG drawing instead.
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Nothing moves, so shadows are computed once rather than on each of the three renders per frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  container.append(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "label-layer";
  container.append(labelRenderer.domElement);
  const tooltip = document.createElement("div");
  tooltip.className = "tip3d";
  tooltip.hidden = true;
  tooltip.setAttribute("aria-hidden", "true");
  container.append(tooltip);

  const { scene, partsByKey, glowByKey, bounds } = buildScene(renderer, data, at);
  const { leaders, labels } = buildLabels(scene, partsByKey, data, at);
  const camera = new THREE.PerspectiveCamera(35, 16 / 10, 0.1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 6;
  // Frame the whole setup (board, instruments, cables), looking down from the front: the closest camera distance at
  // which every corner of its bounding box is inside the view. Re-fitted on resize until the reader moves the camera.
  const centre = bounds.getCenter(new THREE.Vector3());
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(
    i & 1 ? bounds.max.x : bounds.min.x, i & 2 ? bounds.max.y : bounds.min.y, i & 4 ? bounds.max.z : bounds.min.z));
  const viewDir = new THREE.Vector3(0, 0.95, 1.15).normalize();
  const fits = (distance) => {
    camera.position.copy(centre).addScaledVector(viewDir, distance);
    camera.lookAt(centre);
    camera.updateMatrixWorld();
    return corners.every((corner) => {
      const p = corner.clone().project(camera);
      return Math.abs(p.x) <= 0.94 && Math.abs(p.y) <= 0.9;
    });
  };
  let moved = false;
  controls.addEventListener("start", () => {
    moved = true;
  });
  const frame = () => {
    let [near, far] = [1, 500];
    for (let i = 0; i < 30; i++) {
      const mid = (near + far) / 2;
      [near, far] = fits(mid) ? [near, mid] : [mid, far];
    }
    camera.position.copy(centre).addScaledVector(viewDir, far);
    controls.target.copy(centre);
    controls.maxDistance = far * 2;
    controls.update();
  };
  frame();
  // Mouse: left orbits, right pans, the wheel zooms while over the view. On touch the page must stay scrollable (several
  // boards share it), so touch-action: pan-y leaves vertical swipes to the browser: a sideways swipe orbits, an up/down
  // swipe scrolls the page (the browser cancels the orbit), and two fingers orbit freely and zoom. Full screen there is
  // nothing to scroll, so one finger orbits in every direction and two pinch and pan (setExpanded).
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  renderer.domElement.style.touchAction = "pan-y";
  // touch-action: pan-y also lets the browser scroll the page on a two-finger vertical move, which would cancel the
  // orbit halfway. Claim every multi-finger gesture for the view instead.
  const claimMultiTouch = (event) => {
    if (event.touches.length > 1 && event.cancelable) {
      event.preventDefault();
    }
  };
  for (const type of ["touchstart", "touchmove"]) {
    renderer.domElement.addEventListener(type, claimMultiTouch, { passive: false });
  }
  // Pressing the right button while orbiting with the left switches the drag to panning for the rest of the drag
  // (releasing right alone doesn't switch back). OrbitControls fixes its mode when a drag starts, and a chorded button
  // press arrives as a pointermove, not a pointerdown, so the drag is restarted as a right-button drag where it is.
  let chordPan = false;
  renderer.domElement.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || chordPan || (event.buttons & 3) !== 3) {
      return;
    }
    chordPan = true;
    const init = { bubbles: true, pointerId: event.pointerId, pointerType: "mouse", isPrimary: true, clientX: event.clientX, clientY: event.clientY };
    renderer.domElement.dispatchEvent(new PointerEvent("pointerup", { ...init, button: 0, buttons: 0 }));
    renderer.domElement.dispatchEvent(new PointerEvent("pointerdown", { ...init, button: 2, buttons: 2 }));
  });
  // Only the reader's real final release ends it, not the synthetic pointerup sent while restarting the drag.
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (event.isTrusted && event.buttons === 0) {
      chordPan = false;
    }
  });

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  const outline = new ShaderPass(OutlineShader);
  composer.addPass(outline);
  composer.addPass(new OutputPass());
  const masks = [LAYER_PARTS, LAYER_HIGHLIGHT].map(() => new THREE.WebGLRenderTarget(1, 1, { samples: 4 }));
  outline.uniforms.tParts.value = masks[0].texture;
  outline.uniforms.tHighlight.value = masks[1].texture;
  const maskMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const renderMask = (target, layer) => {
    scene.overrideMaterial = maskMaterial;
    camera.layers.set(layer);
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    camera.layers.set(0);
    scene.overrideMaterial = null;
  };

  let dirty = true;
  const invalidate = () => {
    dirty = true;
  };
  controls.addEventListener("change", invalidate);
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    // The stage collapses to nothing while another view is selected; keep the last real size.
    if (!width || !height) {
      return;
    }
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(width, height);
    const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
    for (const mask of masks) {
      mask.setSize(buffer.x, buffer.y);
    }
    outline.uniforms.texel.value.set(1 / buffer.x, 1 / buffer.y);
    outline.uniforms.partWidth.value = 2.5 * renderer.getPixelRatio();
    outline.uniforms.highlightWidth.value = 4.5 * renderer.getPixelRatio();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!moved) {
      frame();
    }
    invalidate();
  }).observe(container);

  // A part is highlighted while its own tag is hovered/focused (active) or while the page asks for it, e.g. when the
  // reader hovers the part's label in the schematic (external).
  let active = null;
  let external = new Set();
  const syncHighlight = () => {
    let any = false;
    for (const [key, part] of partsByKey) {
      const on = part === active?.part || external.has(key);
      any ||= on;
      part.traverse((o) => (on ? o.layers.enable(LAYER_HIGHLIGHT) : o.layers.disable(LAYER_HIGHLIGHT)));
      const glow = glowByKey.get(key);
      if (glow) {
        glow.visible = on;
      }
    }
    outline.uniforms.hasHighlight.value = any ? 1 : 0;
    for (const { tag, button } of labels) {
      button.classList.toggle("is-hot", external.has(tag.key));
    }
    invalidate();
  };
  // Tells the page which tag is hovered (or none), so it can highlight the same part in the schematic.
  const announce = (entry) => {
    container.dispatchEvent(new CustomEvent("tag-hover", { bubbles: true, detail: entry ? { name: entry.tag.name, key: entry.tag.key } : null }));
  };
  const placeTooltip = (button) => {
    const box = container.getBoundingClientRect();
    const tag = button.getBoundingClientRect();
    const tip = tooltip.getBoundingClientRect();
    // Tags float above their parts, so the tip goes above the tag where it fits and only drops below when it doesn't.
    const above = tag.top - box.top - 8 - tip.height >= 0;
    const left = Math.min(Math.max(tag.left - box.left + tag.width / 2 - tip.width / 2, 8), box.width - tip.width - 8);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${above ? tag.top - box.top - 8 - tip.height : tag.bottom - box.top + 8}px`;
  };
  const show = (entry) => {
    if (active === entry) {
      return;
    }
    hide();
    active = entry;
    syncHighlight();
    announce(entry);
    if (entry.tag.tip) {
      tooltip.replaceChildren(tipContent(entry.tag.tip));
      tooltip.hidden = false;
      placeTooltip(entry.button);
    }
  };
  function hide() {
    if (!active) {
      return;
    }
    active = null;
    syncHighlight();
    announce(null);
    tooltip.hidden = true;
  }
  const focusedLabel = () => labels.find((l) => l.button === document.activeElement);
  for (const entry of labels) {
    // Touch has no hover: a tap's pointerenter and pointerleave come back to back. Instead a tap toggles the tag's
    // tooltip, moving focus along with it (iOS doesn't focus buttons on tap by itself).
    // Whether the tip was open is read at pointerdown: Android focuses the button during the tap, which opens the tip
    // before click runs, so checking then would close it straight away.
    let tapped = false;
    let wasOpen = false;
    entry.button.addEventListener("pointerdown", (event) => {
      tapped = event.pointerType !== "mouse";
      wasOpen = active === entry;
    });
    entry.button.addEventListener("click", () => {
      if (!tapped) {
        return;
      }
      if (wasOpen) {
        entry.button.blur();
        hide();
      } else {
        entry.button.focus();
        show(entry);
      }
    });
    entry.button.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") {
        show(entry);
      }
    });
    // Hover wins while it lasts; afterwards the keyboard-focused tag (if any) gets its tooltip back.
    entry.button.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "mouse") {
        return;
      }
      hide();
      const focused = focusedLabel();
      if (focused) {
        show(focused);
      }
    });
    entry.button.addEventListener("focus", () => show(entry));
    entry.button.addEventListener("blur", hide);
  }
  // A tap on the view itself dismisses a tapped tag's tooltip; the canvas can't take focus, so blur it explicitly.
  renderer.domElement.addEventListener("pointerdown", () => {
    focusedLabel()?.button.blur();
    hide();
  });
  // Unlike the CSS-only 2D tooltips, these can be dismissed without moving focus (WCAG 1.4.13).
  container.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hide();
    }
  });
  controls.addEventListener("start", hide);

  const toggle = document.getElementById("show-tags");
  const syncLabels = () => {
    leaders.visible = !toggle || toggle.checked;
    hide();
    invalidate();
  };
  toggle?.addEventListener("change", syncLabels);
  syncLabels();

  // While holes are glowing, their halos pulse, which needs a frame every tick (skipped for reduced motion).
  const pulse = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setAnimationLoop((time) => {
    controls.update();
    if (pulse) {
      for (const glow of glowByKey.values()) {
        if (glow.visible) {
          glow.userData.halo.opacity = 0.22 + 0.2 * (0.5 + 0.5 * Math.sin(time / 260));
          dirty = true;
        }
      }
    }
    if (!dirty) {
      return;
    }
    dirty = false;
    renderMask(masks[0], LAYER_PARTS);
    renderMask(masks[1], LAYER_HIGHLIGHT);
    composer.render();
    labelRenderer.render(scene, camera);
    if (active && !tooltip.hidden) {
      placeTooltip(active.button);
    }
  });
  return {
    highlight(keys) {
      external = new Set(keys);
      syncHighlight();
    },
    // Full screen there is no page to scroll: one finger orbits in every direction and two pinch and pan, as in map and
    // model viewers. The resize that follows re-frames the setup.
    setExpanded(on) {
      controls.touches.TWO = on ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.DOLLY_ROTATE;
      renderer.domElement.style.touchAction = on ? "none" : "pan-y";
      moved = false;
    },
  };
}

