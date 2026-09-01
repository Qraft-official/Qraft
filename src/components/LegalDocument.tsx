"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={i} className="font-bold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={i} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em] text-aha">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        const href = link[2].trim();
        const isHref = /^(https?:\/\/|mailto:|\/|#)/.test(href);
        if (!isHref) {
          parts.push(token);
        } else {
          const external = /^https?:\/\//.test(href) || href.startsWith("mailto:");
          parts.push(
            <a
              key={i}
              href={href}
              className="font-bold text-sky-400 underline underline-offset-2"
              {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {link[1]}
            </a>,
          );
        }
      }
    }
    i += 1;
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function parseTable(rows: string[]) {
  const cells = rows
    .filter((r) => !/^\s*\|?\s*:?-{3,}/.test(r))
    .map((r) =>
      r
        .replace(/^\s*\|/, "")
        .replace(/\|\s*$/, "")
        .split("|")
        .map((c) => c.trim()),
    )
    .filter((r) => r.some(Boolean));
  if (cells.length < 2) return null;
  const [head, ...body] = cells;
  return (
    <div className="my-3 overflow-x-auto rounded-2xl border border-gray-800">
      <table className="w-full min-w-[28rem] border-collapse text-left text-[12px]">
        <thead>
          <tr className="bg-white/5">
            {head.map((h) => (
              <th key={h} className="border-b border-gray-800 px-3 py-2 font-black text-white">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="odd:bg-black even:bg-white/[0.02]">
              {row.map((c, ci) => (
                <td key={ci} className="border-b border-gray-900 px-3 py-2 text-muted">
                  {inline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  if (lines[0] && /^(利用規約|プライバシーポリシー)\s*$/.test(lines[0].trim())) {
    lines.shift();
  }
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      nodes.push(<hr key={key++} className="my-6 border-gray-800" />);
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={key++} className="mt-8 text-base font-black text-white">
          {inline(line.slice(3))}
        </h2>,
      );
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={key++} className="text-2xl font-black">
          {inline(line.slice(2))}
        </h1>,
      );
      i += 1;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const table: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        table.push(lines[i]);
        i += 1;
      }
      const el = parseTable(table);
      if (el) nodes.push(<div key={key++}>{el}</div>);
      continue;
    }
    const numbered = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
    if (numbered) {
      const items: { indent: number; n: string; text: string }[] = [];
      while (i < lines.length) {
        const n = /^(\s*)(\d+)\.\s+(.*)$/.exec(lines[i]);
        if (!n) break;
        items.push({ indent: n[1].length, n: n[2], text: n[3] });
        i += 1;
      }
      nodes.push(
        <ol key={key++} className="mt-3 space-y-2">
          {items.map((it, idx) => {
            const nested = it.indent > 1;
            return (
              <li
                key={idx}
                className={`text-[13px] leading-relaxed text-[#cfd6de] ${nested ? "pl-4" : ""}`}
              >
                <span className="mr-2 font-bold text-muted">{it.n}.</span>
                {inline(it.text)}
              </li>
            );
          })}
        </ol>,
      );
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].trim().startsWith("|") &&
      !/^\s*---+\s*$/.test(lines[i]) &&
      !/^(\s*)(\d+)\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    nodes.push(
      <p key={key++} className="mt-3 text-[13px] leading-relaxed text-[#cfd6de]">
        {inline(para.join("\n"))}
      </p>,
    );
  }
  return <article className="pb-16">{nodes}</article>;
}

export function LegalDocument({ title, markdown }: { title: string; markdown: string }) {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-col bg-black">
      <header className="sticky top-0 z-30 shrink-0 border-b border-gray-900 bg-black/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          aria-label="戻る"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) router.back();
            else router.push("/");
          }}
          className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted"
        >
          <ArrowLeft size={20} />
        </button>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 md:max-w-2xl">
        <p className="text-[11px] font-bold tracking-wide text-muted">Qraft</p>
        <h1 className="mt-1 text-2xl font-black">{title}</h1>
        <LegalMarkdown markdown={markdown} />
      </main>
    </div>
  );
}
