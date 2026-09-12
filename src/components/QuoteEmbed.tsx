"use client";

import { LatexText } from "@/lib/latex";
import { isDisplayImageSrc } from "@/lib/problem-images";
import { useApp } from "@/lib/store";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
            {post.problemMode === "challenge"
              ? "Challenger"
              : post.problemMode === "aha"
                ? "Aha!"
                : "問題"}
          </span>
        )}
      </div>
      {post.title?.trim() ? (
        <p className="mt-1 truncate text-[13px] font-bold text-white">{post.title.trim()}</p>
      ) : null}
      <div className={`mt-1 min-w-0 ${compact ? "max-h-16 overflow-y-auto" : ""}`}>
        <LatexText text={compact ? snippet : post.text} className="text-[13px] text-[#c5cdd6]" />
      </div>
    </Link>
  );
}

/** Compact, collapsible problem statement for the expanded solve notebook. */
export function QuotedProblemPeek({ postId }: { postId: string }) {
  const { getPost } = useApp();
  const post = getPost(postId);
  const [open, setOpen] = useState(false);
  if (!post) {
    return (
      <p className="rounded-xl border border-gray-800 px-3 py-2 text-[11px] text-muted">
        引用元の問題は非公開、または削除されています。
      </p>
    );
  }
  const title = post.title?.trim() || "問題";
  const body = post.text?.trim() || "";
  const photo = isDisplayImageSrc(post.photo) ? post.photo : undefined;

  return (
    <div className="min-w-0 rounded-xl border border-gray-800 bg-black/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full min-w-0 items-center gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-white">{title}</span>
        <span className="shrink-0 text-[11px] font-bold text-aha">{open ? "閉じる" : "問題を見る"}</span>
        {open ? <ChevronUp size={16} className="shrink-0 text-muted" /> : <ChevronDown size={16} className="shrink-0 text-muted" />}
      </button>
      <div className={open ? "quoted-problem-peek-body max-h-[28vh] overflow-y-auto overscroll-contain px-3 pb-3" : "quoted-problem-peek-body max-h-[4.5rem] overflow-hidden px-3 pb-2"}>
        {body ? <LatexText text={body} className="text-[13px] leading-relaxed text-[#c5cdd6]" /> : null}
        {open && photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="mt-2 max-h-32 w-full rounded-lg object-contain" />
        ) : null}
      </div>
    </div>
  );
}
