import { GoogleAdSlot } from "@/components/GoogleAdSlot";
import { ProblemStudyBlocks } from "@/components/ProblemStudyBlocks";
import { PublicProblemCard } from "@/components/PublicProblemCard";
import { RelatedProblemCards } from "@/components/RelatedProblemCards";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import type { RelatedProblemCard } from "@/lib/related-problems";
import { CANONICAL_ORIGIN, SUBJECT_LABEL } from "@/lib/constants";
import { difficultyLabel } from "@/lib/difficulty";
import Link from "next/link";

function modeLabel(preview: PublicProblemPreview) {
  if (preview.isSprint) return "PULSE";
  if (preview.mode === "challenge") return "Challenger";
  if (preview.mode === "aha") return "Aha!";
  return "教えてQrafter!";
}

export function PublicProblemView({
  preview,
  related,
}: {
  preview: PublicProblemPreview | null;
  related?: RelatedProblemCard[];
}) {
  if (!preview) {
    return (
      <main className="min-w-0 max-w-full overflow-x-hidden px-4 py-10">
        <h1 className="text-lg font-black">この問題は公開されていません</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          非公開、公開前のPULSE、または存在しない問題です。答え・解説・秘密情報は表示しません。
        </p>
        <Link href="/discover" className="mt-6 inline-block min-h-11 text-sm font-bold text-sky-400">
          公開中の問題を見る
        </Link>
      </main>
    );
  }

  const hasContent = Boolean(preview.title.trim() || preview.body.trim() || preview.photo || preview.pages?.length);
  const hints = preview.hints ?? [];
  const explanation = preview.explanation?.trim() ?? "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: preview.title.trim() || "問題",
    description: (preview.body || preview.title).replace(/\s+/g, " ").trim().slice(0, 240),
    url: `${CANONICAL_ORIGIN}/p/${preview.id}`,
    inLanguage: "ja",
    about: SUBJECT_LABEL[preview.subject],
    educationalLevel: `Lv${preview.difficultyLevel} ${difficultyLabel(preview.difficultyLevel)}`,
    learningResourceType: modeLabel(preview),
  };

  return (
    <main className="min-w-0 max-w-full overflow-x-hidden pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="border-b border-gray-800 px-4 py-4">
        <Link href="/discover" className="text-sm font-bold text-muted">
          ← Discover
        </Link>
        <p className="mt-3 text-sm leading-relaxed text-[#c5cdd6]">
          まず自分で考えてから、ヒント・解説・他の人の解法へ進む学習ページです。答えは最初から開きません。
        </p>
      </div>
      <PublicProblemCard preview={preview} />
      <section className="border-b border-gray-800 px-4 py-5">
        <p className="text-xs font-bold text-muted">
          {hints.length ? "ヒントあり · " : ""}
          {explanation ? "解説あり · " : "解説枠あり · "}
          みんなの解法
        </p>
        <div className="mt-3">
          <ProblemStudyBlocks
            hints={hints}
            explanation={preview.isSprint ? undefined : explanation}
            lockSpoilers={preview.isSprint}
            guest
          />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/login?next=/p/${encodeURIComponent(preview.id)}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-aha px-5 text-sm font-black text-black"
          >
            ログインして解答する
          </Link>
          <Link
            href="/discover"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 px-5 text-sm font-bold"
          >
            ほかの問題
          </Link>
        </div>
      </section>
      <RelatedProblemCards items={related ?? []} />
      <GoogleAdSlot enabled={hasContent} />
    </main>
  );
}
