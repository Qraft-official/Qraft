"use client";

import { formatDuration } from "@/lib/learn";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import Link from "next/link";

export function RevengeBanner() {
  const { revengeDue, getPost } = useApp();
  const item = revengeDue[0];
  if (!item) return null;
  const post = getPost(item.problemId);
  const title = post?.title?.trim() || post?.text.replace(/\s+/g, " ").slice(0, 40) || "間違えた問題";
  return (
    <Link
      href={`/p/${item.problemId}`}
      className="mx-4 mt-2 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-gray-800 bg-panel px-3 py-2"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">リベンジ</span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          数日前に間違えた問題、もう一度解く？ · {title}
        </span>
      </span>
      <span className="shrink-0 text-xs font-bold text-aha">解く</span>
    </Link>
  );
}

export function AttemptTime({ post }: { post: Post }) {
  const { lastAttempts, me } = useApp();
  if (post.authorId === me.id) return null;
  const mine = lastAttempts[post.id];
  const avg = post.durationN ? Math.round((post.durationSum ?? 0) / post.durationN) : null;
  const you = formatDuration(mine?.durationSeconds);
  const avgLabel = formatDuration(avg);
  if (!you && !avgLabel) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      {you ? `あなた: ${you}` : null}
      {you && avgLabel ? " · " : null}
      {avgLabel ? `平均: ${avgLabel}` : null}
    </p>
  );
}
