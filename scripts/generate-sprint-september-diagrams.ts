/**
 * Exam-style SVG diagrams for 2026-09-16..30 PULSE (no answers/solution marks).
 * Run: npx tsx scripts/generate-sprint-september-diagrams.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRootFromThisFile } from "./sprint-october-2026";

const STROKE = "#222222";
const MUTED = "#555555";
const FONT = "ui-sans-serif, system-ui, 'Noto Sans JP', sans-serif";
const GRN = "#D3E8B4";
const CYAN = "#C9E6F5";

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

function poly(pts: Pt[], o: { fill?: string; stroke?: string; w?: number } = {}) {
  const d = pts.map((p) => `${n(p.x)},${n(p.y)}`).join(" ");
  return `<polygon points="${d}" fill="${o.fill ?? "none"}" stroke="${o.stroke ?? STROKE}" stroke-width="${o.w ?? 2.2}" stroke-linejoin="round"/>`;
}

function dot(p: Pt, r = 3.6) {
  return `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${r}" fill="${STROKE}"/>`;
}

function label(text: string, p: Pt, o: { size?: number; anchor?: string } = {}) {
  return `<text x="${n(p.x)}" y="${n(p.y)}" fill="${STROKE}" font-size="${o.size ?? 18}" font-family="${FONT}" font-weight="700" text-anchor="${o.anchor ?? "middle"}">${esc(text)}</text>`;
}

function note(text: string, p: Pt, o: { size?: number } = {}) {
  return `<text x="${n(p.x)}" y="${n(p.y)}" fill="${MUTED}" font-size="${o.size ?? 15}" font-family="${FONT}" font-weight="600" text-anchor="middle">${esc(text)}</text>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Day18: square + four inner quarter-circles, shade the leftover center. */
function sep18() {
  const s = 240;
  const A = { x: 90, y: 70 };
  const B = { x: A.x + s, y: A.y };
  const C = { x: A.x + s, y: A.y + s };
  const D = { x: A.x, y: A.y + s };
  const r = s / 2;
  const AB = { x: A.x + r, y: A.y };
  const BC = { x: B.x, y: B.y + r };
  const CD = { x: C.x - r, y: C.y };
  const DA = { x: D.x, y: D.y - r };
  const hole = [
    `M ${n(AB.x)} ${n(AB.y)}`,
    `A ${r} ${r} 0 0 1 ${n(DA.x)} ${n(DA.y)}`,
    `A ${r} ${r} 0 0 1 ${n(CD.x)} ${n(CD.y)}`,
    `A ${r} ${r} 0 0 1 ${n(BC.x)} ${n(BC.y)}`,
    `A ${r} ${r} 0 0 1 ${n(AB.x)} ${n(AB.y)}`,
    "Z",
  ].join(" ");
  const arcs = [
    `M ${n(AB.x)} ${n(AB.y)} A ${r} ${r} 0 0 1 ${n(DA.x)} ${n(DA.y)}`,
    `M ${n(AB.x)} ${n(AB.y)} A ${r} ${r} 0 0 0 ${n(BC.x)} ${n(BC.y)}`,
    `M ${n(BC.x)} ${n(BC.y)} A ${r} ${r} 0 0 0 ${n(CD.x)} ${n(CD.y)}`,
    `M ${n(CD.x)} ${n(CD.y)} A ${r} ${r} 0 0 0 ${n(DA.x)} ${n(DA.y)}`,
  ]
    .map((d) => `<path d="${d}" fill="none" stroke="${STROKE}" stroke-width="2.2"/>`)
    .join("");
  return svg(
    440,
    400,
    [
      `<path d="${hole}" fill="${GRN}" stroke="none"/>`,
      poly([A, B, C, D], { fill: "none", w: 2.4 }),
      arcs,
      [A, B, C, D].map((p) => dot(p)).join(""),
      [AB, BC, CD, DA].map((p) => dot(p, 2.4)).join(""),
      label("A", { x: A.x - 16, y: A.y - 6 }),
      label("B", { x: B.x + 16, y: B.y - 6 }),
      label("C", { x: C.x + 16, y: C.y + 20 }),
      label("D", { x: D.x - 16, y: D.y + 20 }),
      note("1辺 10cm", { x: 210, y: 340 }),
      note("各四分円の半径 5cm", { x: 210, y: 360 }),
      note("（図は縮尺どおり）", { x: 210, y: 380 }, { size: 13 }),
    ].join("\n"),
  );
}

/** Day22: square ABCD with interior P, four triangles, given areas only. */
function sep22() {
  const A = { x: 80, y: 70 };
  const B = { x: 340, y: 70 };
  const C = { x: 340, y: 330 };
  const D = { x: 80, y: 330 };
  const P = { x: 175, y: 230 };
  const pab = mid(mid(A, B), P);
  const pbc = mid(mid(B, C), P);
  const pcd = mid(mid(C, D), P);
  return svg(
    440,
    400,
    [
      poly([A, B, C, D], { fill: "none", w: 2.4 }),
      line(P, A),
      line(P, B),
      line(P, C),
      line(P, D),
      [A, B, C, D, P].map((p) => dot(p)).join(""),
      label("A", { x: A.x - 16, y: A.y - 6 }),
      label("B", { x: B.x + 16, y: B.y - 6 }),
      label("C", { x: C.x + 16, y: C.y + 20 }),
      label("D", { x: D.x - 16, y: D.y + 20 }),
      label("P", { x: P.x - 14, y: P.y + 6 }),
      note("18cm²", pab, { size: 14 }),
      note("22cm²", { x: pbc.x + 8, y: pbc.y }, { size: 14 }),
      note("32cm²", pcd, { size: 14 }),
      note("1辺 10cm", { x: 210, y: 362 }),
      note("（図は縮尺どおりではない）", { x: 210, y: 380 }, { size: 13 }),
    ].join("\n"),
  );
}

/** Day24: square and center only — no crease candidates. */
function sep24() {
  const A = { x: 90, y: 70 };
  const B = { x: 330, y: 70 };
  const C = { x: 330, y: 310 };
  const D = { x: 90, y: 310 };
  const O = mid(A, C);
  return svg(
    440,
    380,
    [
      poly([A, B, C, D], { fill: "none", w: 2.4 }),
      dot(O, 4.2),
      note("中心", { x: O.x + 36, y: O.y + 5 }, { size: 14 }),
      note("1辺 10cm", { x: 210, y: 342 }),
      note("（折り目の候補は描いていない）", { x: 210, y: 362 }, { size: 13 }),
    ].join("\n"),
  );
}

/** Day27: square, M on BC with BM=3, dashed AM, crease = perp-bisector of AM. */
function sep27() {
  const s = 240;
  const A = { x: 90, y: 70 };
  const B = { x: A.x + s, y: A.y };
  const C = { x: A.x + s, y: A.y + s };
  const D = { x: A.x, y: A.y + s };
  const M = { x: B.x, y: B.y + s / 3 };
  const P = { x: A.x + (5 / 9) * s, y: A.y };
  const midAM = mid(A, M);
  const vx = M.x - A.x;
  const vy = M.y - A.y;
  const px = -vy;
  const py = vx;
  const plen = Math.hypot(px, py) || 1;
  const dir = { x: px / plen, y: py / plen };
  function hit(tSign: number): Pt {
    const big = 800;
    const q = { x: midAM.x + dir.x * big * tSign, y: midAM.y + dir.y * big * tSign };
    const edges: [Pt, Pt][] = [
      [A, B],
      [B, C],
      [C, D],
      [D, A],
    ];
    for (const [p0, p1] of edges) {
      const r = { x: p1.x - p0.x, y: p1.y - p0.y };
      const svec = { x: q.x - midAM.x, y: q.y - midAM.y };
      const den = r.x * svec.y - r.y * svec.x;
      if (Math.abs(den) < 1e-8) continue;
      const t = ((midAM.x - p0.x) * svec.y - (midAM.y - p0.y) * svec.x) / den;
      const u = ((midAM.x - p0.x) * r.y - (midAM.y - p0.y) * r.x) / den;
      if (t >= -1e-6 && t <= 1 + 1e-6 && u >= -1e-6 && u <= 1 + 1e-6) {
        return { x: p0.x + r.x * t, y: p0.y + r.y * t };
      }
    }
    return q;
  }
  const creaseA = hit(1);
  const creaseB = hit(-1);
  return svg(
    440,
    400,
    [
      poly([A, B, C, D], { fill: "none", w: 2.4 }),
      line(A, M, { dash: true, w: 1.7, color: MUTED }),
      line(creaseA, creaseB, { w: 2.8 }),
      [A, B, C, D, M, P].map((p) => dot(p, 3.3)).join(""),
      label("A", { x: A.x - 16, y: A.y - 6 }),
      label("B", { x: B.x + 16, y: B.y - 6 }),
      label("C", { x: C.x + 16, y: C.y + 20 }),
      label("D", { x: D.x - 16, y: D.y + 20 }),
      label("M", { x: M.x + 20, y: M.y + 6 }),
      label("P", { x: P.x, y: P.y - 10 }),
      note("BM = 3cm", { x: B.x + 8, y: lerp(B, M, 0.55).y }, { size: 14 }),
      note("1辺 9cm", { x: 210, y: 348 }),
      note("（図は縮尺どおり）", { x: 210, y: 368 }, { size: 13 }),
    ].join("\n"),
  );
}

/** Day30: isometric cube with tetrahedron A,C,F,H emphasized. */
function sep30() {
  function iso(x: number, y: number, z: number): Pt {
    const ox = 210;
    const oy = 250;
    const k = 18;
    return {
      x: ox + (x - z) * k * 0.86,
      y: oy - y * k * 0.86 + (x + z) * k * 0.32,
    };
  }
  const A = iso(0, 0, 0);
  const B = iso(6, 0, 0);
  const C = iso(6, 0, 6);
  const D = iso(0, 0, 6);
  const E = iso(0, 6, 0);
  const F = iso(6, 6, 0);
  const G = iso(6, 6, 6);
  const H = iso(0, 6, 6);
  const hidden = [
    line(D, C, { dash: true, w: 1.6, color: MUTED }),
    line(C, G, { dash: true, w: 1.6, color: MUTED }),
    line(D, H, { dash: true, w: 1.6, color: MUTED }),
  ].join("");
  const cube = [
    line(A, B),
    line(B, F),
    line(F, E),
    line(E, A),
    line(A, D, { w: 2 }),
    line(B, C, { w: 2 }),
    line(E, H),
    line(F, G),
    line(H, G),
  ].join("");
  const tetFill = poly([A, F, H], { fill: CYAN, stroke: "none" });
  const tet = [
    line(A, C, { w: 3 }),
    line(A, F, { w: 3 }),
    line(A, H, { w: 3 }),
    line(C, F, { w: 3 }),
    line(C, H, { w: 3 }),
    line(F, H, { w: 3 }),
  ].join("");
  return svg(
    440,
    400,
    [
      hidden,
      tetFill,
      cube,
      tet,
      [A, B, C, D, E, F, G, H].map((p) => dot(p, 3)).join(""),
      label("A", { x: A.x - 14, y: A.y + 18 }),
      label("B", { x: B.x + 14, y: B.y + 18 }),
      label("C", { x: C.x + 16, y: C.y + 6 }),
      label("D", { x: D.x - 16, y: D.y + 6 }),
      label("E", { x: E.x - 14, y: E.y - 6 }),
      label("F", { x: F.x + 14, y: F.y - 6 }),
      label("G", { x: G.x + 16, y: G.y - 4 }),
      label("H", { x: H.x - 16, y: H.y - 4 }),
      note("1辺 6cm", { x: 220, y: 360 }),
    ].join("\n"),
  );
}

const files: Record<string, string> = {
  "sprint-2026-09-18.svg": sep18(),
  "sprint-2026-09-22.svg": sep22(),
  "sprint-2026-09-24.svg": sep24(),
  "sprint-2026-09-27.svg": sep27(),
  "sprint-2026-09-30.svg": sep30(),
};

const root = repoRootFromThisFile(import.meta.url);
const dir = join(root, "public", "sprint");
mkdirSync(dir, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  writeFileSync(join(dir, name), content);
  console.log("wrote", name, content.length);
}
