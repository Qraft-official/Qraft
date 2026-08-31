"use client";

import { PREMIUM_REACTIONS, SUBJECT_LABEL, TIER_NAMES } from "@/lib/constants";
import { sharePost } from "@/lib/share";
import { LatexText } from "@/lib/latex";
import { avgStars, useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, MessageCircle, PenLine, Repeat2, Share2, Star, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CommentThread } from "./CommentThread";
import { NotePages } from "./NotePages";
import { QuoteEmbed } from "./QuoteEmbed";
import { StarRating } from "./StarRating";
import { UserAvatar } from "./UserAvatar";
import { VerifiedBadge } from "./VerifiedBadge";

function isTypedNotebook(post: Post) {
  if (post.solutionFormat === "typed") return true;
  if (post.solutionFormat === "handwriting") return false;
  return post.kind === "solution" && !post.pages?.length;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "今";
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間`;
  return `${Math.floor(h / 24)}日`;
}

export function PostCard({
  post,
  showRepostLabel,
}: {
  post: Post;
  showRepostLabel?: boolean;
}) {
  const {
    me,
    follows,
    likes,
    reposts,
    ratings,
    toggleFollow,
    toggleLike,
    toggleRepost,
    rate,
    openComposer,
    userOf,
    repliesTo,
    hasPremium,
    openPaywall,
    react,
    reactions,
    authorVerified,
  } = useApp();
  const author = userOf(post.authorId);
  const [rateOpen, setRateOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [shareToast, setShareToast] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const following = follows.includes(author.id);
  const liked = likes.includes(post.id);
  const reposted = reposts.includes(post.id);
  const isMe = author.id === me.id;
  const aha = ratings[post.id]?.aha ?? avgStars(post.ahaSum, post.ahaCount);
  const elegance =
    ratings[post.id]?.elegance ?? avgStars(post.eleganceSum, post.eleganceCount);
  const tier = author.tiers[post.subject];
  const quoted = post.kind === "solution" && post.problemId;
  const comments = repliesTo(post.id).filter((p) => p.kind === "reply");

  useEffect(() => {
    if (!repostOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setRepostOpen(false);
    };
    const t = window.setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onDoc);
    };
  }, [repostOpen]);

  const openComments = () => {
    setThreadOpen(true);
    setRepostOpen(false);
    openComposer({ open: true, mode: "reply", replyToId: post.id });
  };

  return (
    <article
      className={`border-b border-gray-800 px-4 py-3 ${
        post.kind === "solution" && authorVerified(author.id)
          ? "bg-gradient-to-r from-amber-500/5 to-transparent"
          : ""
      }`}
    >
      {showRepostLabel && (
        <p className="mb-1 flex items-center gap-1 pl-12 text-xs font-bold text-muted">
          <Repeat2 size={12} className="text-emerald-400" />
          {me.name}がリポスト
        </p>
      )}
      <div className="flex gap-3">
        <Link href={`/u/${author.handle}`}>
          <UserAvatar user={author} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-1.5 text-[15px]">
                <Link href={`/u/${author.handle}`} className="truncate font-bold text-white">
                  {author.name}
                </Link>
                <VerifiedBadge show={authorVerified(author.id)} />
                <span className="truncate text-muted">@{author.handle}</span>
                <span className="text-muted">· {timeAgo(post.createdAt)}</span>
              </div>
              {author.school && (
                <p className="truncate text-[11px] text-muted">{author.school}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                  {SUBJECT_LABEL[post.subject]} {tier} · {TIER_NAMES[post.subject][tier]}
                </span>
                {post.kind === "problem" && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted">
                    オリジナル問題
                    {post.solutionFormat === "typed"
                      ? " · 打ち込み"
                      : post.solutionFormat === "handwriting" || post.pages?.some((p) => p.image)
                        ? " · 手書き"
                        : ""}
                  </span>
                )}
                {post.kind === "solution" && (
                  <span className="rounded-full bg-aha/10 px-2 py-0.5 text-[10px] text-aha">
                    {quoted ? "引用解法" : "解法"}
                    {isTypedNotebook(post) ? " · 打ち込み" : post.pages?.length ? " · 手書き" : ""}
                  </span>
                )}
                {post.kind === "sprint" && (
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-300">
                    PULSE
                  </span>
                )}
              </div>
            </div>
            {!isMe && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => toggleFollow(author.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  following ? "border border-gray-700 text-white" : "bg-white text-black"
                }`}
              >
                {following ? "フォロー中" : "フォロー"}
              </motion.button>
            )}
          </div>

          {!(post.kind === "solution" && isTypedNotebook(post)) && (
            <Link href={`/p/${post.id}`} className="mt-2 block">
              <LatexText text={post.text} className="text-[15px] text-[#e7e9ea]" />
            </Link>
          )}

          {quoted && <QuoteEmbed postId={post.problemId!} />}

          {post.kind === "solution" && isTypedNotebook(post) && !post.pages?.length && (
            <Link href={`/p/${post.id}`} className="mt-3 block">
              <div
                className={`paper-grid rounded-2xl border bg-[#0b1220] p-3 ${
                  authorVerified(author.id)
                    ? "border-amber-400/60 shadow-[0_0_24px_rgba(251,191,36,0.18)]"
                    : "border-gray-800"
                }`}
              >
                <p className="mb-1 text-[10px] font-bold text-muted">打ち込み式</p>
                <LatexText text={post.text} className="text-[15px] text-[#e7e9ea]" />
              </div>
            </Link>
          )}

          {post.photo && !post.pages?.some((p) => p.image) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.photo}
              alt=""
              className="mt-3 max-h-64 w-full rounded-2xl border border-gray-800 object-cover"
            />
          )}

          {post.pages && post.pages.length > 0 && (
            <div
              className={
                authorVerified(author.id)
                  ? "mt-2 rounded-2xl border border-amber-400/50 p-1 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                  : ""
              }
            >
              <NotePages pages={post.pages} />
            </div>
          )}

          <div className="mt-3 flex max-w-md items-center justify-between text-muted">
            <button
              type="button"
              onClick={openComments}
              className={`flex items-center gap-1 text-xs hover:text-sky-400 ${threadOpen ? "text-sky-400" : ""}`}
              aria-label="コメント"
            >
              <MessageCircle size={16} /> {comments.length}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setRepostOpen((v) => !v)}
                className={`flex items-center gap-1 text-xs ${reposted ? "text-emerald-400" : "hover:text-emerald-400"}`}
                aria-label="リポスト"
                aria-expanded={repostOpen}
              >
                <Repeat2 size={16} /> {post.repostCount + (reposted ? 1 : 0)}
              </button>
              <AnimatePresence>
                {repostOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-700 bg-[#15202b] shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        toggleRepost(post.id);
                        setRepostOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5"
                    >
                      {reposted ? (
                        <Undo2 size={18} className="text-emerald-400" />
                      ) : (
                        <Repeat2 size={18} />
                      )}
                      <span className="font-bold">
                        {reposted ? "リポストを取り消す" : "リポスト"}
                      </span>
                    </button>
                    {(post.kind === "problem" || post.kind === "sprint") && (
                      <button
                        type="button"
                        onClick={() => {
                          setRepostOpen(false);
                          openComposer({
                            open: true,
                            mode: "solution",
                            quotePostId: post.id,
                          });
                        }}
                        className="flex w-full items-center gap-3 border-t border-gray-800 px-4 py-3 text-left text-sm hover:bg-white/5"
                      >
                        <PenLine size={18} className="text-aha" />
                        <span>
                          <span className="block font-bold text-aha">引用して解法を投稿</span>
                          <span className="text-[11px] text-muted">この問題を引用して解法を書く</span>
                        </span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {hasPremium ? (
              <div className="flex items-center gap-0.5">
                {PREMIUM_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(post.id, emoji)}
                    className={`text-sm ${reactions[post.id] === emoji ? "scale-125" : "opacity-70"}`}
                    aria-label={`リアクション ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  openPaywall("特別リアクションは Qraft Premium（月額¥300）限定です。")
                }
                className="text-[11px] text-muted"
              >
                😂+
              </button>
            )}

            <motion.button
              whileTap={{ scale: 1.3 }}
              onClick={() => toggleLike(post.id)}
              className={`flex items-center gap-1 text-xs ${liked ? "text-purple-400" : "hover:text-purple-400"}`}
            >
              <Brain size={16} fill={liked ? "#A855F7" : "none"} />
              {post.likeCount + (liked ? 1 : 0)}
              <span className="hidden sm:inline">脳汁</span>
            </motion.button>
            <button
              onClick={() => setRateOpen((v) => !v)}
              className="flex items-center gap-1 text-xs hover:text-aha"
            >
              <Star size={16} />
              {post.kind === "solution" ? elegance || "—" : aha || "—"}
            </button>
            {(post.kind === "problem" || post.kind === "sprint") && (
              <button
                type="button"
                onClick={() => {
                  void sharePost({ id: post.id, text: post.text }).then((res) => {
                    if (res.ok && res.method === "copy") {
                      setShareToast("リンクをコピーしました！");
                      window.setTimeout(() => setShareToast(""), 2200);
                    }
                  });
                }}
                className="flex items-center gap-1 text-xs hover:text-aha"
                aria-label="共有"
              >
                <Share2 size={16} />
              </button>
            )}
          </div>

          {shareToast && (
            <p className="mt-2 rounded-full bg-aha/15 px-3 py-1 text-center text-[11px] font-bold text-aha">
              {shareToast}
            </p>
          )}

          {rateOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-2xl border border-gray-800 bg-panel p-3"
            >
              {post.kind === "solution" ? (
                <StarRating
                  label="エレガント度 (Elegance Level)"
                  value={ratings[post.id]?.elegance ?? 0}
                  onChange={(n) => rate(post.id, "elegance", n)}
                  accent="lime"
                />
              ) : (
                <StarRating
                  label="Qraft レベル"
                  value={ratings[post.id]?.aha ?? 0}
                  onChange={(n) => rate(post.id, "aha", n)}
                  accent="purple"
                />
              )}
            </motion.div>
          )}

          {threadOpen && (
            <div className="mt-3 border-t border-gray-800 pt-2">
              <p className="text-[11px] font-bold text-muted">コメント</p>
              <CommentThread comments={comments} compact />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
