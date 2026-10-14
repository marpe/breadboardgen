import { writeFileSync } from "node:fs";
const LEADER = { "c-purple": "#534AB7", "c-amber": "#BA7517", "c-teal": "#0F6E56", "c-gray": "#5F5E5A" };


const S = 17;
const X0 = 330;
const Y0 = 150;
const K = Math.cos(Math.PI / 6) * S;
const f = (n) => Math.round(n * 10) / 10;
const P = (u, v, h = 0) => [f(X0 + (u - v) * K), f(Y0 + (u + v) * 0.5 * S - h)];
const pt = (p) => `${p[0]},${p[1]}`;
const out = [];
const add = (s) => out.push(s);

const R = { a: 4, b: 5, c: 6, d: 7, e: 8, f: 10, g: 11, h: 12, i: 13, j: 14, tp: 1, tn: 2, bp: 16, bn: 17 };
const COLS = 19;
const T = 9;

const poly = (pts, fill, stroke = "none", sw = 0.5) =>
  `<polygon points="${pts.map(pt).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line = (a, b, color, w = 1.2, cap = "round") =>
  `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${w}" stroke-linecap="${cap}"/>`;

add(poly([P(0, 18), P(20, 18), [P(20, 18)[0], P(20, 18)[1] + T], [P(0, 18)[0], P(0, 18)[1] + T]], "#D3D1C7", "#B4B2A9"));
add(poly([P(20, 0), P(20, 18), [P(20, 18)[0], P(20, 18)[1] + T], [P(20, 0)[0], P(20, 0)[1] + T]], "#C4C2B8", "#B4B2A9"));
add(poly([P(0, 0), P(20, 0), P(20, 18), P(0, 18)], "#F6F4EE", "#B4B2A9"));
add(poly([P(0.4, 8.75), P(19.6, 8.75), P(19.6, 9.25), P(0.4, 9.25)], "#DEDBD2"));

const tint = (c, v1, v2, fill) => add(poly([P(c - 0.42, v1 - 0.45), P(c + 0.42, v1 - 0.45), P(c + 0.42, v2 + 0.45), P(c - 0.42, v2 + 0.45)], fill));
tint(8, 4, 8, "#FAC775");
tint(16, 4, 8, "#9FE1CB");

add(line(P(0.6, 0.35), P(19.4, 0.35), "#E24B4A", 1));
add(line(P(0.6, 2.65), P(19.4, 2.65), "#378ADD", 1));
add(line(P(0.6, 15.35), P(19.4, 15.35), "#E24B4A", 1));
add(line(P(0.6, 17.65), P(19.4, 17.65), "#378ADD", 1));

const holeRows = [1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17];
for (const v of holeRows) {
  for (let c = 1; c <= COLS; c++) {
    if ((v === 1 || v === 2 || v === 16 || v === 17) && c % 6 === 0) {
      continue;
    }
    const p = P(c, v);
    add(`<ellipse cx="${p[0]}" cy="${p[1]}" rx="2.4" ry="1.4" fill="#888780"/>`);
  }
}

const lbl = (p, t, size, fill, weight = 500) => {
  const a = `x="${p[0]}" y="${p[1]}" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="${weight}"`;
  add(`<text ${a} fill="#F6F4EE" stroke="#F6F4EE" stroke-width="3" stroke-linejoin="round">${t}</text><text ${a} fill="${fill}">${t}</text>`);
};
for (let c = 1; c <= COLS; c++) {
  const t = P(c, -0.85);
  const b = P(c, 19.15);
  add(`<text class="bbl" x="${t[0]}" y="${t[1]}" text-anchor="middle" dominant-baseline="central">${c}</text>`);
  add(`<text class="bbl" x="${b[0]}" y="${f(b[1] + T)}" text-anchor="middle" dominant-baseline="central">${c}</text>`);
}
const rowNames = [["a", 4], ["b", 5], ["c", 6], ["d", 7], ["e", 8], ["f", 10], ["g", 11], ["h", 12], ["i", 13], ["j", 14]];
for (const [r, v] of rowNames) {
  lbl(P(0.25, v), r, 12, "#2C2C2A");
  lbl(P(19.75, v), r, 12, "#2C2C2A");
}
for (const [t, v, col] of [["+", 1, "#A32D2D"], ["−", 2, "#185FA5"], ["+", 16, "#A32D2D"], ["−", 17, "#185FA5"]]) {
  lbl(P(0.25, v), t, 15, col, 600);
  lbl(P(19.75, v), t, 15, col, 600);
}

const draws = [];
const depth = (u, v) => u + v;
const used = new Map();
const hole = (c, v) => {
  used.set(`${c},${v}`, [c, v]);
  return P(c, v);
};
const lead = (a, b) => line(a, b, "#2C2C2A", 3.2) + line(a, b, "#D3D1C7", 1.6);

const resistor = (c1, v1, c2, v2) => {
  const h = 5;
  const a = hole(c1, v1);
  const b = hole(c2, v2);
  const a2 = P(c1, v1, h);
  const b2 = P(c2, v2, h);
  const at = (t) => [f(a2[0] + (b2[0] - a2[0]) * t), f(a2[1] + (b2[1] - a2[1]) * t)];
  let s = lead(a, a2) + lead(b, b2) + lead(a2, b2);
  s += line(at(0.22), at(0.78), "#2C2C2A", 8.9);
  s += line(at(0.22), at(0.78), "#C9A86A", 6.5);
  const dx = b2[0] - a2[0];
  const dy = b2[1] - a2[1];
  const L = Math.hypot(dx, dy);
  const nx = (-dy / L) * 3.2;
  const ny = (dx / L) * 3.2;
  for (const t of [0.35, 0.47, 0.59]) {
    const q = at(t);
    s += line([f(q[0] - nx), f(q[1] - ny)], [f(q[0] + nx), f(q[1] + ny)], t === 0.47 ? "#444441" : "#993C1D", 1.6, "butt");
  }
  draws.push({ d: depth((c1 + c2) / 2, (v1 + v2) / 2), s });
  return [f((a2[0] + b2[0]) / 2), f((a2[1] + b2[1]) / 2)];
};

const ecap = (cp, vp, cn, vn) => {
  const uc = (cp + cn) / 2;
  const vc = (vp + vn) / 2;
  const base = P(uc, vc, 6);
  const r = 6.5;
  const H = 24;
  const top = base[1] - H;
  let s = lead(hole(cp, vp), [f(base[0] - r * 0.45), base[1]]) + lead(hole(cn, vn), [f(base[0] + r * 0.45), base[1]]);
  s += `<path d="M${f(base[0] - r)},${top} L${f(base[0] - r)},${base[1]} A${r},${f(r * 0.55)} 0 0 0 ${f(base[0] + r)},${base[1]} L${f(base[0] + r)},${top} Z" fill="#185FA5" stroke="#042C53" stroke-width="1.3"/>`;
  s += `<rect x="${f(base[0] + r * 0.25)}" y="${top}" width="${f(r * 0.55)}" height="${H}" fill="#B5D4F4"/>`;
  s += `<ellipse cx="${base[0]}" cy="${top}" rx="${r}" ry="${f(r * 0.55)}" fill="#378ADD" stroke="#042C53" stroke-width="1.3"/>`;
  draws.push({ d: depth(uc, vc) + 0.3, s });
  return [base[0], f(top - 2)];
};

const film = (c1, v1, c2, v2) => {
  const uc = (c1 + c2) / 2;
  const vc = (v1 + v2) / 2;
  const base = P(uc, vc, 7);
  const w = 7;
  const H = 14;
  let s = lead(hole(c1, v1), [f(base[0] - 3), base[1]]) + lead(hole(c2, v2), [f(base[0] + 3), base[1]]);
  s += `<rect x="${f(base[0] - w)}" y="${f(base[1] - H)}" width="${w * 2}" height="${H}" rx="2.5" fill="#E8C547" stroke="#633806" stroke-width="1.3"/>`;
  s += `<rect x="${f(base[0] - w + 2)}" y="${f(base[1] - H + 2)}" width="3" height="${H - 4}" rx="1" fill="#F7E3A1"/>`;
  draws.push({ d: depth(uc, vc) + 0.3, s });
  return [base[0], f(base[1] - H - 2)];
};

const jumper = (c1, v1, c2, v2, color, lift = 12) => {
  const m = P((c1 + c2) / 2, (v1 + v2) / 2, lift);
  const s = `<path d="M${pt(hole(c1, v1))} Q${pt(m)} ${pt(hole(c2, v2))}" fill="none" stroke="#2C2C2A" stroke-width="4.2" stroke-linecap="round"/><path d="M${pt(P(c1, v1))} Q${pt(m)} ${pt(P(c2, v2))}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round"/>`;
  draws.push({ d: depth((c1 + c2) / 2, (v1 + v2) / 2) - 0.2, s });
};

const transistor = (c, v) => {
  let s = "";
  for (const dc of [-1, 0, 1]) {
    s += lead(hole(c + dc, v), P(c + dc * 0.7, v, 9));
  }
  const b = P(c, v - 0.2, 9);
  const r = 9;
  const ry = 5;
  const top = b[1] - 16;
  s += `<path d="M${f(b[0] - r)},${top} L${f(b[0] - r)},${b[1]} A${r},${ry} 0 0 0 ${f(b[0] + r)},${b[1]} L${f(b[0] + r)},${top} Z" fill="#B4B2A9" stroke="#2C2C2A" stroke-width="1.3"/>`;
  s += `<rect x="${f(b[0] - r + 2)}" y="${top}" width="4" height="16" fill="#D3D1C7"/>`;
  s += `<ellipse cx="${b[0]}" cy="${top}" rx="${r}" ry="${ry}" fill="#D3D1C7" stroke="#2C2C2A" stroke-width="1.3"/>`;
  s += `<path d="M${f(b[0] - r - 1)},${f(b[1] - 3)} l-5,2 l1,3 l5,-1" fill="#B4B2A9" stroke="#2C2C2A" stroke-width="1.3"/>`;
  draws.push({ d: depth(c, v) + 0.4, s });
  return P(c, v - 0.2, 31);
};

const anchors = {};

jumper(10, R.e, 7, R.f, "#7F77DD");
jumper(11, R.e, 11, R.f, "#D4537E");
jumper(19, R.tn, 19, R.bn, "#2C2C2A", 26);

anchors.R1 = resistor(11, R.a, 11, R.tp);
anchors.R3 = resistor(12, R.a, 14, R.tp);
anchors.R2 = resistor(11, R.j, 11, R.bn);
anchors.R4 = resistor(7, R.j, 7, R.bn);
anchors.C1 = film(8, R.b, 11, R.b);
anchors.C2 = film(12, R.c, 16, R.c);
anchors.C3 = ecap(7, R.h, 9, R.bn);
anchors.Q3 = transistor(11, R.d);

const ring = (c, v) => {
  const p = P(c, v);
  add(`<ellipse cx="${p[0]}" cy="${p[1]}" rx="5.2" ry="3.2" fill="#FFFFFF" stroke="#D85A30" stroke-width="1.8"/><ellipse cx="${p[0]}" cy="${p[1]}" rx="2.2" ry="1.3" fill="#2C2C2A"/>`);
};
for (const extra of [[2, 1], [2, 2], [8, 7], [3, 17], [8, 4], [16, 4], [9, 2], [15, 2]]) {
  used.set(`${extra[0]},${extra[1]}`, extra);
}
for (const [c, v] of used.values()) {
  ring(c, v);
}

draws.sort((a, b) => a.d - b.d);
for (const d of draws) {
  add(d.s);
}

const box = (x, y, w, h, title, sub) => {
  let s = `<g class="c-gray"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" stroke-width="0.5"/>`;
  s += `<text class="th" x="${x + w / 2}" y="${y + 18}" text-anchor="middle" dominant-baseline="central">${title}</text>`;
  if (sub) {
    s += `<text class="ts" x="${x + w / 2}" y="${y + 36}" text-anchor="middle" dominant-baseline="central">${sub}</text>`;
  }
  s += `</g>`;
  add(s);
};

const gndLead = (d) => {
  add(`<path d="${d}" fill="none" stroke="#F6F4EE" stroke-width="5" stroke-linecap="round"/>`);
  add(`<path d="${d}" fill="none" stroke="#2C2C2A" stroke-width="2.4" stroke-dasharray="7 4" stroke-linecap="round"/>`);
};
const clip = (p) => add(`<rect x="${f(p[0] - 4)}" y="${f(p[1] - 9)}" width="8" height="9" rx="1.5" fill="#2C2C2A"/><circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="#2C2C2A"/>`);
const flying = (from, to, color, dash = false) => {
  const mx = (from[0] + to[0]) / 2;
  const d = `M${pt(from)} C${f(mx)},${from[1]} ${f(mx)},${to[1]} ${pt(to)}`;
  if (dash) {
    gndLead(d);
    return;
  }
  add(`<path d="${d}" fill="none" stroke="${color}" stroke-width="2"/>`);
};
const tip = (p, color) => add(`<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="${color}"/>`);

box(40, 40, 150, 52, "V1 bench supply", "+12 V / 0 V");
flying([190, 58], P(2, R.tp), "#E24B4A");
add(`<path d="M190,74 C${f((190 + P(2, R.tn)[0]) / 2)},74 ${f((190 + P(2, R.tn)[0]) / 2)},${P(2, R.tn)[1]} ${pt(P(2, R.tn))}" fill="none" stroke="#F6F4EE" stroke-width="5"/><path d="M190,74 C${f((190 + P(2, R.tn)[0]) / 2)},74 ${f((190 + P(2, R.tn)[0]) / 2)},${P(2, R.tn)[1]} ${pt(P(2, R.tn))}" fill="none" stroke="#2C2C2A" stroke-width="2"/>`);
tip(P(2, R.tp), "#E24B4A");
tip(P(2, R.tn), "#5F5E5A");

box(20, 196, 160, 52, "Signal generator", "1 kHz, 10 mVpp");
flying([180, 214], P(8, R.d), "#BA7517");
flying([100, 248], P(3, R.bn), "#2C2C2A", true);
tip(P(8, R.d), "#BA7517");
clip(P(3, R.bn));

box(500, 40, 150, 70, "Oscilloscope", "");
add(`<text class="ts" x="575" y="76" text-anchor="middle" dominant-baseline="central">CH1 Uin · CH2 Uut</text>`);
add(`<text class="ts" x="575" y="94" text-anchor="middle" dominant-baseline="central">Ground clips to GND rail</text>`);

const probe = (from, hole, color, gnd) => {
  const h = P(hole[0], hole[1]);
  const top = [h[0], h[1] - 34];
  add(`<path d="M${pt(from)} C${from[0]},${f(top[1] - 40)} ${top[0]},${f(top[1] - 50)} ${pt(top)}" fill="none" stroke="${color}" stroke-width="1.6"/>`);
  add(`<rect x="${f(top[0] - 2.5)}" y="${f(top[1])}" width="5" height="22" rx="2" fill="${color}"/>`);
  add(line([top[0], f(top[1] + 22)], h, "#2C2C2A", 3.2) + line([top[0], f(top[1] + 22)], h, color, 1.8));
  tip(h, color);
  const g = P(gnd[0], gnd[1]);
  const gs = [f(top[0] + 2.5), f(top[1] + 8)];
  gndLead(`M${pt(gs)} Q${f((gs[0] + g[0]) / 2 + 12)},${f(Math.min(gs[1], g[1]) - 16)} ${pt(g)}`);
  clip(g);
};
probe([530, 110], [8, R.a], "#BA7517", [9, R.tn]);
probe([575, 110], [16, R.a], "#1D9E75", [15, R.tn]);

anchors.Uin = P(8, 8.3);
anchors.Uut = P(16, 6);
anchors["GND bridge"] = P(19, 9.5, 13);

const pill = (x, y, name, cls, a) => {
  if (a) {
    add(`<line x1="${a[0]}" y1="${a[1]}" x2="${x}" y2="${y}" stroke="#F6F4EE" stroke-width="4.4" stroke-linecap="round"/><line x1="${a[0]}" y1="${a[1]}" x2="${x}" y2="${y}" stroke="${LEADER[cls] || "#534AB7"}" stroke-width="2" stroke-dasharray="6 3.5" stroke-linecap="round"/><circle cx="${a[0]}" cy="${a[1]}" r="3" fill="${LEADER[cls] || "#534AB7"}" stroke="#F6F4EE" stroke-width="1"/>`);
  }
  const w = name.length * 8 + 14;
  add(`<g class="${cls}"><rect x="${f(x - w / 2)}" y="${y - 10}" width="${w}" height="20" rx="4" stroke-width="0.5"/><text class="th" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${name}</text></g>`);
};
const labels = process.argv[2] ? JSON.parse(process.argv[2]) : {};
for (const [k, [x, y, cls]] of Object.entries(labels)) {
  pill(x, y, k, cls || "c-purple", anchors[k]);
}

const VH = Number(process.env.VH || 560);
const svg = `<svg width="100%" viewBox="0 0 680 ${VH}" role="img" xmlns="http://www.w3.org/2000/svg"><title>Common emitter amplifier on a breadboard</title><desc>Isometric breadboard with components R1, R2, R3, R4, C1, C2, C3 and Q3, plus supply, signal generator and scope probe connections.</desc>${out.join("")}</svg>`;
writeFileSync(process.argv[3] || "bb.svg", svg);
