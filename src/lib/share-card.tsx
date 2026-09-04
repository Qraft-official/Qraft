"use client";

import { SUBJECT_LABEL } from "./constants";
import { difficultyLabel } from "./difficulty";
import { LatexText } from "./latex";
import { isDisplayImageSrc } from "./problem-images";
import { problemShareUrl } from "./share";
import type { Post } from "./types";
import { toBlob } from "html-to-image";
import { createRoot } from "react-dom/client";

function shareProblemParts(post: Post) {
  const title = post.title?.trim() ?? "";
  let body = post.text ?? "";
  if (title) {
    const prefix = `**${title}**\n\n`;
    if (body.startsWith(prefix)) body = body.slice(prefix.length);
    if (body.trim() === title) body = "";
  }
  if (body.trim() === "手書きの問題") body = "";
  return { title, body };
}

function ShareCardLayout({
  post,
  handle,
}: {
  post: Post;
  handle: string;
}) {
  const { title, body } = shareProblemParts(post);
  const subject = SUBJECT_LABEL[post.subject] ?? "理系";
  const level = `Lv${post.difficultyLevel ?? 3} ${difficultyLabel(post.difficultyLevel ?? 3)}`;
  const thumbSrc =
    (post.photo && isDisplayImageSrc(post.photo) && post.photo.startsWith("http")
      ? post.photo
      : null) ||
    (post.pages ?? [])
      .map((p) => p.image)
      .find((src) => src && isDisplayImageSrc(src) && src.startsWith("http")) ||
    null;

  return (
    <div
      data-qraft-share-card
      style={{
        width: 1080,
        minHeight: 1080,
        boxSizing: "border-box",
        padding: 72,
        background: "linear-gradient(145deg, #1a1030 0%, #0b1220 55%, #122018 100%)",
        color: "#e7e9ea",
        fontFamily: "Noto Sans JP, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ color: "#ccff00", fontWeight: 800, fontSize: 52 }}>Qraft</span>
        <span style={{ color: "#e7e9ea", fontWeight: 600, fontSize: 28 }}>クラフト</span>
      </div>
      <p style={{ margin: "28px 0 0", color: "#8b98a5", fontWeight: 600, fontSize: 28 }}>
        {subject} · {level}
      </p>
      {title ? (
        <p
          style={{
            margin: "36px 0 0",
            color: "#fff",
            fontWeight: 800,
            fontSize: 48,
            lineHeight: 1.25,
            wordBreak: "break-word",
          }}
        >
          {title}
        </p>
      ) : null}
      <div
        style={{
          marginTop: 24,
          flex: 1,
          minHeight: 280,
          maxHeight: 560,
          overflow: "hidden",
          color: "#c5cdd6",
          fontSize: 32,
          lineHeight: 1.45,
        }}
      >
        {body ? (
          <LatexText
            text={body}
            className="share-card-latex text-[32px] leading-snug text-[#c5cdd6] [&_.katex]:text-[#f8fafc] [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto"
          />
        ) : thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbSrc}
            alt=""
            style={{ maxWidth: "100%", maxHeight: 480, borderRadius: 24, objectFit: "contain" }}
          />
        ) : (
          <p style={{ color: "#8b98a5" }}>手書き・数式の問題</p>
        )}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 32 }}>
        <p style={{ color: "#8b98a5", fontWeight: 600, fontSize: 28 }}>
          @{handle.replace(/^@/, "")}
        </p>
        <p style={{ margin: "18px 0 0", color: "#ccff00", fontWeight: 800, fontSize: 36 }}>
          Qraftで解いてみる
        </p>
      </div>
    </div>
  );
}

function waitFrames(n: number) {
  return new Promise<void>((resolve) => {
    const step = (left: number) => {
      if (left <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => step(left - 1));
    };
    step(n);
  });
}

export async function renderShareCard(post: Post, handle: string): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-1400px;top:0;width:1080px;pointer-events:none;z-index:-1;";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(<ShareCardLayout post={post} handle={handle} />);
    await waitFrames(3);
    if (document.fonts?.ready) await document.fonts.ready;
    await waitFrames(2);
    const node = host.querySelector("[data-qraft-share-card]");
    if (!(node instanceof HTMLElement)) return null;
    const blob = await toBlob(node, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: "#0b1220",
      width: 1080,
      height: Math.max(1080, node.scrollHeight),
    });
    return blob;
  } catch (err) {
    console.error("renderShareCard:", err);
    return null;
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function shareCardImage(blob: Blob, problemId: string) {
  const url = problemShareUrl(problemId);
  const file = new File([blob], "qraft-problem.png", { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  const data: ShareData = { files: [file], title: "Qraftの問題", text: "Qraftで解いてみる", url };
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
