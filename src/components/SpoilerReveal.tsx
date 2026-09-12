"use client";

import { sanitizeHints } from "@/lib/learn";
import { LatexText } from "@/lib/latex";
import { eligibleForMetricsAtSubmit } from "@/lib/problem-stats";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { useState } from "react";

function MetricsNote() {
  return (
    <p className="text-[11px] leading-snug text-muted">
      答え/解説を確認したため、この解答は統計に含まれません
    </p>
  );
}

export function SpoilerReveal({
  post,
  locked,
  isAuthor,
  onRevealed,
}: {
  post: Post;
  locked?: boolean;
  isAuthor: boolean;
  onRevealed?: () => void;
}) {
  const { recordSpoiler, problemSpoilers, lastAttempts } = useApp();
  const hints = sanitizeHints(post.hints);
  const hasAhaAnswer =
    (post.problemMode === "aha" || post.kind === "sprint") && Boolean(post.correctAnswer?.trim());
  const hasExplain = Boolean(post.solution?.trim());
  const [hintStep, setHintStep] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  const spoiler = problemSpoilers[post.id];
  const last = lastAttempts[post.id];
  const willExclude = last?.submittedAt
    ? last.eligibleForMetrics === false ||
      !eligibleForMetricsAtSubmit(spoiler, last.submittedAt)
    : Boolean(spoiler?.answerRevealedAt || spoiler?.explanationRevealedAt);

  if (locked) return null;
  if (!hints.length && !hasAhaAnswer && !hasExplain) return null;

  const reveal = (kind: "answer" | "explanation") => {
    if (kind === "answer") setShowAnswer(true);
    else setShowExplain(true);
    onRevealed?.();
    void recordSpoiler(post.id, kind);
  };

  return (
    <div className="mt-3 min-w-0 max-w-full space-y-2">
      {hints.length > 0 && (
        <div className="min-w-0 max-w-full">
          {hintStep === 0 ? (
            <button
              type="button"
              className="min-h-11 rounded-full border border-gray-700 px-4 text-sm font-bold"
              onClick={() => setHintStep(1)}
            >
              ヒントを見る
            </button>
          ) : (
            <div className="min-w-0 max-w-full space-y-2">
              {hints.slice(0, hintStep).map((h, i) => (
                <div
                  key={i}
                  className="min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm"
                >
                  <span className="mr-2 text-xs font-bold text-muted">ヒント{i + 1}</span>
                  <LatexText text={h} className="mt-1 max-w-full text-sm leading-relaxed" />
                </div>
              ))}
              {hintStep < hints.length && (
                <button
                  type="button"
                  className="min-h-11 rounded-full border border-gray-700 px-4 text-sm font-bold"
                  onClick={() => setHintStep((n) => n + 1)}
                >
                  次のヒント
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {hasAhaAnswer &&
        (showAnswer ? (
          <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm">
            <p className="text-xs font-bold text-orange-200">答え</p>
            <LatexText text={post.correctAnswer ?? ""} className="mt-1 max-w-full text-sm leading-relaxed" />
          </div>
        ) : (
          <button
            type="button"
            className="min-h-11 rounded-full border border-gray-700 px-4 text-sm font-bold"
            onClick={() => reveal("answer")}
          >
            答えを見る
          </button>
        ))}
      {hasExplain &&
        (showExplain || isAuthor ? (
          <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm">
            <p className="text-xs font-bold text-muted">解説</p>
            <LatexText text={post.solution ?? ""} className="mt-1 max-w-full text-sm leading-relaxed" />
          </div>
        ) : (
          <button
            type="button"
            className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-bold"
            onClick={() => reveal("explanation")}
          >
            解説を見る
          </button>
        ))}
      {willExclude ? <MetricsNote /> : null}
    </div>
  );
}
