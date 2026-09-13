import { NotePages } from "@/components/NotePages";
import { SUBJECT_LABEL } from "@/lib/constants";
import { difficultyLabel } from "@/lib/difficulty";
import { LatexText } from "@/lib/latex";
import { isDisplayImageSrc } from "@/lib/problem-images";
import {
  clampPublicBody,
  type PublicProblemPreview,
} from "@/lib/public-catalog";
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
  compact = false,
}: {
  preview: PublicProblemPreview;
  href?: string;
  compact?: boolean;
}) {
  const title = preview.title.trim() || "問題";
  const body = compact ? clampPublicBody(preview.body) : preview.body.trim();

  return (
    <article className="min-w-0 max-w-full overflow-x-hidden border-b border-gray-800 px-4 py-4">
      <header className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
          {SUBJECT_LABEL[preview.subject]}
        </span>
        {preview.topic ? (
          <span className="max-w-full truncate rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted">
            {preview.topic}
          </span>
        ) : null}
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted">
          Lv{preview.difficultyLevel} {difficultyLabel(preview.difficultyLevel)}
        </span>
        <span className="rounded-full bg-aha/10 px-2 py-0.5 text-[10px] font-bold text-aha">
          {modeLabel(preview)}
        </span>
      </header>
      <h2 className="mt-2 max-w-full break-words text-base font-black text-white">{title}</h2>
      {body ? (
        <div className="mt-2 min-w-0 max-w-full overflow-x-hidden text-sm leading-relaxed text-[#e7e9ea]">
          <LatexText text={body} />
        </div>
      ) : null}
      {!compact && preview.photo && isDisplayImageSrc(preview.photo) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.photo}
          alt=""
          className="mt-3 max-h-72 w-full max-w-full rounded-2xl object-contain"
        />
      ) : null}
      {!compact && preview.pages?.length ? (
        <div className="mt-3 min-w-0 max-w-full overflow-x-hidden">
          <NotePages pages={preview.pages} />
        </div>
      ) : null}
      {href ? (
        <p className="mt-3">
          <Link
            href={href}
            className="inline-flex min-h-11 items-center text-sm font-bold text-sky-400"
          >
            問題の詳細を見る
          </Link>
        </p>
      ) : null}
    </article>
  );
}
