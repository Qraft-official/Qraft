"use client";

import { FELT_VOTES, feltLabel, type FeltVote } from "@/lib/learn";
import { isProblemUuid } from "@/lib/difficulty";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";

export function FeltDifficulty({ post }: { post: Post }) {
  const { feltVotes, voteFeltDifficulty, me } = useApp();
  if (post.kind === "reply" || post.kind === "solution") return null;
  if (!isProblemUuid(post.id)) return null;
  const mine = feltVotes[post.id];
  const isAuthor = post.authorId === me.id;
  const stats = {
    easy: post.feltEasy ?? 0,
    normal: post.feltNormal ?? 0,
    hard: post.feltHard ?? 0,
  };
  const summary = feltLabel(stats);

  return (
    <div className="mt-2">
      {!isAuthor && (
        <div className="flex flex-wrap gap-1.5">
          {FELT_VOTES.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={mine === v.id}
              onClick={() => void voteFeltDifficulty(post.id, v.id as FeltVote)}
              className={`min-h-11 rounded-full px-3 text-xs font-bold ${
                mine === v.id ? "bg-aha text-black" : "border border-gray-700 text-muted"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      {summary && <p className="mt-1 text-xs text-muted">体感 {summary}</p>}
    </div>
  );
}
