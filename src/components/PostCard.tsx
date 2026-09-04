"use client";

import { confirmDialog, promptDialog } from "@/lib/app-dialog";
import { PREMIUM_PRICE_JPY, PREMIUM_REACTIONS, SUBJECT_LABEL, TIER_NAMES } from "@/lib/constants";
import { difficultyLabel } from "@/lib/difficulty";
import { isActivePromotion } from "@/lib/recommend";
import { referralFetch } from "@/lib/referral-client";
import { sharePost } from "@/lib/share";
import { renderShareCard, shareCardImage } from "@/lib/share-card";
import { isDisplayImageSrc } from "@/lib/problem-images";
import { LatexText } from "@/lib/latex";
import { avgStars, useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { verifiedBadgeTone } from "@/lib/verified";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Flag,
  Megaphone,
  MessageCircle,
  MoreVertical,
  Pencil,
  PenLine,
  Quote,
  Repeat2,
  Share2,
  Star,
  Trash2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CommentThread } from "./CommentThread";
import { EditProblemModal } from "./EditProblemModal";
import { NotePages } from "./NotePages";
import { QuoteEmbed } from "./QuoteEmbed";
import { StarRating } from "./StarRating";
import { UserAvatar } from "./UserAvatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { SaveProblemButton } from "./SaveProblemButton";
import { SpoilerReveal } from "./SpoilerReveal";
import { FeltDifficulty } from "./FeltDifficulty";
import { AttemptTime } from "./RevengeBanner";
import { SimilarProblems } from "./SimilarProblems";
import { SeriesAssignSheet, SeriesNav } from "./SeriesNav";

function isTypedNotebook(post: Post) {
  if (post.solutionFormat === "typed") return true;
  if (post.solutionFormat === "handwriting") return false;
  return post.kind === "solution" && !post.pages?.length;
}

function cardMeta(post: Post) {
  const title = post.title?.trim() ?? "";
  const memo = post.solution?.trim() ?? "";
  let body = post.text ?? "";
  if (title) {
    const prefix = `**${title}**\n\n`;
    if (body.startsWith(prefix)) body = body.slice(prefix.length);
    if (body.trim() === title) body = "";
  }
  if (body.trim() === "手書きの問題") body = "";
  return { title, memo, body };
}

function typedNotebookPages(post: Post) {
  const pages = post.pages;
  if (pages?.some((p) => Boolean(isDisplayImageSrc(p.image)) || Boolean(p.latex?.trim()))) {
    return pages;
  }
  const { body } = cardMeta(post);
  const latex = body.trim() || (!post.title?.trim() ? post.text.trim() : "");
  if (latex) {
    return [{ id: `${post.id}-typed`, latex, doodle: 0 }];
  }
  return [];
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
    toggleConfused,
    confusedMine,
    authorVerified,
    deleteProblem,
    promoteProblem,
    sprintUnlocked,
    lastAttempts,
  } = useApp();
  const author = userOf(post.authorId);
  const [rateOpen, setRateOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [shareToast, setShareToast] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [menuMsg, setMenuMsg] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const following = follows.includes(author.id);
  const liked = likes.includes(post.id);
  const reposted = reposts.includes(post.id);
  const isMe = author.id === me.id;
  const elegance =
    ratings[post.id]?.elegance ?? avgStars(post.eleganceSum, post.eleganceCount);
  const tier = author.tiers[post.subject];
  const quoted = post.kind === "solution" && post.problemId;
  const comments = repliesTo(post.id).filter((p) => p.kind === "reply");
  const typed = isTypedNotebook(post);
  const typedPages = typed ? typedNotebookPages(post) : [];
  const meta = cardMeta(post);
  const showCaption = !typed && Boolean(meta.body.trim());
  const pulseLocked = post.kind === "sprint" && !sprintUnlocked && !isMe;
  const lastAttempt = lastAttempts[post.id];

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

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    };
    const t = window.setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onDoc);
    };
  }, [moreOpen]);

  const openComments = () => {
    setThreadOpen(true);
    setRepostOpen(false);
    openComposer({ open: true, mode: "reply", replyToId: post.id });
  };

  return (
    <article
      className={`border-b border-gray-800 px-4 py-2.5 ${
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
                <VerifiedBadge show={authorVerified(author.id)} tone={verifiedBadgeTone(author)} />
                <span className="truncate text-muted">@{author.handle}</span>
                <span className="text-muted">· {timeAgo(post.createdAt)}</span>
              </div>
              {author.school && (
              <p className="truncate text-xs text-muted">{author.school}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
                  {SUBJECT_LABEL[post.subject]} {tier} · {TIER_NAMES[post.subject][tier]}
                </span>
                {post.kind === "problem" && post.problemMode === "challenge" && (
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-300">
                    Challenger
                  </span>
                )}
                {post.kind === "problem" && post.problemMode === "aha" && (
                  <span className="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-bold text-lime-400">
                    Aha!
                  </span>
                )}
                {post.kind === "problem" && post.problemMode !== "challenge" && post.problemMode !== "aha" && (
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300">
                    教えてQrafter!
                  </span>
                )}
                {post.kind === "problem" && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-muted">
                    オリジナル問題
                    {post.solutionFormat === "typed"
                      ? " · 打ち込み"
                      : post.solutionFormat === "handwriting" ||
                          post.pages?.some((p) => isDisplayImageSrc(p.image))
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
                {post.kind === "solution" && post.challengeGrade === "correct" && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    Correct
                  </span>
                )}
                {post.kind === "solution" && post.challengeGrade === "incorrect" && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    Incorrect
                  </span>
                )}
                {post.kind === "sprint" && (
                  <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-300">
                    PULSE
                  </span>
                )}
                {(post.kind === "problem" || post.kind === "sprint") && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-muted">
                    Lv{post.difficultyLevel ?? 3} {difficultyLabel(post.difficultyLevel ?? 3)}
                  </span>
                )}
                {post.isHardSpotlight && (
                  <span className="rounded-full bg-aha/15 px-2 py-0.5 text-[10px] font-bold text-aha">
                    難問
                  </span>
                )}
                {isActivePromotion(post) && (
                  <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    プロモーション
                  </span>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!isMe && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => toggleFollow(author.id)}
                className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-bold ${
                  following ? "border border-gray-700 text-white" : "bg-white text-black"
                }`}
              >
                {following ? "フォロー中" : "フォロー"}
              </motion.button>
            )}
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="tap-target flex items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-white"
                  aria-label="その他"
                  aria-expanded={moreOpen}
                >
                  <MoreVertical size={18} />
                </button>
                <AnimatePresence>
                  {moreOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-gray-800 bg-black shadow-xl"
                    >
                      {isMe ? (
                        <>
                          {(post.kind === "problem" || post.kind === "sprint") && (
                            <button
                              type="button"
                              onClick={() => {
                                setMoreOpen(false);
                                setEditOpen(true);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                            >
                              <Pencil size={16} /> 編集
                            </button>
                          )}
                          {post.kind === "problem" && (
                            <button
                              type="button"
                              onClick={() => {
                                setMoreOpen(false);
                                setSeriesOpen(true);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                            >
                              シリーズに追加
                            </button>
                          )}
                          {(post.kind === "problem" || post.kind === "sprint") && (
                            <button
                              type="button"
                              onClick={() => {
                                setMoreOpen(false);
                                if (!hasPremium) {
                                  openPaywall(
                                    `プロモーションは Qraft Premium（月額¥${PREMIUM_PRICE_JPY}）限定です。`,
                                  );
                                  return;
                                }
                                setPromoOpen(true);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                            >
                              <Megaphone size={16} className="text-amber-300" /> プロモーション設定
                            </button>
                          )}
                          {(post.kind === "problem" || post.kind === "sprint") && (
                          <button
                            type="button"
                            disabled={menuBusy}
                            onClick={() => {
                              setMoreOpen(false);
                              void confirmDialog({
                                title: "投稿を削除しますか？",
                                message: "この操作は取り消せません。",
                                confirmLabel: "削除",
                                cancelLabel: "キャンセル",
                                destructive: true,
                              }).then((ok) => {
                                if (!ok) return;
                                setMenuBusy(true);
                                void deleteProblem(post.id).then((res) => {
                                  setMenuBusy(false);
                                  if (res.error) setMenuMsg(res.error);
                                });
                              });
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-400 hover:bg-white/5"
                          >
                            <Trash2 size={16} /> 削除
                          </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={menuBusy}
                          onClick={() => {
                            setMoreOpen(false);
                            void promptDialog({
                              title: "投稿を報告",
                              message: "報告理由を入力してください（任意）",
                              placeholder: "例: 不適切な内容",
                              confirmLabel: "報告する",
                            }).then((reason) => {
                              if (reason == null) return;
                              setMenuBusy(true);
                              void referralFetch("/api/feedback", {
                                method: "POST",
                                body: JSON.stringify({
                                  category: "投稿報告",
                                  subject: `投稿の報告 ${post.id}`,
                                  message: [
                                    `投稿ID: ${post.id}`,
                                    `投稿者: ${author.name} @${author.handle}`,
                                    `理由: ${reason.trim() || "（未記入）"}`,
                                    "",
                                    post.text.slice(0, 500),
                                  ].join("\n"),
                                  name: me.name,
                                  handle: me.handle,
                                }),
                              }).then((res) => {
                                setMenuBusy(false);
                                setMenuMsg(res.error || "報告を受け付けました");
                                window.setTimeout(() => setMenuMsg(""), 2500);
                              });
                            });
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                        >
                          <Flag size={16} /> この投稿を報告
                        </button>
                      )}
                      {(post.kind === "problem" || post.kind === "sprint") && (
                        <button
                          type="button"
                          onClick={() => {
                            setMoreOpen(false);
                            void (async () => {
                              const blob = await renderShareCard(post, author.handle);
                              if (!blob) return;
                              const url = `${window.location.origin}/p/${post.id}`;
                              const res = await shareCardImage(blob, url);
                              if (res.ok && res.method === "download") {
                                setShareToast("画像を保存し、リンクをコピーしました");
                                window.setTimeout(() => setShareToast(""), 2200);
                              }
                            })();
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-white/5"
                        >
                          <Share2 size={16} /> 共有画像
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {(meta.title) && (
            <div className="mt-2 flex max-w-full flex-col gap-1">
              <Link
                href={`/p/${post.id}`}
                className="max-w-full text-lg font-bold leading-snug text-white [overflow-wrap:anywhere] [word-break:break-word]"
              >
                {meta.title}
              </Link>
            </div>
          )}

          {showCaption && (
            <Link href={`/p/${post.id}`} className="mt-2 block max-w-full">
              <LatexText text={meta.body} className="max-w-full text-[15px] text-[#e7e9ea]" />
            </Link>
          )}

          {quoted && <QuoteEmbed postId={post.problemId!} />}

          {post.kind === "solution" && post.challengeGrade && (
            <p
              className={`mt-2 rounded-xl px-3 py-2 text-xs font-bold ${
                post.challengeGrade === "correct"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-red-500/15 text-red-300"
              }`}
            >
              {post.challengeGrade === "correct" ? "Correct（正解）" : "Incorrect（不正解）"}
              {post.solverAnswer ? ` · あなたの答え: ${post.solverAnswer}` : ""}
            </p>
          )}

          {isMe && post.problemMode === "challenge" && post.correctAnswer != null && post.correctAnswer !== "" && (
            <p className="mt-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-100">
              設定した正解: {post.correctAnswer}
              <span className="mt-0.5 block text-[10px] text-orange-200/70">※単位は書かなくていいです</span>
            </p>
          )}

          {typed && typedPages.length > 0 && (
            <div
              className={
                authorVerified(author.id)
                  ? "mt-2 max-w-full rounded-2xl border border-amber-400/50 p-1 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                  : "max-w-full"
              }
            >
              <NotePages pages={typedPages} />
            </div>
          )}

          {post.photo && isDisplayImageSrc(post.photo) && !post.pages?.some((p) => isDisplayImageSrc(p.image)) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.photo}
              alt=""
              className="mt-3 h-auto w-full rounded-2xl border border-gray-800 object-contain"
            />
          )}

          {!typed && post.pages && post.pages.length > 0 && (
            <div
              className={
                authorVerified(author.id)
                  ? "mt-2 max-w-full rounded-2xl border border-amber-400/50 p-1 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                  : "max-w-full"
              }
            >
              <NotePages pages={post.pages} />
            </div>
          )}

          {(post.kind === "problem" || post.kind === "sprint") && (
            <>
              <SeriesNav post={post} />
              <SpoilerReveal
                post={post}
                locked={pulseLocked}
                isAuthor={isMe}
                onRevealed={() => setRevealed(true)}
              />
              {(revealed || lastAttempt?.submittedAt || isMe) && !pulseLocked ? (
                <>
                  <FeltDifficulty post={post} />
                  <AttemptTime post={post} />
                  <SimilarProblems post={post} visible={Boolean(revealed || lastAttempt?.submittedAt)} />
                </>
              ) : null}
            </>
          )}

          {(post.kind === "problem" || post.kind === "sprint") && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-white/45">
              <span>解答 {post.gradeN ?? 0}</span>
              {(post.gradeN ?? 0) > 0 && (
                <span>
                  正答 {Math.round(((post.gradeCorrect ?? 0) / (post.gradeN ?? 1)) * 100)}%
                </span>
              )}
              {post.repostCount + (reposted ? 1 : 0) > 0 && (
                <span>リポスト {post.repostCount + (reposted ? 1 : 0)}</span>
              )}
            </div>
          )}

          <div className="mt-1 flex max-w-md items-center justify-between gap-0.5 text-muted">
            <button
              type="button"
              onClick={openComments}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-0.5 px-0.5 text-[11px] hover:text-sky-400 ${threadOpen ? "text-sky-400" : ""}`}
              aria-label="コメント"
            >
              <MessageCircle size={16} /> {comments.length}
            </button>

            <div className="relative flex min-w-0 flex-1 justify-center" ref={menuRef}>
              <button
                type="button"
                onClick={() => setRepostOpen((v) => !v)}
                className={`flex min-h-11 min-w-11 items-center justify-center ${reposted ? "text-emerald-400" : "hover:text-emerald-400"}`}
                aria-label="引用・リポスト"
                aria-expanded={repostOpen}
              >
                <Quote size={16} />
              </button>
              <AnimatePresence>
                {repostOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-700 bg-[#15202b] shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
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

            {(post.kind === "problem" || post.kind === "sprint") && (
              <button
                type="button"
                onClick={() => void toggleConfused(post.id)}
                className={`flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-full text-[13px] font-black ${
                  confusedMine[post.id] ? "bg-aha/20 text-aha" : "hover:text-white"
                }`}
                aria-label="わからない"
                aria-pressed={!!confusedMine[post.id]}
              >
                ?{(post.confusedCount ?? 0) > 0 ? (
                  <span className="ml-0.5 text-[10px] font-bold">{post.confusedCount}</span>
                ) : null}
              </button>
            )}

            <motion.button
              whileTap={{ scale: 1.08 }}
              onClick={() => toggleLike(post.id)}
              className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-0.5 px-0.5 text-[11px] ${liked ? "text-purple-400" : "hover:text-purple-400"}`}
              aria-label="Aha"
              aria-pressed={liked}
            >
              <Brain size={16} fill={liked ? "#A855F7" : "none"} />
              {post.likeCount + (liked ? 1 : 0)}
            </motion.button>

            {hasPremium ? (
              <span className="flex min-w-0 shrink items-center justify-center gap-0">
                {PREMIUM_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(post.id, emoji)}
                    className={`flex h-11 w-8 items-center justify-center text-sm ${reactions[post.id] === emoji ? "scale-125" : "opacity-70"}`}
                    aria-label={`リアクション ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </span>
            ) : (
              <button
                type="button"
                onClick={() =>
                  openPaywall("特別リアクションは Qraft Premium（月額¥400）限定です。")
                }
                className="flex min-h-11 min-w-0 flex-1 items-center justify-center px-0.5 text-[11px] text-muted"
              >
                😂+
              </button>
            )}

            {post.kind === "solution" && (
              <button
                type="button"
                onClick={() => setRateOpen((v) => !v)}
                className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-0.5 px-0.5 text-[11px] hover:text-aha"
                aria-label="エレガント度"
              >
                <Star size={16} />
                {elegance || "—"}
              </button>
            )}

            <div className="flex min-w-0 flex-1 justify-center">
              <SaveProblemButton
                problemId={
                  post.kind === "solution" && post.problemId ? post.problemId : post.id
                }
              />
            </div>

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
              className="flex min-h-11 min-w-0 flex-1 items-center justify-center px-0.5 text-[11px] hover:text-aha"
              aria-label="共有"
            >
              <Share2 size={16} />
            </button>
          </div>

          {shareToast && (
            <p className="mt-2 rounded-full bg-aha/15 px-3 py-1 text-center text-[11px] font-bold text-aha">
              {shareToast}
            </p>
          )}

          {rateOpen && post.kind === "solution" && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-2xl border border-gray-800 bg-panel p-3"
            >
              <StarRating
                label="エレガント度 (Elegance Level)"
                value={ratings[post.id]?.elegance ?? 0}
                onChange={(n) => rate(post.id, "elegance", n)}
                accent="lime"
              />
            </motion.div>
          )}

          {threadOpen && (
            <div className="mt-3 border-t border-gray-800 pt-2">
              <p className="text-[11px] font-bold text-muted">コメント</p>
              <CommentThread comments={comments} compact parentAuthorId={post.authorId} />
            </div>
          )}
        </div>
      </div>
      <EditProblemModal post={post} open={editOpen} onClose={() => setEditOpen(false)} />
      <SeriesAssignSheet post={post} open={seriesOpen} onClose={() => setSeriesOpen(false)} />
      {promoOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPromoOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-800 bg-black p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold">プロモーション設定</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              プレミアム会員は月に1件まで、おすすめタイムラインで優先表示できます。この投稿を今月のプロモーションに設定しますか？
            </p>
            {menuMsg && <p className="mt-2 text-xs text-amber-300">{menuMsg}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPromoOpen(false)}
                className="flex-1 min-h-11 rounded-full border border-gray-700 text-sm font-bold"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={menuBusy}
                onClick={() => {
                  setMenuBusy(true);
                  setMenuMsg("");
                  void promoteProblem(post.id).then((res) => {
                    setMenuBusy(false);
                    if (res.error) {
                      setMenuMsg(res.error);
                      return;
                    }
                    setPromoOpen(false);
                  });
                }}
                className="flex-1 min-h-11 rounded-full bg-aha text-sm font-bold text-black"
              >
                {menuBusy ? "設定中…" : "設定する"}
              </button>
            </div>
          </div>
        </div>
      )}
      {menuMsg && !promoOpen && (
        <p className="px-4 pb-2 text-center text-[11px] text-aha">{menuMsg}</p>
      )}
    </article>
  );
}
