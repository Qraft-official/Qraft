"use client";

import katex from "katex";
import { Fragment, useMemo } from "react";
import { katexHtmlHasError, latexToPlainText, normalizeLatexForKatex, capExcessBlankLines } from "./latex-normalize";
import { splitTextSizeParts, textSizeClass } from "./text-size";

function render(math: string, display: boolean) {
  const prepared = normalizeLatexForKatex(math);
  if (prepared == null || prepared === "") return null;
  try {
    const html = katex.renderToString(prepared, {
      throwOnError: false,
      displayMode: display,
      output: "html",
    });
    if (katexHtmlHasError(html)) return null;
    return html;
  } catch {
    return null;
  }
}

type Part =
  | { type: "text"; value: string }
  | { type: "inline"; value: string }
  | { type: "block"; value: string }
  | { type: "code"; lang: string; value: string };

function splitCode(text: string): { type: "text" | "code"; lang: string; value: string }[] {
  const out: { type: "text" | "code"; lang: string; value: string }[] = [];
  const re = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: "text", lang: "", value: text.slice(last, m.index) });
    out.push({ type: "code", lang: m[1] || "", value: m[2].replace(/\n$/, "") });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", lang: "", value: text.slice(last) });
  return out;
}

function tokenizeMath(text: string): Part[] {
  const parts: Part[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: "text", value: text.slice(last, m.index) });
    if (m[1] != null) parts.push({ type: "block", value: m[1] });
    else parts.push({ type: "inline", value: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

function formatInlinePlain(value: string) {
  const chunks = value.split(/(`[^`]+`|\*\*[^*]+\*\*|#{1,3} )/g);
  return chunks.map((c, i) => {
    if (c.startsWith("`") && c.endsWith("`") && c.length > 1) {
      return (
        <code key={i} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-aha">
          {c.slice(1, -1)}
        </code>
      );
    }
    if (c.startsWith("**") && c.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {c.slice(2, -2)}
        </strong>
      );
    }
    if (c === "# " || c === "## " || c === "### ") {
      return (
        <span key={i} className="font-black text-white">
          {c.trim()}{" "}
        </span>
      );
    }
    return <Fragment key={i}>{c}</Fragment>;
  });
}

function formatTextLines(value: string) {
  const lines = value.split("\n");
  return lines.map((line, li) => {
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const content = heading ? (
      <span
        className={
          heading[1].length === 1
            ? "block text-lg font-black text-white"
            : heading[1].length === 2
              ? "block text-base font-bold text-white"
              : "block text-sm font-bold text-white"
        }
      >
        {formatInlinePlain(heading[2])}
      </span>
    ) : (
      formatInlinePlain(line)
    );
    return (
      <Fragment key={li}>
        {li > 0 ? "\n" : null}
        {content}
      </Fragment>
    );
  });
}

function formatText(value: string) {
  const sized = splitTextSizeParts(value);
  if (!sized.some((p) => p.size)) return formatTextLines(value);
  return sized.map((p, i) => {
    const inner = formatTextLines(p.value);
    if (!p.size) return <Fragment key={i}>{inner}</Fragment>;
    return (
      <span key={i} className={textSizeClass(p.size, "feed")}>
        {inner}
      </span>
    );
  });
}

export function LatexText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = useMemo(() => splitCode(capExcessBlankLines(text)), [text]);
  return (
    <div className={`max-w-full whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere] [word-break:break-word] [&_.katex]:max-w-full [&_.katex-display]:my-2 [&_.katex-display]:block [&_.katex-display]:max-w-full ${className}`}>
      {blocks.map((b, bi) => {
        if (b.type === "code") {
          return (
            <pre
              key={bi}
              className="my-2 overflow-x-auto rounded-xl border border-gray-800 bg-[#0b1220] p-3 font-mono text-[12px] text-aha"
            >
              {b.lang && (
                <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted">
                  {b.lang}
                </span>
              )}
              <code>{b.value}</code>
            </pre>
          );
        }
        return (
          <Fragment key={bi}>
            {tokenizeMath(b.value).map((p, i) => {
              if (p.type === "text") return <Fragment key={i}>{formatText(p.value)}</Fragment>;
              if (p.type === "code") return null;
              const html = render(p.value, p.type === "block");
              if (!html) {
                const fallback = latexToPlainText(p.value) || p.value;
                return <Fragment key={i}>{formatText(fallback)}</Fragment>;
              }
              if (p.type === "block") {
                return (
                  <span
                    key={i}
                    className="my-2 block overflow-x-auto text-center"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              }
              return (
                <span
                  key={i}
                  className="inline-block align-middle"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}
