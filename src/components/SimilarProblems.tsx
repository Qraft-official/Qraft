"use client";

import { isProblemUuid } from "@/lib/difficulty";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import Link from "next/link";

export function SimilarProblems({ post, visible }: { post: Post; visible: boolean }) {
  const { posts, lastAttempts, me } = useApp();
  if (!visible) return null;
  if (post.kind === "reply" || post.kind === "solution") return null;

  const solved = new Set(
    Object.entries(lastAttempts)
      .filter(([, a]) => a.submittedAt)
      .map(([id]) => id),
  );

  const candidates = posts.filter((p) => {
    if (p.id === post.id) return false;
    if (p.kind !== "problem" && p.kind !== "sprint") return false;
    if (p.authorId === me.id) return false;
    if (p.subject !== post.subject) return false;
    if (solved.has(p.id)) return false;
    const lv = p.difficultyLevel ?? 3;
    const mine = post.difficultyLevel ?? 3;
    if (Math.abs(lv - mine) > 1) return false;
    if (post.problemMode && p.problemMode && p.problemMode !== post.problemMode) return false;
    return true;
  });

  const pick = candidates[0];
  if (!pick) return null;

  return (
    <Link
      href={isProblemUuid(pick.id) ? `/p/${pick.id}` : "/"}
      className="mt-3 flex min-h-11 items-center justify-between rounded-xl border border-gray-800 px-3 py-2"
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold text-muted">似た問題をもう1問</span>
        <span className="block truncate text-sm font-bold">
          {pick.title?.trim() || pick.text.replace(/\s+/g, " ").slice(0, 48)}
        </span>
      </span>
      <span className="shrink-0 text-xs font-bold text-aha">開く</span>
    </Link>
  );
}
