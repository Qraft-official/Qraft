/**
 * Exam-style SVG diagrams for 2026-10 PULSE (no answers/solution marks).
 * Run: npx tsx scripts/generate-sprint-october-diagrams.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRootFromThisFile } from "./sprint-october-2026";

const STROKE = "#222222";
const MUTED = "#555555";
const GRID = "#444444";
const HIDDEN = "#666666";
const FONT = "ui-sans-serif, system-ui, 'Noto Sans JP', sans-serif";
const YEL = "#F6E59B";
const CYAN = "#C9E6F5";
const ORG = "#F3C7A4";
const GRN = "#D3E8B4";
const RIVER = "#D7EEF7";

type Pt = { x: number; y: number };

function svg(w: number, h: number, body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${body}
</svg>
`;
}

function n(v: number) {
  return Math.round(v * 10) / 10;
}

function line(a: Pt, b: Pt, o: { dash?: boolean; w?: number; color?: string } = {}) {
  const dash = o.dash ? ` stroke-dasharray="7 6"` : "";
  return `<line x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" stroke="${o.color ?? STROKE}" stroke-width="${o.w ?? 2.2}" stroke-linecap="round"${dash}/>`;
}

function poly(pts: Pt[], o: { fill?: string; stroke?: string; w?: number; dash?: boolean } = {}) {
  const d = pts.map((p) => `${n(p.x)},${n(p.y)}`).join(" ");
  const dash = o.dash ? ` stroke-dasharray="7 6"` : "";
  return `<polygon points="${d}" fill="${o.fill ?? "none"}" stroke="${o.stroke ?? STROKE}" stroke-width="${o.w ?? 2.2}" stroke-linejoin="round"${dash}/>`;
}

function polyline(pts: Pt[], o: { w?: number; color?: string; dash?: boolean } = {}) {
  const d = pts.map((p) => `${n(p.x)},${n(p.y)}`).join(" ");
  const dash = o.dash ? ` stroke-dasharray="7 6"` : "";
  return `<polyline points="${d}" fill="none" stroke="${o.color ?? STROKE}" stroke-width="${o.w ?? 2.2}" stroke-linejoin="round" stroke-linecap="round"${dash}/>`;
}

function dot(p: Pt, r = 3.6) {
  return `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${r}" fill="${STROKE}"/>`;
}

function label(text: string, p: Pt, o: { size?: number; anchor?: string; fill?: string } = {}) {
  const anchor = o.anchor ?? "middle";
  return `<text x="${n(p.x)}" y="${n(p.y)}" fill="${o.fill ?? STROKE}" font-size="${o.size ?? 18}" font-family="${FONT}" font-weight="700" text-anchor="${anchor}">${esc(text)}</text>`;
}

function note(text: string, p: Pt, o: { size?: number; anchor?: string } = {}) {
  return `<text x="${n(p.x)}" y="${n(p.y)}" fill="${MUTED}" font-size="${o.size ?? 15}" font-family="${FONT}" font-weight="600" text-anchor="${o.anchor ?? "middle"}">${esc(text)}</text>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}
function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}
function scale(a: Pt, k: number): Pt {
  return { x: a.x * k, y: a.y * k };
}
function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function intersect(a: Pt, b: Pt, c: Pt, d: Pt): Pt {
  const r = sub(b, a);
  const s = sub(d, c);
  const den = r.x * s.y - r.y * s.x;
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
  return lerp(a, b, t);
}

function ticks(a: Pt, b: Pt, n = 2) {
  const v = sub(b, a);
  const len = Math.hypot(v.x, v.y) || 1;
  const nx = (-v.y / len) * 7;
  const ny = (v.x / len) * 7;
  const p = mid(a, b);
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * 4;
    parts.push(
      `<line x1="${p.x - nx + (v.x / len) * o}" y1="${p.y - ny + (v.y / len) * o}" x2="${p.x + nx + (v.x / len) * o}" y2="${p.y + ny + (v.y / len) * o}" stroke="${STROKE}" stroke-width="1.6"/>`,
    );
  }
  return parts.join("");
}

function oct01() {
  const A = { x: 80, y: 255 };
  const B = { x: 310, y: 255 };
  const D = { x: 130, y: 80 };
  const C = add(B, sub(D, A));
  const E = lerp(A, B, 2 / 3);
  const F = mid(B, C);
  const P = intersect(A, F, D, E);
  return svg(
    480,
    360,
    [
      poly([A, P, D], { fill: YEL, stroke: "none" }),
      poly([A, B, C, D], { fill: "none", w: 2.4 }),
      line(D, E),
      line(A, F),
      [A, B, C, D, E, F, P].map((p) => dot(p)).join(""),
      label("A", { x: A.x - 16, y: A.y + 22 }),
      label("B", { x: B.x + 16, y: B.y + 22 }),
      label("C", { x: C.x + 16, y: C.y - 6 }),
      label("D", { x: D.x - 16, y: D.y - 6 }),
      label("E", { x: E.x, y: E.y + 24 }),
      label("F", { x: F.x + 16, y: F.y + 4 }),
      label("P", { x: P.x - 16, y: P.y - 8 }),
      note("AE:EB = 2:1", { x: mid(A, B).x, y: 300 }),
      note("Fは辺BCの中点", { x: 240, y: 322 }),
      note("平行四辺形ABCDの面積 = 84cm²", { x: 240, y: 338 }),
      note("（図は縮尺どおりではない）", { x: 240, y: 354 }, { size: 13 }),
    ].join("\n"),
  );
}

function oct05() {
  const cx = 220,
    cy = 210,
    r = 145;
  const verts: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    verts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  const mids = verts.map((p, i) => mid(p, verts[(i + 1) % 6]));
  const names = ["A", "B", "C", "D", "E", "F"];
  const mNames = ["M1", "M2", "M3", "M4", "M5", "M6"];
  const offsets: Pt[] = [
    { x: 0, y: -18 },
    { x: 22, y: -8 },
    { x: 22, y: 18 },
    { x: 0, y: 26 },
    { x: -24, y: 18 },
    { x: -24, y: -8 },
  ];
  const mOff: Pt[] = [
    { x: 16, y: -14 },
    { x: 22, y: 6 },
    { x: 14, y: 20 },
    { x: -16, y: 18 },
    { x: -26, y: 4 },
    { x: -16, y: -16 },
  ];
  return svg(
    440,
    440,
    [
      poly(mids, { fill: CYAN, w: 2 }),
      poly(verts, { fill: "none", w: 2.4 }),
      verts.map((p, i) => label(names[i], add(p, offsets[i]))).join(""),
      mids.map((p, i) => label(mNames[i], add(p, mOff[i]), { size: 14 })).join(""),
      note("正六角形ABCDEFの面積 = 72cm²", { x: 220, y: 418 }),
      note("（図は縮尺どおりではない）", { x: 220, y: 434 }, { size: 13 }),
    ].join("\n"),
  );
}

function projectCube(p: { x: number; y: number; z: number }, origin: Pt, s: number): Pt {
  return {
    x: origin.x + p.x * s + p.z * s * 0.52,
    y: origin.y - p.y * s - p.z * s * 0.28,
  };
}

function oct09() {
  const o = { x: 120, y: 310 };
  const s = 168;
  const A = projectCube({ x: 0, y: 0, z: 0 }, o, s);
  const B = projectCube({ x: 1, y: 0, z: 0 }, o, s);
  const C = projectCube({ x: 1, y: 0, z: 1 }, o, s);
  const D = projectCube({ x: 0, y: 0, z: 1 }, o, s);
  const E = projectCube({ x: 0, y: 1, z: 0 }, o, s);
  const F = projectCube({ x: 1, y: 1, z: 0 }, o, s);
  const G = projectCube({ x: 1, y: 1, z: 1 }, o, s);
  const H = projectCube({ x: 0, y: 1, z: 1 }, o, s);
  const M = lerp(A, B, 4 / 12);
  const N = lerp(B, C, 4 / 12);
  return svg(
    520,
    400,
    [
      poly([B, M, F, N], { fill: ORG, stroke: "none" }),
      line(D, C, { dash: true, color: HIDDEN, w: 1.8 }),
      line(D, H, { dash: true, color: HIDDEN, w: 1.8 }),
      line(C, G, { dash: true, color: HIDDEN, w: 1.8 }),
      line(A, B),
      line(B, C),
      line(A, D),
      line(A, E),
      line(B, F),
      line(E, F),
      line(F, G),
      line(E, H),
      line(H, G),
      poly([M, N, F], { fill: "none", w: 2.6, stroke: "#8A4B12" }),
      [A, B, C, D, E, F, G, H, M, N].map((p) => dot(p, 3.2)).join(""),
      label("A", { x: A.x - 16, y: A.y + 20 }),
      label("B", { x: B.x + 6, y: B.y + 24 }),
      label("C", { x: C.x + 16, y: C.y + 8 }),
      label("D", { x: D.x - 16, y: D.y + 6 }),
      label("E", { x: E.x - 16, y: E.y - 6 }),
      label("F", { x: F.x + 16, y: F.y - 6 }),
      label("G", { x: G.x + 4, y: G.y - 10 }),
      label("H", { x: H.x - 16, y: H.y - 6 }),
      label("M", { x: M.x, y: M.y + 24 }),
      label("N", { x: N.x + 22, y: N.y - 8 }),
      note("AM = 4cm", { x: mid(A, M).x, y: A.y + 44 }, { size: 14 }),
      note("BN = 4cm", { x: N.x + 56, y: N.y + 6 }, { size: 14 }),
      note("立方体の1辺 = 12cm", { x: 260, y: 372 }),
      note("（図は見取り図であり、縮尺どおりではない）", { x: 260, y: 390 }, { size: 13 }),
    ].join("\n"),
  );
}

function oct10() {
  const ox = 70,
    oy = 300,
    cell = 52;
  const cols = 6,
    rows = 4;
  const lines: string[] = [];
  for (let i = 0; i <= cols; i++) {
    lines.push(line({ x: ox + i * cell, y: oy }, { x: ox + i * cell, y: oy - rows * cell }, { w: 1.5, color: GRID }));
  }
  for (let j = 0; j <= rows; j++) {
    lines.push(line({ x: ox, y: oy - j * cell }, { x: ox + cols * cell, y: oy - j * cell }, { w: 1.5, color: GRID }));
  }
  const A = { x: ox, y: oy };
  const B = { x: ox + cols * cell, y: oy - rows * cell };
  const P = { x: ox + 3 * cell, y: oy - 2 * cell };
  return svg(
    480,
    380,
    [
      lines.join(""),
      `<circle cx="${A.x}" cy="${A.y}" r="6" fill="${STROKE}"/>`,
      `<circle cx="${B.x}" cy="${B.y}" r="6" fill="${STROKE}"/>`,
      `<circle cx="${P.x}" cy="${P.y}" r="9" fill="none" stroke="#C0392B" stroke-width="2.4"/>`,
      `<line x1="${P.x - 7}" y1="${P.y - 7}" x2="${P.x + 7}" y2="${P.y + 7}" stroke="#C0392B" stroke-width="2.4"/>`,
      `<line x1="${P.x + 7}" y1="${P.y - 7}" x2="${P.x - 7}" y2="${P.y + 7}" stroke="#C0392B" stroke-width="2.4"/>`,
      label("A", { x: A.x - 18, y: A.y + 22 }),
      label("B", { x: B.x - 14, y: B.y - 10 }),
      label("P", { x: P.x + 18, y: P.y - 12 }, { fill: "#C0392B" }),
      note("右へ6区画、上へ4区画", { x: 240, y: 348 }),
      note("PはAから右へ3区画・上へ2区画（通れない）", { x: 240, y: 368 }, { size: 14 }),
    ].join("\n"),
  );
}

function oct11() {
  // Not to scale: NS compressed vs EW so 24m path is not measurable.
  const west = 210,
    east = 270; // river 4m labeled, drawn narrower than 9m/3m
  const top = 40,
    bot = 300;
  const A = { x: east + 48, y: 250 };
  const B = { x: west - 96, y: 70 };
  const Ae = { x: east, y: A.y };
  const Bw = { x: west, y: B.y };
  return svg(
    520,
    360,
    [
      `<rect x="${west}" y="${top}" width="${east - west}" height="${bot - top}" fill="${RIVER}" stroke="none"/>`,
      line({ x: west, y: top }, { x: west, y: bot }, { w: 2.4 }),
      line({ x: east, y: top }, { x: east, y: bot }, { w: 2.4 }),
      line(A, Ae, { dash: true, w: 1.8 }),
      line(B, Bw, { dash: true, w: 1.8 }),
      line({ x: west - 18, y: A.y }, { x: west - 18, y: B.y }, { dash: true, w: 1.6, color: MUTED }),
      dot(A),
      dot(B),
      label("A", { x: A.x + 16, y: A.y + 6 }),
      label("B", { x: B.x - 16, y: B.y - 6 }),
      note("西", { x: 70, y: 28 }, { size: 13 }),
      note("東", { x: 450, y: 28 }, { size: 13 }),
      note("北", { x: 28, y: 56 }, { size: 13, anchor: "start" }),
      note("3m", { x: mid(A, Ae).x, y: A.y + 20 }, { size: 14 }),
      note("9m", { x: mid(B, Bw).x, y: B.y - 10 }, { size: 14 }),
      note("川幅 4m", { x: (west + east) / 2, y: 28 }, { size: 14 }),
      note("16m", { x: west - 40, y: (A.y + B.y) / 2 }, { size: 14, anchor: "end" }),
      note("（図は縮尺どおりではない。橋はかかっていない）", { x: 260, y: 338 }, { size: 13 }),
    ].join("\n"),
  );
}

function oct15() {
  const A = { x: 90, y: 310 };
  const B = { x: 330, y: 310 };
  const C = { x: 330, y: 70 };
  const D = { x: 90, y: 70 };
  const P = lerp(A, B, 0.38); // not the midpoint (answer)
  return svg(
    440,
    400,
    [
      poly([A, B, C, D], { fill: "none", w: 2.4 }),
      line(C, P),
      line(D, P),
      [A, B, C, D, P].map((p) => dot(p)).join(""),
      label("A", { x: A.x - 16, y: A.y + 22 }),
      label("B", { x: B.x + 16, y: B.y + 22 }),
      label("C", { x: C.x + 16, y: C.y - 6 }),
      label("D", { x: D.x - 16, y: D.y - 6 }),
      label("P", { x: P.x, y: P.y + 24 }),
      note("1辺 10cm", { x: 210, y: 358 }),
      note("Pは辺AB上の点", { x: 210, y: 376 }, { size: 14 }),
      note("（図は縮尺どおりではない）", { x: 210, y: 392 }, { size: 13 }),
    ].join("\n"),
  );
}

function oct17() {
  // A top-left as specified. Crease = perp. bisector of AM, clipped to square.
  const A = { x: 80, y: 70 };
  const B = { x: 340, y: 70 };
  const C = { x: 340, y: 330 };
  const D = { x: 80, y: 330 };
  const M = mid(B, C);
  const midAM = mid(A, M);
  const dir = sub(M, A);
  const n = { x: -dir.y, y: dir.x };
  const P = intersect(midAM, add(midAM, n), A, B);
  const Q = intersect(midAM, add(midAM, n), D, C);
  return svg(
    440,
    420,
    [
      poly([A, B, C, D], { fill: "none", w: 2.4 }),
      line(A, M, { dash: true, w: 1.7, color: MUTED }),
      line(P, Q, { w: 2.8 }),
      [A, B, C, D, M, P, Q].map((p) => dot(p, 3.3)).join(""),
      label("A", { x: A.x - 16, y: A.y - 6 }),
      label("B", { x: B.x + 16, y: B.y - 6 }),
      label("C", { x: C.x + 16, y: C.y + 20 }),
      label("D", { x: D.x - 16, y: D.y + 20 }),
      label("M", { x: M.x + 20, y: M.y + 6 }),
      label("P", { x: P.x, y: P.y - 10 }),
      label("Q", { x: Q.x - 14, y: Q.y + 22 }),
      note("1辺 12cm　Mは辺BCの中点", { x: 210, y: 372 }),
      note("折り目は線分PQ", { x: 210, y: 390 }, { size: 14 }),
      note("（図は縮尺どおりではない）", { x: 210, y: 406 }, { size: 13 }),
    ].join("\n"),
  );
}

function oct20() {
  const B = { x: 70, y: 280 };
  const C = { x: 410, y: 280 };
  const A = { x: 130, y: 90 };
  const D = { x: 310, y: 90 }; // AD shorter than BC, not isosceles
  const P = intersect(A, C, B, D);
  return svg(
    500,
    380,
    [
      poly([A, P, D], { fill: GRN, stroke: "none" }),
      poly([A, B, C, D], { fill: "none", w: 2.4 }),
      line(A, C),
      line(B, D),
      ticks(A, D, 2),
      ticks(B, C, 2),
      [A, B, C, D, P].map((p) => dot(p)).join(""),
      label("A", { x: A.x - 16, y: A.y - 6 }),
      label("D", { x: D.x + 16, y: D.y - 6 }),
      label("B", { x: B.x - 16, y: B.y + 22 }),
      label("C", { x: C.x + 8, y: C.y + 22 }),
      label("P", { x: P.x + 14, y: P.y - 6 }),
      note("AD = 6cm", { x: mid(A, D).x, y: A.y - 18 }),
      note("BC = 10cm", { x: mid(B, C).x, y: B.y + 24 }),
      note("AD // BC", { x: 250, y: 338 }),
      note("（図は縮尺どおりではない）", { x: 250, y: 358 }, { size: 13 }),
    ].join("\n"),
  );
}

function oct25() {
  const o = { x: 150, y: 330 };
  const s = 190;
  const A = projectCube({ x: 0, y: 0, z: 0 }, o, s);
  const B = projectCube({ x: 1, y: 0, z: 0 }, o, s);
  const C = projectCube({ x: 1, y: 0, z: 1 }, o, s);
  const D = projectCube({ x: 0, y: 0, z: 1 }, o, s);
  const O = { x: (A.x + B.x + C.x + D.x) / 4, y: 48 };
  const t = 1 / 3; // OP:PA = 1:2
  const Pa = lerp(O, A, t);
  const Pb = lerp(O, B, t);
  const Pc = lerp(O, C, t);
  const Pd = lerp(O, D, t);
  return svg(
    520,
    400,
    [
      poly([A, B, Pb, Pa], { fill: YEL, stroke: "none" }),
      poly([B, C, Pc, Pb], { fill: YEL, stroke: "none" }),
      poly([A, D, Pd, Pa], { fill: YEL, stroke: "none" }),
      line(D, C, { dash: true, color: HIDDEN, w: 1.8 }),
      line(O, C, { dash: true, color: HIDDEN, w: 1.8 }),
      line(A, B),
      line(B, C),
      line(A, D),
      line(O, A),
      line(O, B),
      line(O, D),
      poly([Pa, Pb, Pc, Pd], { fill: "none", w: 2.5, stroke: "#8A6A12" }),
      [O, A, B, C, D, Pa].map((p) => dot(p, 3.2)).join(""),
      label("O", { x: O.x, y: O.y - 10 }),
      label("A", { x: A.x - 16, y: A.y + 20 }),
      label("B", { x: B.x + 16, y: B.y + 20 }),
      label("C", { x: C.x - 4, y: C.y + 22 }),
      label("D", { x: D.x - 18, y: D.y + 8 }),
      label("P", { x: Pa.x - 18, y: Pa.y + 4 }),
      note("OP:PA = 1:2", { x: mid(O, A).x - 70, y: mid(O, A).y }, { size: 14, anchor: "end" }),
      note("底面の1辺 12cm　高さ 18cm", { x: 260, y: 372 }),
      note("（図は見取り図であり、縮尺どおりではない）", { x: 260, y: 390 }, { size: 13 }),
    ].join("\n"),
  );
}

function oct27() {
  const cx = 220,
    cy = 210,
    r = 150;
  const pts: Pt[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  const names = ["A", "B", "C", "D", "E"];
  const off: Pt[] = [
    { x: 0, y: -18 },
    { x: 22, y: 4 },
    { x: 14, y: 26 },
    { x: -16, y: 26 },
    { x: -24, y: 4 },
  ];
  return svg(
    440,
    430,
    [
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${r}" fill="none" stroke="#888" stroke-width="1.4"/>`,
      poly(pts, { fill: "none", w: 2.4 }),
      pts.map((p, i) => dot(p) + label(names[i], add(p, off[i]))).join(""),
      note("円周上の正五角形ABCDE", { x: 220, y: 400 }),
      note("（特定の三角形は強調していない）", { x: 220, y: 418 }, { size: 13 }),
    ].join("\n"),
  );
}

function oct30() {
  // Irregular star (not regular pentagram). Tips clockwise from top.
  const tips: Pt[] = [
    { x: 220, y: 42 },
    { x: 368, y: 148 },
    { x: 312, y: 330 },
    { x: 118, y: 318 },
    { x: 62, y: 132 },
  ];
  const inner: Pt[] = [
    { x: 220, y: 132 },
    { x: 268, y: 168 },
    { x: 248, y: 230 },
    { x: 178, y: 226 },
    { x: 162, y: 164 },
  ];
  const outline: Pt[] = [];
  for (let i = 0; i < 5; i++) {
    outline.push(tips[i], inner[i]);
  }
  const deg = ["40°", "35°", "50°", "25°", "?"];
  const degPos: Pt[] = [
    { x: 220, y: 28 },
    { x: 348, y: 168 },
    { x: 330, y: 352 },
    { x: 90, y: 348 },
    { x: 40, y: 118 },
  ];
  return svg(
    440,
    400,
    [
      poly(outline, { fill: "none", w: 2.3 }),
      tips.map((p) => dot(p, 3)).join(""),
      deg.map((t, i) => label(t, degPos[i], { size: 17 })).join(""),
      note("（図の角の見かけの大きさは、数値どおりではない）", { x: 220, y: 382 }, { size: 13 }),
    ].join("\n"),
  );
}

const files: Record<string, string> = {
  "sprint-2026-10-01.svg": oct01(),
  "sprint-2026-10-05.svg": oct05(),
  "sprint-2026-10-09.svg": oct09(),
  "sprint-2026-10-10.svg": oct10(),
  "sprint-2026-10-11.svg": oct11(),
  "sprint-2026-10-15.svg": oct15(),
  "sprint-2026-10-17.svg": oct17(),
  "sprint-2026-10-20.svg": oct20(),
  "sprint-2026-10-25.svg": oct25(),
  "sprint-2026-10-27.svg": oct27(),
  "sprint-2026-10-30.svg": oct30(),
};

const root = repoRootFromThisFile(import.meta.url);
const dir = join(root, "public", "sprint");
mkdirSync(dir, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(dir, name), content);
  console.log("wrote", name, content.length);
}
