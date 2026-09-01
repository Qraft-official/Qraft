"use client";

import { LatexText } from "@/lib/latex";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { UserAvatar } from "./UserAvatar";

export function QuoteEmbed({ postId, compact }: { postId: string; compact?: boolean }) {
  const { getPost, userOf } = useApp();
  const post = getPost(postId);
  if (!post) {
    return (
      <div className="mt-3 rounded-2xl border border-gray-800 px-3 py-2 text-xs text-muted">
        引用元の問題は非公開、または削除されています。
      </div>
    );
  }
  const author = userOf(post.authorId);
  const snippet = post.text.length > 180 ? `${post.text.slice(0, 180)}…` : post.text;
  return (
    <Link
      href={`/p/${post.id}`}
      className={`${compact ? "mt-1 overflow-hidden p-2" : "mt-3 p-3"} block rounded-2xl border border-gray-800 bg-black/40 hover:bg-white/[0.03]`}
    >
      <div className="flex items-center gap-2">
        <UserAvatar user={author} className="h-6 w-6 text-xs" />
        <span className="truncate text-xs font-bold text-white">{author.name}</span>
        <span className="truncate text-xs text-muted">@{author.handle}</span>
        {post.kind === "problem" && (
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-muted">
            {post.problemMode === "challenge" ? "Challenger" : "問題"}
          </span>
        )}
      </div>
      <div className={`mt-1 ${compact ? "max-h-16 overflow-y-auto" : ""}`}>
        <LatexText text={compact ? snippet : post.text} className="text-[13px] text-[#c5cdd6]" />
      </div>
    </Link>
  );
}
