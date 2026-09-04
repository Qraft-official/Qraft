import { SUBJECT_LABEL } from "./constants";
import { difficultyLabel } from "./difficulty";
import { isDisplayImageSrc } from "./problem-images";
import type { Post } from "./types";

function clip(text: string, n: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function problemBody(post: Post) {
  const title = post.title?.trim() ?? "";
  let body = post.text ?? "";
  if (title) {
    const prefix = `**${title}**\n\n`;
    if (body.startsWith(prefix)) body = body.slice(prefix.length);
    if (body.trim() === title) body = "";
  }
  if (body.trim() === "手書きの問題") body = "";
  return body.replace(/\$\$?[\s\S]*?\$\$?/g, " ").replace(/\s+/g, " ").trim();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function renderShareCard(post: Post, handle: string): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const title = clip(post.title || "Qraft の問題", 42);
  const body = clip(problemBody(post), 140);
  const subject = SUBJECT_LABEL[post.subject] ?? "理系";
  const level = `Lv${post.difficultyLevel ?? 3} ${difficultyLabel(post.difficultyLevel ?? 3)}`;
  const gradeN = post.gradeN ?? 0;
  const acc =
    gradeN > 0 ? `正答率 ${Math.round(((post.gradeCorrect ?? 0) / gradeN) * 100)}%` : null;
  const thumbSrc =
    (post.photo && isDisplayImageSrc(post.photo) && post.photo.startsWith("http")
      ? post.photo
      : null) ||
    (post.pages ?? [])
      .map((p) => p.image)
      .find((src) => src && isDisplayImageSrc(src) && src.startsWith("http")) ||
    null;
  const thumb = thumbSrc ? await loadImage(thumbSrc) : null;

  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, size, size);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "rgba(168,85,247,0.28)");
  g.addColorStop(1, "rgba(204,255,0,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#ccff00";
  ctx.font = "800 52px sans-serif";
  ctx.fillText("Qraft", 72, 120);
  ctx.fillStyle = "#e7e9ea";
  ctx.font = "600 28px sans-serif";
  ctx.fillText("クラフト", 250, 118);

  ctx.fillStyle = "#8b98a5";
  ctx.font = "600 28px sans-serif";
  ctx.fillText(`${subject} · ${level}${acc ? ` · ${acc}` : ""}`, 72, 190);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 54px sans-serif";
  wrapText(ctx, title, 72, 280, size - 144, 66);

  ctx.fillStyle = "#c5cdd6";
  ctx.font = "500 32px sans-serif";
  wrapText(ctx, body || "手書き・数式の問題", 72, 430, size - 144, 44);

  if (thumb) {
    const tw = 280;
    const th = 200;
    const tx = size - 72 - tw;
    const ty = size - 280 - th;
    ctx.save();
    roundedClip(ctx, tx, ty, tw, th, 24);
    const scale = Math.max(tw / thumb.width, th / thumb.height);
    const dw = thumb.width * scale;
    const dh = thumb.height * scale;
    ctx.drawImage(thumb, tx + (tw - dw) / 2, ty + (th - dh) / 2, dw, dh);
    ctx.restore();
  }

  ctx.fillStyle = "#8b98a5";
  ctx.font = "600 28px sans-serif";
  ctx.fillText(`@${handle.replace(/^@/, "")}`, 72, size - 160);

  ctx.fillStyle = "#ccff00";
  ctx.font = "800 36px sans-serif";
  ctx.fillText("Qraftで解いてみる", 72, size - 96);

  return await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png", 0.92);
  });
}

function roundedClip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const chars = [...text];
  let line = "";
  let yy = y;
  let lines = 0;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lineHeight;
      lines += 1;
      if (lines >= 4) {
        ctx.fillText("…", x, yy);
        return;
      }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export async function shareCardImage(blob: Blob, url: string) {
  const file = new File([blob], "qraft-problem.png", { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  const data: ShareData = { files: [file], title: "Qraft", text: "Qraftで解いてみる", url };
  if (typeof nav.share === "function" && (!nav.canShare || nav.canShare(data))) {
    try {
      await nav.share(data);
      return { ok: true as const, method: "share" as const };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return { ok: false as const, method: "share" as const, aborted: true };
      }
    }
  }
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "qraft-problem.png";
  a.click();
  URL.revokeObjectURL(href);
  try {
    await navigator.clipboard.writeText(url);
    return { ok: true as const, method: "download" as const };
  } catch {
    return { ok: true as const, method: "download" as const };
  }
}
