"use client";

import { SUBJECT_LABEL } from "./constants";
import { difficultyLabel } from "./difficulty";
import { LatexText } from "./latex";
import { isDisplayImageSrc } from "./problem-images";
import { sanitizeInviteCode } from "./share";
import type { NotePage, Post } from "./types";
import { toBlob } from "html-to-image";
import { createRoot } from "react-dom/client";

export const MAX_SHARE_PAGES = 8;
const CARD_W = 1080;
const MAX_CARD_H = 7800;

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

function httpSrc(value?: string | null) {
  return value && isDisplayImageSrc(value) && /^https?:\/\//i.test(value) ? value : null;
}

export function shareContentPages(post: Post): NotePage[] {
  const pages = post.pages ?? [];
  const usable = pages.filter(
    (p) => httpSrc(p.image) || Boolean(p.latex?.trim()),
  );
  if (usable.length) return usable.slice(0, MAX_SHARE_PAGES);
  const photo = httpSrc(post.photo);
  if (photo) {
    return [{ id: "photo", latex: "", doodle: 0, image: photo }];
  }
  const { body } = shareProblemParts(post);
  if (body.trim()) {
    return [{ id: "body", latex: body, doodle: 0 }];
  }
  return [];
}

function ShareCardLayout({
  post,
  handle,
  inviteCode,
}: {
  post: Post;
  handle: string;
  inviteCode?: string | null;
}) {
  const { title } = shareProblemParts(post);
  const subject = SUBJECT_LABEL[post.subject] ?? "理系";
  const level = `Lv${post.difficultyLevel ?? 3} ${difficultyLabel(post.difficultyLevel ?? 3)}`;
  const pages = shareContentPages(post);
  const extra = Math.max(0, (post.pages?.length ?? 0) - pages.length);
  const code = sanitizeInviteCode(inviteCode);
  const codeLabel = code ? (code.length > 16 ? `${code.slice(0, 14)}…` : code) : null;
  const publicHandle = handle.replace(/^@/, "").slice(0, 32);

  return (
    <div
      data-qraft-share-card
      style={{
        width: CARD_W,
        minHeight: 1080,
        boxSizing: "border-box",
        padding: "64px 72px 48px",
        background: "linear-gradient(145deg, #1a1030 0%, #0b1220 55%, #122018 100%)",
        color: "#e7e9ea",
        fontFamily: "Noto Sans JP, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ margin: 0, color: "#8b98a5", fontWeight: 600, fontSize: 26 }}>
        {subject} · {level}
      </p>
      {title ? (
        <p
          style={{
            margin: "28px 0 0",
            color: "#fff",
            fontWeight: 800,
            fontSize: 44,
            lineHeight: 1.25,
            wordBreak: "break-word",
          }}
        >
          {title}
        </p>
      ) : null}
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 28 }}>
        {pages.length === 0 ? (
          <p style={{ color: "#8b98a5", fontSize: 32 }}>Qraftの問題</p>
        ) : (
          pages.map((page, i) => {
            const src = httpSrc(page.image);
            return (
              <div
                key={page.id || `share-page-${i}`}
                style={{
                  borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.12)",
                  paddingTop: i === 0 ? 0 : 28,
                }}
              >
                {pages.length > 1 ? (
                  <p style={{ margin: "0 0 12px", color: "#8b98a5", fontSize: 22, fontWeight: 700 }}>
                    {i + 1} / {pages.length}
                  </p>
                ) : null}
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    crossOrigin="anonymous"
                    style={{
                      display: "block",
                      width: "100%",
                      maxHeight: 920,
                      objectFit: "contain",
                      borderRadius: 20,
                      background: "#0b1220",
                    }}
                  />
                ) : page.latex ? (
                  <LatexText
                    text={page.latex}
                    className="share-card-latex text-[30px] leading-snug text-[#c5cdd6] [&_.katex]:text-[#f8fafc] [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto"
                  />
                ) : null}
              </div>
            );
          })
        )}
        {extra > 0 ? (
          <p style={{ margin: 0, color: "#8b98a5", fontSize: 22 }}>ほか {extra} ページはアプリで</p>
        ) : null}
      </div>
      <div
        style={{
          marginTop: "auto",
          paddingTop: 36,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#ccff00", fontWeight: 800, fontSize: 28, letterSpacing: 0.4 }}>
            Qraft
          </p>
          <p style={{ margin: "6px 0 0", color: "#8b98a5", fontWeight: 600, fontSize: 22 }}>
            qrafters.jp
          </p>
          {publicHandle ? (
            <p style={{ margin: "8px 0 0", color: "#8b98a5", fontWeight: 600, fontSize: 20 }}>
              @{publicHandle}
            </p>
          ) : null}
        </div>
        {codeLabel ? (
          <p
            style={{
              margin: 0,
              color: "#c5cdd6",
              fontWeight: 700,
              fontSize: 22,
              fontFamily: "ui-monospace, monospace",
              maxWidth: 280,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            【{codeLabel}】
          </p>
        ) : null}
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

function waitForImages(root: HTMLElement) {
  const imgs = [...root.querySelectorAll("img")];
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve, reject) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          if (img.complete && img.naturalWidth === 0) {
            reject(new Error("share image failed to load"));
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("share image failed to load"));
        }),
    ),
  );
}

export async function renderShareCard(
  post: Post,
  handle: string,
  inviteCode?: string | null,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-1600px;top:0;width:1080px;pointer-events:none;z-index:-1;";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(
      <ShareCardLayout post={post} handle={handle} inviteCode={inviteCode} />,
    );
    await waitFrames(3);
    if (document.fonts?.ready) await document.fonts.ready;
    await waitFrames(2);
    const node = host.querySelector("[data-qraft-share-card]");
    if (!(node instanceof HTMLElement)) return null;
    await waitForImages(node);
    const height = Math.min(MAX_CARD_H, Math.max(1080, node.scrollHeight));
    const blob = await toBlob(node, {
      cacheBust: true,
      pixelRatio: 1,
      backgroundColor: "#0b1220",
      width: CARD_W,
      height,
    });
    return blob && blob.size > 0 ? blob : null;
  } catch (err) {
    console.error("renderShareCard:", err);
    return null;
  } finally {
    root.unmount();
    host.remove();
  }
}
