"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { userIsVerified, verifiedBadgeTone } from "@/lib/verified";
import { postReactionScore, type WeeklyQrafter } from "@/lib/weekly";
import Link from "next/link";
import { useState } from "react";

function HelpButton({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="tap-target relative flex h-11 w-11 items-center justify-center"
        aria-label={`${title}の説明`}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-600 text-[10px] font-black text-muted">
          ?
        </span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 sm:items-center"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`weekly-help-${title}`}
            className="w-full max-w-sm rounded-t-3xl border border-gray-800 bg-[#15202b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id={`weekly-help-${title}`} className="text-sm font-black">
              {title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            <button
              type="button"
              className="mt-4 min-h-11 w-full rounded-full bg-aha text-sm font-black text-black"
              onClick={() => setOpen(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function RankMark({ rank }: { rank: number }) {
  const tone =
    rank === 1 ? "bg-aha text-black" : rank === 2 ? "bg-white/20 text-white" : "bg-orange-400/20 text-orange-200";
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${tone}`}
      aria-label={`${rank}位`}
    >
      {rank}
    </span>
  );
}

export function WeeklyBoards({
  qrafters,
  questions,
}: {
  qrafters: WeeklyQrafter[];
  questions: Post[];
}) {
  const { userOf } = useApp();
  const topQ = qrafters.slice(0, 3);
  const topP = questions.slice(0, 3);
  if (!topQ.length && !topP.length) return null;

  return (
    <div className="grid grid-cols-2 gap-2 border-b border-gray-800 px-3 py-2 sm:gap-3 sm:px-4">
      <section className="min-w-0">
        <div className="flex items-center gap-0.5">
          <h2 className="min-w-0 truncate text-[11px] font-black tracking-wide text-aha sm:text-xs">
            WeeklyQrafter
          </h2>
          <HelpButton
            title="WeeklyQrafter"
            body="今週、Qraftで特に注目されたQrafterのランキングです。その人の投稿へのいいね・Aha・エレガンス・リポスト・コメント・わからないなどのリアクションを合計して表示します。"
          />
        </div>
        <ol className="mt-1 space-y-1.5">
          {topQ.length === 0 ? (
            <li className="rounded-xl border border-gray-800 px-2 py-3 text-[11px] text-muted">まだありません</li>
          ) : (
            topQ.map((row, i) => (
              <li key={row.user.id}>
                <Link
                  href={`/u/${row.user.handle}`}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-800 bg-panel px-1.5 py-1.5 sm:gap-2 sm:px-2"
                >
                  <RankMark rank={i + 1} />
                  <UserAvatar user={row.user} className="h-7 w-7 shrink-0 text-xs sm:h-8 sm:w-8" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-0.5">
                      <span className="truncate text-[11px] font-bold sm:text-xs">{row.user.name}</span>
                      <VerifiedBadge
                        show={userIsVerified(row.user)}
                        tone={verifiedBadgeTone(row.user)}
                      />
                    </span>
                    <span className="block truncate text-[10px] text-muted">
                      @{row.user.handle} · 今週 {row.weeklyReactions}
                    </span>
                  </span>
                </Link>
              </li>
            ))
          )}
        </ol>
      </section>
      <section className="min-w-0">
        <div className="flex items-center gap-0.5">
          <h2 className="min-w-0 truncate text-[11px] font-black tracking-wide text-aha sm:text-xs">
            WeeklyQuestion
          </h2>
          <HelpButton
            title="WeeklyQuestion"
            body="今週、特に注目された問題のランキングです。いいね・Aha・エレガンス・リポスト・コメント・わからないなどのリアクションを合計して表示します。"
          />
        </div>
        <ol className="mt-1 space-y-1.5">
          {topP.length === 0 ? (
            <li className="rounded-xl border border-gray-800 px-2 py-3 text-[11px] text-muted">まだありません</li>
          ) : (
            topP.map((post, i) => {
              const author = userOf(post.authorId);
              const title =
                post.title?.trim() ||
                post.text.replace(/\s+/g, " ").replace(/^\*\*.+\*\*/, "").trim().slice(0, 36) ||
                "問題";
              return (
                <li key={post.id}>
                  <Link
                    href={`/p/${post.id}`}
                    className="flex min-h-11 items-center gap-1.5 rounded-xl border border-gray-800 bg-panel px-1.5 py-1.5 sm:px-2"
                  >
                    <RankMark rank={i + 1} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[11px] font-bold leading-snug sm:text-xs">{title}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-muted">
                        {author.name} · 今週 {Math.round(postReactionScore(post))}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })
          )}
        </ol>
      </section>
    </div>
  );
}
