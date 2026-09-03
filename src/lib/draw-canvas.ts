import type { CanvasPage, CanvasText } from "./types";

export function emptyCanvasPage(id = `p-${Math.random().toString(36).slice(2, 9)}`): CanvasPage {
  return { id, strokes: [], texts: [] };
}

const LINE_HEIGHT = 1.35;
const NOTE_EDGE_PAD = 8;

export function wrapWidthForText(t: CanvasText, canvasWidth?: number) {
  const boxW = t.width && t.width > 8 ? t.width : Number.POSITIVE_INFINITY;
  const remain =
    canvasWidth != null ? Math.max(8, canvasWidth - t.x - NOTE_EDGE_PAD) : boxW;
  const maxW = Math.min(boxW, remain);
  return Number.isFinite(maxW) ? maxW : 0;
}

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
  canvasWidth?: number,
) {
  ctx.font = `600 ${t.fontSize}px ui-sans-serif, system-ui, sans-serif`;
  const maxW = wrapWidthForText(t, canvasWidth);
  const out: string[] = [];
  for (const para of (t.text || " ").split("\n")) {
    out.push(...wrapLine(ctx, para, maxW));
  }
  return out;
}

const WIDE_CHAR_RE = /[\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/;

/** Bounds are needed outside a canvas context, where `measureText` is absent. */
function approxLineWidth(line: string, fontSize: number) {
  let width = 0;
  for (const ch of line) width += WIDE_CHAR_RE.test(ch) ? fontSize : fontSize * 0.58;
  return width;
}

export function textBounds(t: CanvasText, canvasWidth?: number) {
  const maxW = wrapWidthForText(t, canvasWidth);
  let lineCount = 0;
  for (const para of (t.text || " ").split("\n")) {
    const width = approxLineWidth(para, t.fontSize);
    lineCount += maxW >= 8 ? Math.max(1, Math.ceil(width / maxW)) : 1;
  }
  const w =
    t.width ??
    (maxW >= 8 ? maxW : Math.max(80, (t.text.length || 1) * t.fontSize * 0.62));
  // Wrapped lines must be inside the bounds, otherwise the rasterized note
  // clips them and hit testing misses the lower lines.
  const contentH = Math.max(1, lineCount) * t.fontSize * LINE_HEIGHT;
  const h = Math.max(t.height ?? 0, contentH);
  return { w, h };
}

function strokePath(ctx: CanvasRenderingContext2D, s: CanvasPage["strokes"][number]) {
  if (s.points.length < 2) return;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = s.width;
  ctx.beginPath();
  ctx.moveTo(s.points[0].x, s.points[0].y);
  for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
  ctx.stroke();
}

/** Ink only: erasers punch ink via destination-out, never the ruled background. */
function drawInkStrokes(ctx: CanvasRenderingContext2D, page: CanvasPage, w: number, h: number) {
  const ink = document.createElement("canvas");
  ink.width = Math.max(1, Math.ceil(w));
  ink.height = Math.max(1, Math.ceil(h));
  const ictx = ink.getContext("2d");
  if (!ictx) return;
  for (const s of page.strokes) {
    if (s.points.length < 2) continue;
    if (s.eraser) {
      ictx.globalCompositeOperation = "destination-out";
      ictx.strokeStyle = "rgba(0,0,0,1)";
      ictx.shadowBlur = 0;
      ictx.shadowColor = "transparent";
      strokePath(ictx, s);
    } else {
      ictx.globalCompositeOperation = "source-over";
      ictx.strokeStyle = s.color;
      const glow = s.color === "#FBBF24" || s.color === "#FB7185";
      ictx.shadowColor = glow ? s.color : "transparent";
      ictx.shadowBlur = glow ? 10 : 0;
      strokePath(ictx, s);
      ictx.shadowBlur = 0;
      ictx.shadowColor = "transparent";
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(ink, 0, 0, w, h);
  ctx.restore();
}

export function drawPage(
  ctx: CanvasRenderingContext2D,
  page: CanvasPage,
  w: number,
  h: number,
  skipTextId?: string | null,
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
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
  drawInkStrokes(ctx, page, w, h);
  ctx.globalCompositeOperation = "source-over";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (const t of page.texts ?? []) {
    if (skipTextId && t.id === skipTextId) continue;
    ctx.font = `600 ${t.fontSize}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillStyle = t.color;
    const lines = layoutTextLines(ctx, t, w);
    const lh = t.fontSize * LINE_HEIGHT;
    lines.forEach((line, i) => {
      ctx.fillText(line || " ", t.x, t.y + i * lh);
    });
  }
  ctx.restore();
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

function rasterizePageCanvas(page: CanvasPage, cssW: number, cssH: number) {
  const canvas = document.createElement("canvas");
  const dpr = 2;
  const w = Math.max(1, Math.round(cssW));
  const h = Math.max(1, Math.round(cssH));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  drawPage(ctx, page, w, h);
  return canvas;
}

export function rasterizePage(page: CanvasPage, cssW: number, cssH: number) {
  return rasterizePageCanvas(page, cssW, cssH)?.toDataURL("image/png") ?? "";
}

export function rasterizePageBlob(page: CanvasPage, cssW: number, cssH: number) {
  const canvas = rasterizePageCanvas(page, cssW, cssH);
  if (!canvas) return Promise.resolve(null);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export function pageHasInk(page: CanvasPage) {
  return page.strokes.length > 0 || (page.texts?.length ?? 0) > 0;
}

const NOTE_MIN_H = 280;
const NOTE_PAD = 56;

/** Lowest ink/text Y on a page (pen strokes only; erasers do not extend bounds). */
export function pageInkMaxY(page: CanvasPage): number {
  let maxY = 0;
  for (const s of page.strokes) {
    if (s.eraser) continue;
    const half = (s.width || 3) / 2;
    for (const pt of s.points) {
      if (pt.y + half > maxY) maxY = pt.y + half;
    }
  }
  for (const t of page.texts ?? []) {
    const bottom = t.y + textBounds(t).h;
    if (bottom > maxY) maxY = bottom;
  }
  return maxY;
}

/** Shared canvas CSS height: tallest used range among pages + padding. */
export function sharedNotebookHeight(
  pages: CanvasPage[],
  minH = NOTE_MIN_H,
  pad = NOTE_PAD,
): number {
  const maxY = pages.reduce((m, p) => Math.max(m, pageInkMaxY(p)), 0);
  return Math.max(minH, Math.ceil(maxY + pad));
}

export function typedContentHeight(latex: string, minH = 160, pad = 40): number {
  const raw = latex.trim();
  if (!raw) return minH;
  const lines = Math.max(1, raw.split(/\n/).length + (raw.match(/\\\\/g)?.length ?? 0));
  return Math.max(minH, Math.min(2400, pad + lines * 32));
}

export function sharedTypedHeight(pages: { latex: string }[]): number {
  return pages.reduce((m, p) => Math.max(m, typedContentHeight(p.latex)), 160);
}
