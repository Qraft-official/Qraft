"use client";

import { PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SUBJECTS } from "@/lib/constants";
import { DIFFICULTY_LEVELS } from "@/lib/difficulty";
import { avgStars, useApp } from "@/lib/store";
import type { HallMode, Post, Subject, Tier, User } from "@/lib/types";
import { userIsVerified } from "@/lib/verified";
import { computeWeeklyRankings, fetchWeeklyReactionBoosts, type WeeklyQrafter } from "@/lib/weekly";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PrimaryTab = "posts" | "users" | "hall" | Subject;
type RankingType = "question" | "qrafter";

const PRIMARY_TABS: { id: PrimaryTab; label: string }[] = [
  { id: "posts", label: "投稿" },
  { id: "users", label: "ユーザー" },
  { id: "hall", label: "殿堂入り" },
  ...SUBJECTS.map((s) => ({ id: s.id as PrimaryTab, label: s.label })),
];

export default function DiscoverPage() {
  const { posts, users, me, follows, toggleFollow, searchUsers, userOf } = useApp();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<PrimaryTab>("posts");
  const [difficulty, setDifficulty] = useState<Tier | "all">("all");
  const [mode, setMode] = useState<HallMode>("problems");
  const [rankingType, setRankingType] = useState<RankingType>("question");
  const [weeklyBoost, setWeeklyBoost] = useState<{
    byProblem: Record<string, number>;
    byAuthor: Record<string, number>;
  }>({ byProblem: {}, byAuthor: {} });

  const subject: Subject | "all" =
    tab === "math" || tab === "physics" || tab === "chemistry" ? tab : "all";
  const showUsers = tab === "users";
  const searching = q.trim().length > 0;
  const showWeekly = !showUsers && tab !== "hall" && !searching;
  const showHall = tab === "hall" || (tab !== "users" && searching);

  useEffect(() => {
    if (!showUsers) return;
    const t = window.setTimeout(() => {
      void searchUsers(q);
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, showUsers, searchUsers]);

  useEffect(() => {
    void fetchWeeklyReactionBoosts().then(setWeeklyBoost);
  }, []);

  const weeklyPool = useMemo(() => {
    let list = posts.filter((p) => p.kind !== "sprint" && p.kind !== "reply");
    if (subject !== "all") list = list.filter((p) => p.subject === subject);
    if (difficulty !== "all") {
      list = list.filter(
        (p) => p.kind !== "problem" || (p.difficultyLevel ?? 3) === difficulty,
      );
    }
    return list;
  }, [posts, subject, difficulty]);

  const weekly = useMemo(
    () =>
      computeWeeklyRankings(
        weeklyPool,
        userOf,
        weeklyBoost.byProblem,
        weeklyBoost.byAuthor,
      ),
    [weeklyPool, userOf, weeklyBoost],
  );

  const hallList = useMemo(() => {
    let list = posts.filter((p) => p.kind !== "sprint" && p.kind !== "reply");
    if (subject !== "all") list = list.filter((p) => p.subject === subject);
    if (difficulty !== "all") {
      list = list.filter(
        (p) => p.kind !== "problem" || (p.difficultyLevel ?? 3) === difficulty,
      );
    }
    if (searching) {
      const n = q.toLowerCase();
      list = list.filter((p) => p.text.toLowerCase().includes(n));
    }
    if (mode === "problems") {
      return list
        .filter((p) => p.kind === "problem")
        .sort(
          (a, b) =>
            avgStars(b.ahaSum, b.ahaCount) - avgStars(a.ahaSum, a.ahaCount),
        );
    }
    return list
      .filter((p) => p.kind === "solution")
      .sort(
        (a, b) =>
          avgStars(b.eleganceSum, b.eleganceCount) -
          avgStars(a.eleganceSum, a.eleganceCount),
      );
  }, [posts, q, searching, subject, difficulty, mode]);

  const matchedUsers = useMemo(() => {
    const n = q.trim().toLowerCase().replace(/^@/, "");
    const seen = new Set<string>();
    const out: User[] = [];
    for (const u of users) {
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      if (!n) continue;
      if (
        u.name.toLowerCase().includes(n) ||
        u.handle.toLowerCase().includes(n)
      ) {
        out.push(u);
      }
    }
    return out;
  }, [users, q, me.id]);

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-black/80 backdrop-blur">
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 rounded-full bg-[#202327] px-4 py-2.5">
            <Search size={16} className="shrink-0 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={showUsers ? "ユーザーを検索" : "投稿を検索"}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            />
          </div>
        </div>
        <nav className="mt-1 flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRIMARY_TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative shrink-0 px-4 py-3 text-[15px] font-bold ${
                  active ? "text-white" : "text-muted"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-1 rounded-full bg-aha" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {showUsers && (
        <div className="divide-y divide-gray-800">
          {matchedUsers.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              {q.trim() ? "一致するユーザーが見つかりません" : "ユーザーを検索してください"}
            </p>
          ) : (
            matchedUsers.map((u) => (
              <UserResultCard
                key={u.id}
                user={u}
                isMe={u.id === me.id}
                following={follows.includes(u.id)}
                onFollow={() => toggleFollow(u.id)}
              />
            ))
          )}
        </div>
      )}

      {!showUsers && (
        <>
          <div className="flex gap-1 overflow-x-auto border-b border-gray-800 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TextTab
              active={difficulty === "all"}
              onClick={() => setDifficulty("all")}
            >
              すべて
            </TextTab>
            {DIFFICULTY_LEVELS.map((d) => (
              <TextTab
                key={d.id}
                active={difficulty === d.id}
                onClick={() => setDifficulty(d.id)}
              >
                {d.label}
              </TextTab>
            ))}
          </div>

          {showWeekly && (
            <WeeklyRankingFeed
              rankingType={rankingType}
              onRankingType={setRankingType}
              questions={weekly.weeklyQuestions}
              qrafters={weekly.weeklyQrafters}
              meId={me.id}
              follows={follows}
              onFollow={toggleFollow}
            />
          )}

          {showHall && (
            <HallFeed
              searching={searching}
              mode={mode}
              onMode={setMode}
              posts={hallList}
            />
          )}
        </>
      )}
    </div>
  );
}

function WeeklyRankingFeed({
  rankingType,
  onRankingType,
  questions,
  qrafters,
  meId,
  follows,
  onFollow,
}: {
  rankingType: RankingType;
  onRankingType: (v: RankingType) => void;
  questions: Post[];
  qrafters: WeeklyQrafter[];
  meId: string;
  follows: string[];
  onFollow: (userId: string) => void;
}) {
  return (
    <div>
      <div className="my-1 flex border-b border-slate-800">
        <button
          type="button"
          onClick={() => onRankingType("question")}
          className={`flex-1 py-2.5 text-center text-sm font-bold ${
            rankingType === "question"
              ? "border-b-2 border-lime-400 text-lime-400"
              : "border-b-2 border-transparent text-slate-400"
          }`}
        >
          🔥 Weekly Question
        </button>
        <button
          type="button"
          onClick={() => onRankingType("qrafter")}
          className={`flex-1 py-2.5 text-center text-sm font-bold ${
            rankingType === "qrafter"
              ? "border-b-2 border-lime-400 text-lime-400"
              : "border-b-2 border-transparent text-slate-400"
          }`}
        >
          👑 Weekly Qrafter
        </button>
      </div>
      <p className="px-4 py-2 text-[11px] text-slate-400">集計期間: 直近7日間</p>

      {rankingType === "question" ? (
        questions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted">今週の名問はまだありません。</p>
        ) : (
          questions.map((post, i) => (
            <div key={post.id} className="relative">
              <RankBadge rank={i + 1} />
              <PostCard post={post} />
            </div>
          ))
        )
      ) : qrafters.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          今週のリアクション集計はまだありません。
        </p>
      ) : (
        <div className="divide-y divide-gray-800">
          {qrafters.map((row, i) => (
            <QrafterRankRow
              key={row.user.id}
              rank={i + 1}
              user={row.user}
              weeklyReactions={row.weeklyReactions}
              isMe={row.user.id === meId}
              following={follows.includes(row.user.id)}
              onFollow={() => onFollow(row.user.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HallFeed({
  searching,
  mode,
  onMode,
  posts,
}: {
  searching: boolean;
  mode: HallMode;
  onMode: (v: HallMode) => void;
  posts: Post[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs font-bold text-lime-400">
          {searching ? "検索結果" : "歴代の高評価投稿"}
        </p>
        <div className="flex rounded-full bg-panel p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onMode("problems")}
            className={`rounded-full px-3 py-1.5 ${mode === "problems" ? "bg-neon text-white" : "text-muted"}`}
          >
            クイズ
          </button>
          <button
            type="button"
            onClick={() => onMode("solutions")}
            className={`rounded-full px-3 py-1.5 ${mode === "solutions" ? "bg-neon text-white" : "text-muted"}`}
          >
            解法
          </button>
        </div>
      </div>
      {posts.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          {searching ? "一致する投稿が見つかりません" : "まだ投稿がありません"}
        </p>
      ) : (
        posts.map((p, i) => (
          <div key={p.id} className="relative">
            <RankBadge rank={i + 1} />
            <PostCard post={p} />
          </div>
        ))
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const tone =
    rank === 1
      ? "bg-yellow-400 text-black font-bold"
      : rank === 2
        ? "bg-lime-400 text-black font-bold"
        : rank === 3
          ? "bg-[#b87333] text-white font-bold"
          : "text-muted font-semibold";
  return (
    <span
      className={`absolute left-2 top-3 z-10 rounded-md px-1.5 py-0.5 text-[11px] ${tone}`}
    >
      #{rank}
    </span>
  );
}

function QrafterRankRow({
  rank,
  user,
  weeklyReactions,
  isMe,
  following,
  onFollow,
}: {
  rank: number;
  user: User;
  weeklyReactions: number;
  isMe: boolean;
  following: boolean;
  onFollow: () => void;
}) {
  const verified = userIsVerified(user);
  return (
    <div className="relative flex items-center justify-between gap-3 px-4 py-3">
      <RankBadge rank={rank} />
      <Link href={`/u/${user.handle}`} className="ml-10 flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar user={user} className="h-12 w-12 text-xl" />
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <VerifiedBadge show={verified} />
          </div>
          <p className="truncate text-xs text-muted">@{user.handle}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            今週のリアクション{" "}
            <span className="font-bold text-lime-400">{weeklyReactions}</span>
          </p>
        </div>
      </Link>
      {!isMe && (
        <button
          type="button"
          onClick={onFollow}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
            following ? "border border-gray-700" : "bg-white text-black"
          }`}
        >
          {following ? "フォロー中" : "フォロー"}
        </button>
      )}
    </div>
  );
}

function TextTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 px-3 py-2.5 text-[13px] font-bold ${
        active ? "text-white" : "text-muted"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white" />
      )}
    </button>
  );
}

function UserResultCard({
  user,
  isMe,
  following,
  onFollow,
}: {
  user: User;
  isMe: boolean;
  following: boolean;
  onFollow: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href={`/u/${user.handle}`} className="shrink-0">
        <UserAvatar user={user} className="h-12 w-12 text-xl" />
      </Link>
      <Link href={`/u/${user.handle}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{user.name}</p>
        <p className="truncate text-xs text-muted">@{user.handle}</p>
      </Link>
      {!isMe && (
        <button
          type="button"
          onClick={onFollow}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
            following ? "border border-gray-700" : "bg-white text-black"
          }`}
        >
          {following ? "フォロー中" : "フォロー"}
        </button>
      )}
    </div>
  );
}
