import type { CanvasPage, CanvasText } from "./types";

export function emptyCanvasPage(id = `p-${Math.random().toString(36).slice(2, 9)}`): CanvasPage {
  return { id, strokes: [], texts: [] };
}

const LINE_HEIGHT = 1.35;

function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (!text) return [""];
  if (!maxWidth || maxWidth < 8) return [text];
  const lines: string[] = [];
  let cur = "";
  for (const ch of text) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export function layoutTextLines(
  ctx: CanvasRenderingContext2D,
  t: CanvasText,
) {
  ctx.font = `600 ${t.fontSize}px ui-sans-serif, system-ui, sans-serif`;
  const maxW = t.width ?? 0;
  const out: string[] = [];
  for (const para of (t.text || " ").split("\n")) {
    out.push(...wrapLine(ctx, para, maxW));
  }
  return out;
}

export function textBounds(t: CanvasText) {
  const lines = (t.text || " ").split("\n").length;
  const w = t.width ?? Math.max(80, (t.text.length || 1) * t.fontSize * 0.62);
  const h = t.height ?? Math.max(t.fontSize * LINE_HEIGHT, lines * t.fontSize * LINE_HEIGHT);
  return { w, h };
}

export function drawPage(
  ctx: CanvasRenderingContext2D,
  page: CanvasPage,
  w: number,
  h: number,
  skipTextId?: string | null,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(168,85,247,0.12)";
  ctx.lineWidth = 1;
  for (let y = 24; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (const s of page.strokes) {
    if (s.points.length < 2) continue;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s.width;
    ctx.globalCompositeOperation = s.eraser ? "destination-out" : "source-over";
    ctx.strokeStyle = s.eraser ? "rgba(0,0,0,1)" : s.color;
    const glow = !s.eraser && (s.color === "#FBBF24" || s.color === "#FB7185");
    ctx.shadowColor = glow ? s.color : "transparent";
    ctx.shadowBlur = glow ? 10 : 0;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (const t of page.texts ?? []) {
    if (skipTextId && t.id === skipTextId) continue;
    ctx.font = `600 ${t.fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = t.color;
    const lines = layoutTextLines(ctx, t);
    const lh = t.fontSize * LINE_HEIGHT;
    lines.forEach((line, i) => {
      ctx.fillText(line || " ", t.x, t.y + i * lh);
    });
  }
}

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

export function hitResizeHandle(
  t: CanvasText,
  x: number,
  y: number,
  hit = 22,
): ResizeCorner | undefined {
  const { w, h } = textBounds(t);
  const spots: [ResizeCorner, number, number][] = [
    ["nw", t.x, t.y],
    ["ne", t.x + w, t.y],
    ["sw", t.x, t.y + h],
    ["se", t.x + w, t.y + h],
  ];
  for (const [corner, hx, hy] of spots) {
    if (Math.abs(x - hx) <= hit && Math.abs(y - hy) <= hit) return corner;
  }
  return undefined;
}

export function hitTestText(texts: CanvasText[] | undefined, x: number, y: number) {
  const list = texts ?? [];
  for (let i = list.length - 1; i >= 0; i--) {
    const t = list[i];
    const { w, h } = textBounds(t);
    const pad = 10;
    if (x >= t.x - pad && x <= t.x + w + pad && y >= t.y - pad && y <= t.y + h + pad) return t;
  }
  return undefined;
}

export function rasterizePage(page: CanvasPage, cssW: number, cssH: number) {
  const canvas = document.createElement("canvas");
  const dpr = 2;
  const w = Math.max(1, Math.round(cssW));
  const h = Math.max(1, Math.round(cssH));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(dpr, dpr);
  drawPage(ctx, page, w, h);
  return canvas.toDataURL("image/png");
}
