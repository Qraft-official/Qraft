import { LatexText } from "@/lib/latex";
import type { ReactNode } from "react";

export function ProblemStudyBlocks({
  hints,
  explanation,
  showAnswer,
  answer,
  answerUnit,
  solutions,
  writeSolution,
  guest,
  lockSpoilers,
}: {
  hints: string[];
  explanation?: string;
  showAnswer?: boolean;
  answer?: string;
  answerUnit?: string;
  solutions?: ReactNode;
  writeSolution?: ReactNode;
  guest?: boolean;
  lockSpoilers?: boolean;
}) {
  return (
    <div className="space-y-3">
      {hints.length > 0 ? (
        <details className="rounded-2xl border border-gray-800 bg-panel px-4 py-3">
          <summary className="min-h-11 cursor-pointer list-none text-sm font-black">
            ヒントを見る
          </summary>
          <div className="mt-3 space-y-2">
            {hints.map((hint, i) => (
              <p key={i} className="rounded-xl border border-gray-800 px-3 py-2 text-sm leading-relaxed">
                <span className="mr-2 text-[11px] font-bold text-muted">ヒント{i + 1}</span>
                {hint}
              </p>
            ))}
          </div>
        </details>
      ) : null}

      {showAnswer && answer?.trim() ? (
        <details className="rounded-2xl border border-gray-800 bg-panel px-4 py-3">
          <summary className="min-h-11 cursor-pointer list-none text-sm font-black">答え</summary>
          <p className="mt-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm">
            {answer}
            {answerUnit ? ` ${answerUnit}` : ""}
          </p>
        </details>
      ) : null}

      <details className="rounded-2xl border border-gray-800 bg-panel px-4 py-3">
        <summary className="min-h-11 cursor-pointer list-none text-sm font-black">
          解説・考え方
        </summary>
        {lockSpoilers ? (
          <p className="mt-3 text-sm text-muted">解答したあとに、考え方を表示します。</p>
        ) : explanation?.trim() ? (
          <div className="mt-3 text-sm leading-relaxed text-[#e7e9ea]">
            <LatexText text={explanation} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            この問題にはまだ解説がありません。出題者が追加するか、解法として考え方を残すことができます。
          </p>
        )}
      </details>

      <section className="rounded-2xl border border-gray-800 bg-panel px-4 py-3">
        <h2 className="text-sm font-black">みんなの解法</h2>
        {solutions ?? (
          <p className="mt-2 text-sm text-muted">
            まだ解法がありません。
            {guest ? "ログインすると解法を書いたり、他の人の解法を読めます。" : "最初の解法を書いてみよう。"}
          </p>
        )}
        {writeSolution}
      </section>
    </div>
  );
}
