import { PublicProblemFeed } from "@/components/PublicProblemFeed";
import type { PublicProblemPreview } from "@/lib/public-catalog";

const INITIAL_COUNT = 10;

export function OfficialProblemCollection({ problems }: { problems: PublicProblemPreview[] }) {
  const initial = problems.slice(0, INITIAL_COUNT);
  const remaining = problems.slice(INITIAL_COUNT);
  return (
    <section id="curated" className="border-b border-gray-800" aria-labelledby="curated-heading">
      <div className="px-4 py-6">
        <p className="text-sm font-bold text-aha">Qraft公式</p>
        <h2 id="curated-heading" className="mt-1 text-xl font-black text-white">Qraft厳選問題</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#c5cdd6]">
          ログインなしで挑戦できます。まずは気になる一問から、ひらめきを試してみてください。
        </p>
      </div>
      <PublicProblemFeed problems={initial} compact />
      {remaining.length ? (
        <details className="border-t border-gray-800">
          <summary className="mx-4 my-4 flex min-h-11 cursor-pointer list-none items-center justify-center rounded-full border border-aha/50 bg-aha/10 px-5 text-sm font-black text-aha">
            もっと見る（残り{remaining.length}問）
          </summary>
          <PublicProblemFeed problems={remaining} compact />
        </details>
      ) : null}
    </section>
  );
}
