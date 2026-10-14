import { bands4 } from "./markings.mjs";

const LEADER = { "c-purple": "#534AB7", "c-amber": "#BA7517", "c-teal": "#0F6E56", "c-gray": "#5F5E5A" };
export const ROW = { a: 4, b: 5, c: 6, d: 7, e: 8, f: 10, g: 11, h: 12, i: 13, j: 14, tp: 1, tn: 2, bp: 16, bn: 17 };

const f = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${p[0]},${p[1]}`;
const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

export function makeBoard({ cols = 19, view = "iso", S = view === "top" ? 24 : 17, X0 = view === "top" ? (680 - (cols + 1) * S) / 2 : 330, Y0 = 150 } = {}) {
  const flat = view === "top";
  const K = Math.cos(Math.PI / 6) * S;
  const W = cols + 1;
  const T = flat ? 0 : 9;
  // Top-down ignores h: parts lie flat, so anything placed "above" the board lands on its footprint.
  const P = flat
    ? (u, v) => [f(X0 + u * S), f(Y0 + v * S)]
    : (u, v, h = 0) => [f(X0 + (u - v) * K), f(Y0 + (u + v) * 0.5 * S - h)];
  const height = flat ? Math.ceil(Y0 + 19.15 * S + 18) : undefined;
  const overlay = [];
  const draws = [];
  // Keyed by the anchor array a part returns, so `b.anchors.R1 = b.resistor(...)` alone links tag R1 to that drawing.
  const partOf = new WeakMap();
  const part = (d, s, anchor) => {
    const item = { d, s };
    draws.push(item);
    partOf.set(anchor, item);
    return anchor;
  };
  const used = new Map();
  const tints = [];
  const anchors = {};
  const obs = [];
  // The obstacle points a part adds become its footprint, which tooltips try not to cover.
  const footprint = new WeakMap();
  const def = (fn) => (...args) => {
    const start = obs.length;
    const anchor = fn(...args);
    footprint.set(anchor, obs.slice(start));
    return anchor;
  };
  const ob = (p) => obs.push(p);
  const obSeg = (a, b, n = 8) => {
    for (let i = 0; i <= n; i++) {
      ob([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
    }
  };
  const obRect = (x, y, w, h) => {
    for (let i = 0; i <= 6; i++) {
      for (let j = 0; j <= 4; j++) {
        ob([x + (w * i) / 6, y + (h * j) / 4]);
      }
    }
  };
  const quad = (a, m, b, n = 14) => {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      ob([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * m[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * m[1] + t * t * b[1]]);
    }
  };
  const cubic = (a, c1, c2, b, n = 20) => {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      ob([u ** 3 * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * b[0], u ** 3 * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * b[1]]);
    }
  };

  const poly = (pts, fill, stroke = "none", sw = 0.5) =>
    `<polygon points="${pts.map(pt).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const line = (a, b, color, w = 1.2, cap = "round") =>
    `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
  const hole = (c, v) => {
    used.set(`${c},${v}`, [c, v]);
    return P(c, v);
  };
  const lead = (a, b) => line(a, b, "#2C2C2A", 3.2) + line(a, b, "#D3D1C7", 1.6);
  const depth = (u, v) => u + v;
  const mid = (a, b, t) => [f(a[0] + (b[0] - a[0]) * t), f(a[1] + (b[1] - a[1]) * t)];

  const tint = (c, v1, v2, fill) => tints.push([c, v1, v2, fill]);

  const axial = (c1, v1, c2, v2, { body = "#C9A86A", bands = ["#993C1D", "#444441", "#993C1D"], at, width = 6.5 } = {}) => {
    const h = 5;
    const a = hole(c1, v1);
    const b = hole(c2, v2);
    const a2 = P(c1, v1, h);
    const b2 = P(c2, v2, h);
    let s = lead(a, a2) + lead(b, b2) + lead(a2, b2);
    obSeg(a2, b2, 10);
    s += line(mid(a2, b2, 0.22), mid(a2, b2, 0.78), "#2C2C2A", width + 2.4);
    s += line(mid(a2, b2, 0.22), mid(a2, b2, 0.78), body, width);
    const dx = b2[0] - a2[0];
    const dy = b2[1] - a2[1];
    const L = Math.hypot(dx, dy);
    const nx = (-dy / L) * (width / 2);
    const ny = (dx / L) * (width / 2);
    bands.forEach((col, i) => {
      const q = mid(a2, b2, at ? at[i] : 0.35 + i * (0.24 / Math.max(1, bands.length - 1)));
      s += line([f(q[0] - nx), f(q[1] - ny)], [f(q[0] + nx), f(q[1] + ny)], col, 1.6, "butt");
    });
    return part(depth((c1 + c2) / 2, (v1 + v2) / 2), s, [f((a2[0] + b2[0]) / 2), f((a2[1] + b2[1]) / 2)]);
  };
  // With a value, draws its 4-band code: three value bands together, the tolerance band set apart at the far end.
  const resistor = (c1, v1, c2, v2, ohms) =>
    axial(c1, v1, c2, v2, ohms ? { bands: bands4(ohms).map(([, hex]) => hex), at: [0.32, 0.4, 0.48, 0.67] } : {});
  const inductor = (c1, v1, c2, v2) =>
    axial(c1, v1, c2, v2, { body: "#3B6D11", bands: ["#97C459", "#97C459", "#97C459", "#97C459", "#97C459"], width: 9 });

  const circle = (c, r, fill, stroke, sw = 1.3) => `<circle cx="${c[0]}" cy="${c[1]}" r="${f(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  const onCircle = (c, r, ang) => [f(c[0] + r * Math.cos(ang)), f(c[1] + r * Math.sin(ang))];

  const ecap = (cp, vp, cn, vn, at) => {
    const uc = at ? at[0] : (cp + cn) / 2;
    const vc = at ? at[1] : (vp + vn) / 2;
    if (flat) {
      const c = P(uc, vc);
      const r = 0.36 * S;
      let s = lead(hole(cp, vp), c) + lead(hole(cn, vn), c);
      obRect(c[0] - r, c[1] - r, 2 * r, 2 * r);
      obSeg(P(cp, vp), c);
      obSeg(P(cn, vn), c);
      s += circle(c, r, "#185FA5", "#042C53");
      // Light stripe marks the − side, turned toward the − lead.
      const ang = Math.atan2(P(cn, vn)[1] - c[1], P(cn, vn)[0] - c[0]);
      s += `<path d="M${pt(onCircle(c, r - 0.6, ang - 0.8))} A${f(r - 0.6)},${f(r - 0.6)} 0 0 1 ${pt(onCircle(c, r - 0.6, ang + 0.8))} Z" fill="#B5D4F4"/>`;
      s += line(onCircle(c, r * 0.45, Math.PI / 4), onCircle(c, r * 0.45, (5 * Math.PI) / 4), "#0C447C", 1);
      s += line(onCircle(c, r * 0.45, (3 * Math.PI) / 4), onCircle(c, r * 0.45, (7 * Math.PI) / 4), "#0C447C", 1);
      return part(depth(uc, vc) + 0.3, s, [c[0], f(c[1] - r - 2)]);
    }
    const b = P(uc, vc, 6);
    const r = 6.5;
    const H = 24;
    const top = b[1] - H;
    let s = lead(hole(cp, vp), [f(b[0] - r * 0.45), b[1]]) + lead(hole(cn, vn), [f(b[0] + r * 0.45), b[1]]);
    obRect(b[0] - r, top - 4, 2 * r, H + 4);
    obSeg(P(cp, vp), b);
    obSeg(P(cn, vn), b);
    s += `<path d="M${f(b[0] - r)},${top} L${f(b[0] - r)},${b[1]} A${r},${f(r * 0.55)} 0 0 0 ${f(b[0] + r)},${b[1]} L${f(b[0] + r)},${top} Z" fill="#185FA5" stroke="#042C53" stroke-width="1.3"/>`;
    s += `<rect x="${f(b[0] + r * 0.25)}" y="${top}" width="${f(r * 0.55)}" height="${H}" fill="#B5D4F4"/>`;
    s += `<ellipse cx="${b[0]}" cy="${top}" rx="${r}" ry="${f(r * 0.55)}" fill="#378ADD" stroke="#042C53" stroke-width="1.3"/>`;
    return part(depth(uc, vc) + 0.3, s, [b[0], f(top - 2)]);
  };

  const film = (c1, v1, c2, v2) => {
    const uc = (c1 + c2) / 2;
    const vc = (v1 + v2) / 2;
    if (flat) {
      const c = P(uc, vc);
      const w = 0.4 * S;
      const h = 0.2 * S;
      let s = lead(hole(c1, v1), c) + lead(hole(c2, v2), c);
      obRect(c[0] - w, c[1] - h, 2 * w, 2 * h);
      obSeg(P(c1, v1), c);
      obSeg(P(c2, v2), c);
      s += `<rect x="${f(c[0] - w)}" y="${f(c[1] - h)}" width="${f(2 * w)}" height="${f(2 * h)}" rx="2" fill="#E8C547" stroke="#633806" stroke-width="1.3"/>`;
      s += `<rect x="${f(c[0] - w + 2)}" y="${f(c[1] - h + 1.5)}" width="${f(2 * w - 4)}" height="2" rx="1" fill="#F7E3A1"/>`;
      return part(depth(uc, vc) + 0.3, s, [c[0], f(c[1] - h - 2)]);
    }
    const b = P(uc, vc, 7);
    const w = 7;
    const H = 14;
    let s = lead(hole(c1, v1), [f(b[0] - 3), b[1]]) + lead(hole(c2, v2), [f(b[0] + 3), b[1]]);
    obRect(b[0] - w, b[1] - H, 2 * w, H);
    obSeg(P(c1, v1), b);
    obSeg(P(c2, v2), b);
    s += `<rect x="${f(b[0] - w)}" y="${f(b[1] - H)}" width="${w * 2}" height="${H}" rx="2.5" fill="#E8C547" stroke="#633806" stroke-width="1.3"/>`;
    s += `<rect x="${f(b[0] - w + 2)}" y="${f(b[1] - H + 2)}" width="3" height="${H - 4}" rx="1" fill="#F7E3A1"/>`;
    return part(depth(uc, vc) + 0.3, s, [b[0], f(b[1] - H - 2)]);
  };

  const led = (ca, va, cc, vc2) => {
    const uc = (ca + cc) / 2;
    const vc = (va + vc2) / 2;
    if (flat) {
      const c = P(uc, vc);
      const r = 0.3 * S;
      let s = lead(hole(ca, va), c) + lead(hole(cc, vc2), c);
      obRect(c[0] - r, c[1] - r, 2 * r, 2 * r);
      obSeg(P(ca, va), c);
      obSeg(P(cc, vc2), c);
      // Rim with a flat edge on the cathode side, as on the real part.
      const ang = Math.atan2(P(cc, vc2)[1] - c[1], P(cc, vc2)[0] - c[0]);
      const R = r + 1.8;
      s += `<path d="M${pt(onCircle(c, R, ang + 0.75))} A${f(R)},${f(R)} 0 1 1 ${pt(onCircle(c, R, ang - 0.75))} Z" fill="#A32D2D"/>`;
      s += circle(c, r, "#E24B4A", "#791F1F");
      s += circle(onCircle(c, r * 0.4, -2.2), r * 0.3, "#F7C1C1", "none", 0);
      return part(depth(uc, vc) + 0.3, s, [c[0], f(c[1] - R - 2)]);
    }
    const b = P(uc, vc, 10);
    const r = 5.5;
    let s = lead(hole(ca, va), [f(b[0] - 2.5), b[1]]) + lead(hole(cc, vc2), [f(b[0] + 2.5), b[1]]);
    obRect(b[0] - 7, b[1] - 16, 14, 18);
    obSeg(P(ca, va), b);
    obSeg(P(cc, vc2), b);
    s += `<ellipse cx="${b[0]}" cy="${b[1]}" rx="${r + 1.5}" ry="${f((r + 1.5) * 0.5)}" fill="#A32D2D"/>`;
    s += `<path d="M${f(b[0] - r)},${b[1]} L${f(b[0] - r)},${f(b[1] - 9)} A${r},${r} 0 0 1 ${f(b[0] + r)},${f(b[1] - 9)} L${f(b[0] + r)},${b[1]} Z" fill="#E24B4A" stroke="#791F1F" stroke-width="1.3"/>`;
    s += `<rect x="${f(b[0] - r + 1.5)}" y="${f(b[1] - 12)}" width="2.5" height="9" rx="1" fill="#F7C1C1"/>`;
    return part(depth(uc, vc) + 0.3, s, [b[0], f(b[1] - 18)]);
  };

  const pot = (c, v) => {
    if (flat) {
      // Body sits just below the pins so the pin holes stay visible.
      const lo = P(c - 1.15, v + 0.3);
      const hi = P(c + 1.15, v + 1.3);
      let s = "";
      for (const dc of [-1, 0, 1]) {
        s += lead(hole(c + dc, v), P(c + dc, v + 0.3));
      }
      obRect(lo[0], lo[1], hi[0] - lo[0], hi[1] - lo[1]);
      s += `<rect x="${lo[0]}" y="${lo[1]}" width="${f(hi[0] - lo[0])}" height="${f(hi[1] - lo[1])}" rx="2" fill="#185FA5" stroke="#042C53" stroke-width="1.3"/>`;
      const cen = P(c, v + 0.8);
      s += circle(cen, 0.32 * S, "#F1EFE8", "#2C2C2A");
      s += line(onCircle(cen, 0.22 * S, -0.6), onCircle(cen, 0.22 * S, Math.PI - 0.6), "#5F5E5A", 1.6);
      return part(depth(c, v) + 0.4, s, [cen[0], f(hi[1] + 2)]);
    }
    let s = "";
    for (const dc of [-1, 0, 1]) {
      s += lead(hole(c + dc, v), P(c + dc * 0.8, v, 6));
    }
    const q = [P(c - 1.15, v - 0.6, 6), P(c + 1.15, v - 0.6, 6), P(c + 1.15, v + 0.6, 6), P(c - 1.15, v + 0.6, 6)];
    const up = q.map((p) => [p[0], f(p[1] - 6)]);
    s += poly([q[3], q[2], up[2], up[3]], "#0C447C", "#042C53", 1.3);
    s += poly([q[1], q[2], up[2], up[1]], "#185FA5", "#042C53", 1.3);
    s += poly(up, "#378ADD", "#042C53", 1.3);
    const cen = P(c, v, 12);
    obRect(cen[0] - 22, cen[1] - 6, 44, 22);
    s += `<ellipse cx="${cen[0]}" cy="${cen[1]}" rx="6" ry="3.4" fill="#F1EFE8" stroke="#2C2C2A" stroke-width="1.3"/>`;
    s += line([f(cen[0] - 4), f(cen[1] - 1.5)], [f(cen[0] + 4), f(cen[1] + 1.5)], "#5F5E5A", 1.4);
    return part(depth(c, v) + 0.4, s, [cen[0], f(cen[1] - 6)]);
  };

  const transistor = (c, v, { can = false } = {}) => {
    if (flat) {
      let s = "";
      if (can) {
        const cen = P(c, v - 0.35);
        const r = 0.62 * S;
        for (const dc of [-1, 0, 1]) {
          s += lead(hole(c + dc, v), onCircle(cen, r * 0.35, Math.PI / 2 - dc * 0.9));
        }
        obRect(cen[0] - r - 6, cen[1] - r, 2 * r + 6, 2 * r);
        s += `<path d="M${pt(onCircle(cen, r - 1, 2.15))} l-6,3 l2,4 l6,-3 Z" fill="#B4B2A9" stroke="#2C2C2A" stroke-width="1.3"/>`;
        s += circle(cen, r, "#B4B2A9", "#2C2C2A");
        s += circle(cen, r * 0.72, "#D3D1C7", "#888780", 0.8);
        return part(depth(c, v) + 0.4, s, [cen[0], f(cen[1] - r - 2)]);
      }
      // TO-92 seen from above: flat face toward the pins' row, rounded back away from it.
      const l = P(c - 1.1, v + 0.2);
      const r = P(c + 1.1, v + 0.2);
      const apex = P(c, v - 0.6);
      for (const dc of [-1, 0, 1]) {
        hole(c + dc, v);
      }
      obRect(l[0], apex[1], r[0] - l[0], l[1] - apex[1]);
      s += `<path d="M${pt(l)} L${pt(r)} A${f(r[0] - apex[0])},${f(l[1] - apex[1])} 0 0 0 ${pt(l)} Z" fill="#2C2C2A" stroke="#1A1A18" stroke-width="1.3"/>`;
      s += line([f(l[0] + 3), f(l[1] - 2.5)], [f(r[0] - 3), f(r[1] - 2.5)], "#5F5E5A", 1.2);
      return part(depth(c, v) + 0.4, s, [apex[0], f(apex[1] - 2)]);
    }
    let s = "";
    const canBase = P(c, v - 0.2, 9);
    for (const dc of [-1, 0, 1]) {
      // TO-92 legs meet the front bottom edge; TO-18 legs end just inside the can's base ellipse, which the body then covers.
      const end = can ? [f(canBase[0] + dc * 5), f(canBase[1] + 3)] : P(c + dc * 0.7, v, 9);
      s += lead(hole(c + dc, v), end);
    }
    {
      const lo = P(c - 1.2, v, 0);
      const hi = P(c + 1.2, v, 30);
      obRect(Math.min(lo[0], hi[0]) - 4, hi[1] - 4, Math.abs(hi[0] - lo[0]) + 8, lo[1] - hi[1] + 8);
    }
    if (can) {
      const b = canBase;
      const r = 9;
      const ry = 5;
      const top = b[1] - 16;
      s += `<path d="M${f(b[0] - r)},${top} L${f(b[0] - r)},${b[1]} A${r},${ry} 0 0 0 ${f(b[0] + r)},${b[1]} L${f(b[0] + r)},${top} Z" fill="#B4B2A9" stroke="#2C2C2A" stroke-width="1.3"/>`;
      s += `<rect x="${f(b[0] - r + 2)}" y="${top}" width="4" height="16" fill="#D3D1C7"/>`;
      s += `<ellipse cx="${b[0]}" cy="${top}" rx="${r}" ry="${ry}" fill="#D3D1C7" stroke="#2C2C2A" stroke-width="1.3"/>`;
      s += `<path d="M${f(b[0] - r - 1)},${f(b[1] - 3)} l-5,2 l1,3 l5,-1" fill="#B4B2A9" stroke="#2C2C2A" stroke-width="1.3"/>`;
    } else {
      const q = [P(c - 1.05, v, 9), P(c + 1.05, v, 9), P(c + 1.05, v, 26), P(c - 1.05, v, 26)];
      const back = [P(c + 1.05, v - 0.55, 26), P(c - 1.05, v - 0.55, 26)];
      s += poly([q[3], q[2], back[0], back[1]], "#5F5E5A", "#1A1A18", 1.3);
      s += poly(q, "#2C2C2A", "#1A1A18", 1.3);
      s += poly([q[1], P(c + 1.05, v - 0.55, 9), back[0], q[2]], "#444441", "#1A1A18", 1.3);
    }
    return part(depth(c, v) + 0.4, s, P(c, v - 0.2, can ? 31 : 30));
  };

  const jumper = (c1, v1, c2, v2, color, lift = 12) => {
    const m = P((c1 + c2) / 2, (v1 + v2) / 2, lift);
    const a = hole(c1, v1);
    const b = hole(c2, v2);
    quad(a, m, b);
    const s = `<path d="M${pt(a)} Q${pt(m)} ${pt(b)}" fill="none" stroke="#2C2C2A" stroke-width="4.2" stroke-linecap="round"/><path d="M${pt(a)} Q${pt(m)} ${pt(b)}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round"/>`;
    return part(depth((c1 + c2) / 2, (v1 + v2) / 2) - 0.2, s, P((c1 + c2) / 2, (v1 + v2) / 2, lift / 2));
  };

  const box = (x, y, w, h, title, lines = []) => {
    obRect(x - 4, y - 4, w + 8, h + 8);
    let s = `<g class="c-gray"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" stroke-width="0.5"/>`;
    s += `<text class="th" x="${x + w / 2}" y="${y + 18}" text-anchor="middle" dominant-baseline="central">${title}</text>`;
    lines.forEach((t, i) => {
      s += `<text class="ts" x="${x + w / 2}" y="${y + 36 + i * 17}" text-anchor="middle" dominant-baseline="central">${t}</text>`;
    });
    s += `</g>`;
    overlay.push(s);
  };

  const tip = (p, color) => overlay.push(`<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="${color}"/>`);
  const gndPath = (d) => {
    overlay.push(`<path d="${d}" fill="none" stroke="#F6F4EE" stroke-width="5" stroke-linecap="round"/>`);
    overlay.push(`<path d="${d}" fill="none" stroke="#2C2C2A" stroke-width="2.4" stroke-dasharray="7 4" stroke-linecap="round"/>`);
  };
  const clip = (p) => overlay.push(`<rect x="${f(p[0] - 4)}" y="${f(p[1] - 9)}" width="8" height="9" rx="1.5" fill="#2C2C2A"/><circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="#2C2C2A"/>`);

  const wire = (from, c, v, color, { dashed = false, casing = false } = {}) => {
    const to = hole(c, v);
    const mx = f((from[0] + to[0]) / 2);
    const d = `M${pt(from)} C${mx},${from[1]} ${mx},${to[1]} ${pt(to)}`;
    cubic(from, [mx, from[1]], [mx, to[1]], to);
    if (dashed) {
      gndPath(d);
      clip(to);
      return;
    }
    if (casing) {
      overlay.push(`<path d="${d}" fill="none" stroke="#F6F4EE" stroke-width="5"/>`);
    }
    overlay.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="2"/>`);
    tip(to, color);
  };

  const probe = (from, c, v, color, clipAt) => {
    const h = hole(c, v);
    // From above, a standing probe body would lie across the holes above its tip, so the flat view keeps it short.
    const rise = flat ? 16 : 34;
    const body = flat ? 8 : 22;
    const top = [h[0], f(h[1] - rise)];
    overlay.push(`<path d="M${pt(from)} C${from[0]},${f(top[1] - 40)} ${top[0]},${f(top[1] - 50)} ${pt(top)}" fill="none" stroke="${color}" stroke-width="1.8"/>`);
    cubic(from, [from[0], top[1] - 40], [top[0], top[1] - 50], top);
    obSeg(top, h, 6);
    overlay.push(`<rect x="${f(top[0] - 2.5)}" y="${top[1]}" width="5" height="${body}" rx="2" fill="${color}" stroke="#2C2C2A" stroke-width="0.6"/>`);
    overlay.push(line([top[0], f(top[1] + body)], h, "#2C2C2A", 3.2) + line([top[0], f(top[1] + body)], h, color, 1.8));
    tip(h, color);
    if (clipAt) {
      const g = hole(clipAt[0], clipAt[1]);
      const gs = [f(top[0] + 2.5), f(top[1] + Math.min(8, body / 2))];
      gndPath(`M${pt(gs)} Q${f((gs[0] + g[0]) / 2 + 12)},${f(Math.min(gs[1], g[1]) - 16)} ${pt(g)}`);
      quad(gs, [(gs[0] + g[0]) / 2 + 12, Math.min(gs[1], g[1]) - 16], g, 8);
      clip(g);
    }
  };

  const pills = [];
  const pill = (name, x, y, cls = "c-purple", anchorKey, tip) => pills.push([name, x, y, cls, anchorKey || name, tip]);
  const tooltip = (x, y, pw, key, linked, { type, value, bands, mark }, anchor, VH) => {
    const bandNames = bands ? bands.map(([name]) => name).join(" · ") : "";
    const markWidth = bands ? bands.length * 15 + 4 + bandNames.length * 6.6 : (mark || "").length * 6.6;
    const w = Math.round(Math.max(type.length * 7.4, value.length * 6.6, markWidth) + 22);
    const h = bands || mark ? 60 : 42;
    const gap = 6;
    // Candidate tip-box top-left corners: every 8 px slide along the rows just below and above the tag, and down the
    // columns just right and left of it, keeping at least 8 px of shared edge so the tip stays visibly attached.
    const sides = [];
    for (let l = x - pw / 2 + 8 - w; l <= x + pw / 2 - 8; l += 8) {
      sides.push([l, y + 10 + gap], [l, y - 10 - gap - h]);
    }
    for (let t = y - 10 + 8 - h; t <= y + 10 - 8; t += 8) {
      sides.push([x + pw / 2 + gap, t], [x - pw / 2 - gap - w, t]);
    }
    // Pick the spot that covers least of the part and of the leader to it. Parts have a footprint (centre-line points,
    // so it is checked with a 5 px margin for stroke width); node tags only have their anchor point, guarded by a box.
    const feet = (anchor && footprint.get(anchor)) || [];
    const score = ([l, t]) => {
      if (l < 4 || t < 4 || l + w > 676 || t + h > VH - 4) {
        return Infinity;
      }
      // Clamping into bounds can slide a side tip back over its own tag.
      if (l < x + pw / 2 && l + w > x - pw / 2 && t < y + 10 && t + h > y - 10) {
        return Infinity;
      }
      // Tie-break toward a tip centred on its tag.
      const off = Math.hypot(l + w / 2 - x, t + h / 2 - y) * 0.1;
      if (!anchor) {
        return off;
      }
      const r = [l, t, l + w, t + h];
      let sc = off;
      if (feet.length) {
        for (const p of [...feet, anchor]) {
          if (p[0] > r[0] - 5 && p[0] < r[2] + 5 && p[1] > r[1] - 5 && p[1] < r[3] + 5) {
            sc += 60;
          }
        }
      } else {
        const ix = Math.max(0, Math.min(r[2], anchor[0] + 30) - Math.max(r[0], anchor[0] - 30));
        const iy = Math.max(0, Math.min(r[3], anchor[1] + 26) - Math.max(r[1], anchor[1] - 26));
        sc += ix * iy;
      }
      for (let i = 1; i < 12; i++) {
        const px = x + (anchor[0] - x) * i / 12;
        const py = y + (anchor[1] - y) * i / 12;
        if (px > r[0] && px < r[2] && py > r[1] && py < r[3]) {
          sc += 200;
        }
      }
      return sc;
    };
    const [left, top] = sides.reduce((best, s) => (score(s) < score(best) ? s : best)).map(f);
    // Invisible strip spanning the gap between tag and tip (or their overlap on an axis they share), so the tip stays
    // hovered while the pointer crosses over. On a diagonal it is the small rectangle between the two nearest corners.
    const span = (a0, a1, b0, b1) => (a1 < b0 ? [a1, b0] : b1 < a0 ? [b1, a0] : [Math.max(a0, b0), Math.min(a1, b1)]);
    const [bx0, bx1] = span(x - pw / 2, x + pw / 2, left, left + w);
    const [by0, by1] = span(y - 10, y + 10, top, top + h);
    const bridge = [f(bx0), f(by0), f(Math.max(bx1 - bx0, 1)), f(Math.max(by1 - by0, 1))];
    const tx = f(left + 11);
    let marks = "";
    if (bands) {
      bands.forEach(([, hex], i) => {
        marks += `<rect class="tip-swatch" x="${f(tx + i * 15)}" y="${f(top + 42)}" width="12" height="10" rx="2" fill="${hex}"/>`;
      });
      marks += `<text class="tip-mark" x="${f(tx + bands.length * 15 + 4)}" y="${f(top + 47)}" dominant-baseline="central">${bandNames}</text>`;
    } else if (mark) {
      marks = `<text class="tip-mark" x="${tx}" y="${f(top + 47)}" dominant-baseline="central">${mark}</text>`;
    }
    return `<g class="tip${linked ? " linked" : ""}" data-for="${key}" visibility="hidden" aria-hidden="true">`
      + `<rect x="${bridge[0]}" y="${bridge[1]}" width="${bridge[2]}" height="${bridge[3]}" fill="transparent"/>`
      + `<rect class="tip-box" x="${left}" y="${top}" width="${w}" height="${h}" rx="6"/>`
      + `<text class="tip-type" x="${tx}" y="${f(top + 14)}" dominant-baseline="central">${type}</text>`
      + `<text class="tip-value" x="${tx}" y="${f(top + 30)}" dominant-baseline="central">${value}</text>${marks}</g>`;
  };
  const placeAll = (VH) => {
    for (let c = 1; c <= cols; c++) {
      ob(P(c, -0.85));
      ob(P(c, 19.15).map((n, i) => (i ? n + T : n)));
    }
    for (const v of [1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17]) {
      ob(P(0.25, v));
      ob(P(W - 0.25, v));
    }
    for (const [c, v] of used.values()) {
      ob(P(c, v));
    }
    const placedRects = [];
    const segHitsRect = (a, b, r) => {
      for (let i = 1; i < 12; i++) {
        const x = a[0] + (b[0] - a[0]) * i / 12;
        const y = a[1] + (b[1] - a[1]) * i / 12;
        if (x > r[0] && x < r[2] && y > r[1] && y < r[3]) {
          return true;
        }
      }
      return false;
    };
    for (const p of pills) {
      if (p[1] !== null) {
        const w = p[0].length * 8 + 14;
        placedRects.push([p[1] - w / 2 - 3, p[2] - 13, p[1] + w / 2 + 3, p[2] + 13]);
      }
    }
    for (const p of pills) {
      if (p[1] !== null) {
        continue;
      }
      const a = anchors[p[4]];
      const w = p[0].length * 8 + 14;
      let best = null;
      for (const rad of [24, 32, 42, 54, 68, 84, 102, 124]) {
        for (let k = 0; k < 24; k++) {
          const ang = (k / 24) * Math.PI * 2;
          const x = a[0] + Math.cos(ang) * rad * 1.3;
          const y = a[1] + Math.sin(ang) * rad;
          const r = [x - w / 2 - 3, y - 13, x + w / 2 + 3, y + 13];
          let sc = rad * 0.6;
          if (r[0] < 4 || r[2] > 676 || r[1] < 4 || r[3] > VH - 4) {
            sc += 10000;
          }
          for (const o of obs) {
            if (o[0] > r[0] && o[0] < r[2] && o[1] > r[1] && o[1] < r[3]) {
              sc += 18;
            }
          }
          for (const q of placedRects) {
            if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) {
              sc += 5000;
            }
            if (segHitsRect(a, [x, y], q)) {
              sc += 300;
            }
          }
          if (!best || sc < best[0]) {
            best = [sc, x, y, r];
          }
        }
      }
      p[1] = f(best[1]);
      p[2] = f(best[2]);
      placedRects.push(best[3]);
      obSeg(a, [best[1], best[2]], 10);
    }
  };

  const render = (VH, title, desc, id) => {
    const out = [];
    const add = (s) => out.push(s);
    if (!flat) {
      add(poly([P(0, 18), P(W, 18), [P(W, 18)[0], P(W, 18)[1] + T], [P(0, 18)[0], P(0, 18)[1] + T]], "#D3D1C7", "#B4B2A9"));
      add(poly([P(W, 0), P(W, 18), [P(W, 18)[0], P(W, 18)[1] + T], [P(W, 0)[0], P(W, 0)[1] + T]], "#C4C2B8", "#B4B2A9"));
    }
    add(poly([P(0, 0), P(W, 0), P(W, 18), P(0, 18)], "#F6F4EE", "#B4B2A9"));
    add(poly([P(0.4, 8.75), P(W - 0.4, 8.75), P(W - 0.4, 9.25), P(0.4, 9.25)], "#DEDBD2"));
    for (const [c, v1, v2, fill] of tints) {
      add(poly([P(c - 0.42, v1 - 0.45), P(c + 0.42, v1 - 0.45), P(c + 0.42, v2 + 0.45), P(c - 0.42, v2 + 0.45)], fill));
    }
    add(line(P(0.6, 0.35), P(W - 0.6, 0.35), "#E24B4A", 1));
    add(line(P(0.6, 2.65), P(W - 0.6, 2.65), "#378ADD", 1));
    add(line(P(0.6, 15.35), P(W - 0.6, 15.35), "#E24B4A", 1));
    add(line(P(0.6, 17.65), P(W - 0.6, 17.65), "#378ADD", 1));
    for (const v of [1, 2, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 17]) {
      for (let c = 1; c <= cols; c++) {
        if ((v === 1 || v === 2 || v === 16 || v === 17) && c % 6 === 0) {
          continue;
        }
        const p = P(c, v);
        add(flat
          ? `<rect x="${f(p[0] - 1.8)}" y="${f(p[1] - 1.8)}" width="3.6" height="3.6" rx="0.6" fill="#888780"/>`
          : `<ellipse cx="${p[0]}" cy="${p[1]}" rx="2.4" ry="1.4" fill="#888780"/>`);
      }
    }
    const lbl = (p, t, size, fill, weight = 500) => {
      const a = `x="${p[0]}" y="${p[1]}" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="${weight}"`;
      add(`<text ${a} fill="#F6F4EE" stroke="#F6F4EE" stroke-width="3" stroke-linejoin="round">${t}</text><text ${a} fill="${fill}">${t}</text>`);
    };
    for (let c = 1; c <= cols; c++) {
      const t = P(c, -0.85);
      const b = P(c, 19.15);
      add(`<text class="bbl" x="${t[0]}" y="${t[1]}" text-anchor="middle" dominant-baseline="central">${c}</text>`);
      add(`<text class="bbl" x="${b[0]}" y="${f(b[1] + T)}" text-anchor="middle" dominant-baseline="central">${c}</text>`);
    }
    for (const [r, v] of [["a", 4], ["b", 5], ["c", 6], ["d", 7], ["e", 8], ["f", 10], ["g", 11], ["h", 12], ["i", 13], ["j", 14]]) {
      lbl(P(0.25, v), r, 12, "#2C2C2A");
      lbl(P(W - 0.25, v), r, 12, "#2C2C2A");
    }
    for (const [t, v, col] of [["+", 1, "#A32D2D"], ["−", 2, "#185FA5"], ["+", 16, "#A32D2D"], ["−", 17, "#185FA5"]]) {
      lbl(P(0.25, v), t, 15, col, 600);
      lbl(P(W - 0.25, v), t, 15, col, 600);
    }
    const rings = [...used.values()].map(([c, v]) => {
      const p = P(c, v);
      return flat
        ? `<circle cx="${p[0]}" cy="${p[1]}" r="4.6" fill="#FFFFFF" stroke="#D85A30" stroke-width="1.6"/><rect x="${f(p[0] - 1.6)}" y="${f(p[1] - 1.6)}" width="3.2" height="3.2" rx="0.5" fill="#2C2C2A"/>`
        : `<ellipse cx="${p[0]}" cy="${p[1]}" rx="5.2" ry="3.2" fill="#FFFFFF" stroke="#D85A30" stroke-width="1.8"/><ellipse cx="${p[0]}" cy="${p[1]}" rx="2.2" ry="1.3" fill="#2C2C2A"/>`;
    });
    // From above, part bodies cover their own pins, so the in-use rings go on top of the parts instead of under them.
    if (!flat) {
      out.push(...rings);
    }
    for (const [key, a] of Object.entries(anchors)) {
      const item = partOf.get(a);
      if (item) {
        item.key = key;
      }
    }
    draws.sort((a, b) => a.d - b.d);
    for (const d of draws) {
      add(d.key ? `<g class="part" data-part="${d.key}">${d.s}</g>` : `<g class="part">${d.s}</g>`);
    }
    if (flat) {
      out.push(...rings);
    }
    add(`<g class="overlay">${overlay.join("")}</g>`);
    placeAll(VH);
    const tips = [];
    const rules = [];
    for (const [name, x, y, cls, key, tip] of pills) {
      const a = anchors[key];
      const linked = partOf.has(a);
      const w = name.length * 8 + 14;
      const spoken = tip && [tip.type, tip.value, tip.bands ? `bands ${tip.bands.map(([n]) => n).join(", ")}` : tip.mark].filter(Boolean).join(", ");
      const attrs = tip ? ` data-for="${key}" tabindex="0" role="img" aria-label="${attr(`${name}: ${spoken}`)}"` : "";
      let s = `<g class="pill ${cls}${linked ? " linked" : ""}"${attrs}>`;
      if (a) {
        const color = LEADER[cls] || "#534AB7";
        s += `<line class="leader" x1="${a[0]}" y1="${a[1]}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="2" stroke-linecap="round"/><circle cx="${a[0]}" cy="${a[1]}" r="3" fill="${color}"/>`;
      }
      s += `<rect x="${f(x - w / 2)}" y="${f(y - 10)}" width="${w}" height="20" rx="4" stroke-width="0.5"/><text class="th" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${name}</text></g>`;
      add(s);
      if (tip) {
        tips.push(tooltip(x, y, w, key, linked, tip, a, VH));
        // CSS can't match one attribute value against another, so each tag gets its own rules.
        const on = `#${id}:has(.pill[data-for="${key}"]:is(:hover, :focus-visible), .tip[data-for="${key}"]:hover)`;
        rules.push(`${on} .tip[data-for="${key}"] { visibility: visible; }`);
        if (linked) {
          rules.push(`${on} .part[data-part="${key}"] { opacity: 1; filter: var(--part-glow); }`);
        }
      }
    }
    out.push(...tips);
    const style = rules.length ? `<style>${rules.join("\n")}</style>` : "";
    return `<svg id="${id}" width="100%" viewBox="0 0 680 ${VH}" role="group" xmlns="http://www.w3.org/2000/svg"><title>${title}</title><desc>${desc}</desc>${style}${out.join("")}</svg>`;
  };

  return {
    view, height, P, hole, tint,
    resistor: def(resistor), inductor: def(inductor), ecap: def(ecap), film: def(film), led: def(led), pot: def(pot), transistor: def(transistor), jumper: def(jumper),
    box, wire, probe, pill, anchors, render, ROW };
}
