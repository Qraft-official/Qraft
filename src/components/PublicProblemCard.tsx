"use client";

import { NotePages } from "@/components/NotePages";
import { SUBJECT_LABEL } from "@/lib/constants";
import { difficultyLabel } from "@/lib/difficulty";
import { LatexText } from "@/lib/latex";
import { isDisplayImageSrc } from "@/lib/problem-images";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import Link from "next/link";

function modeLabel(preview: PublicProblemPreview) {
  if (preview.isSprint) return "PULSE";
  if (preview.mode === "challenge") return "Challenger";
  if (preview.mode === "aha") return "Aha!";
  return "教えてQrafter!";
}

export function PublicProblemCard({
  preview,
  href,
  compact,
}: {
  preview: PublicProblemPreview;
  href?: string;
  compact?: boolean;
}) {
  const body = preview.body.trim();
  const snippet = compact && body.length > 280 ? `${body.slice(0, 280)}…` : body;
  const inner = (
    <article className="border-b border-gray-800 px-4 py-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
          {SUBJECT_LABEL[preview.subject]}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted">
          Lv{preview.difficultyLevel} {difficultyLabel(preview.difficultyLevel)}
        </span>
        <span className="rounded-full bg-aha/10 px-2 py-0.5 text-[10px] font-bold text-aha">
          {modeLabel(preview)}
        </span>
      </div>
      {preview.title ? (
        <h2 className="mt-2 text-base font-black text-white">{preview.title}</h2>
      ) : null}
      {snippet ? (
        <div className="mt-2 text-sm leading-relaxed text-[#e7e9ea]">
          <LatexText text={snippet} />
        </div>
      ) : null}
      {!compact && preview.photo && isDisplayImageSrc(preview.photo) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.photo}
          alt=""
          className="mt-3 max-h-72 w-full rounded-2xl object-contain"
        />
      ) : null}
      {!compact && preview.pages?.length ? <NotePages pages={preview.pages} /> : null}
    </article>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="block hover:bg-white/5">
      {inner}
    </Link>
  );
}
