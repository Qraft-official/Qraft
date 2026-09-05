"use client";

import { sanitizeHints } from "@/lib/learn";
import type { Post } from "@/lib/types";
import { useState } from "react";

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
  const hints = sanitizeHints(post.hints);
  const hasAhaAnswer =
    (post.problemMode === "aha" || post.kind === "sprint") && Boolean(post.correctAnswer?.trim());
  const hasExplain = Boolean(post.solution?.trim());
  const [hintStep, setHintStep] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  if (locked) return null;
  if (!hints.length && !hasAhaAnswer && !hasExplain) return null;

  return (
    <div className="mt-3 space-y-2">
      {hints.length > 0 && (
        <div>
          {hintStep === 0 ? (
            <button
              type="button"
              className="min-h-11 rounded-full border border-gray-700 px-4 text-sm font-bold"
              onClick={() => setHintStep(1)}
            >
              ヒントを見る
            </button>
          ) : (
            <div className="space-y-2">
              {hints.slice(0, hintStep).map((h, i) => (
                <p key={i} className="rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm">
                  <span className="mr-2 text-xs font-bold text-muted">ヒント{i + 1}</span>
                  {h}
                </p>
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
          <p className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm">
            答え: {post.correctAnswer}
          </p>
        ) : (
          <button
            type="button"
            className="min-h-11 rounded-full border border-gray-700 px-4 text-sm font-bold"
            onClick={() => {
              setShowAnswer(true);
              onRevealed?.();
            }}
          >
            答えを見る
          </button>
        ))}
      {hasExplain &&
        (showExplain || isAuthor ? (
          <p className="whitespace-pre-wrap rounded-xl border border-gray-800 bg-panel px-3 py-2 text-sm leading-relaxed">
            {post.solution}
          </p>
        ) : (
          <button
            type="button"
            className="min-h-11 rounded-full bg-white/10 px-4 text-sm font-bold"
            onClick={() => {
              setShowExplain(true);
              onRevealed?.();
            }}
          >
            解説を見る
          </button>
        ))}
    </div>
  );
}
