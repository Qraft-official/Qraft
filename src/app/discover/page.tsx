"use client";

import { PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SUBJECTS } from "@/lib/constants";
import { DIFFICULTY_LEVELS } from "@/lib/difficulty";
import { avgStars, useApp } from "@/lib/store";
import type { Post, ProblemMode, Subject, Tier, User } from "@/lib/types";
import { userIsVerified } from "@/lib/verified";
import {
  computeWeeklyRankings,
  fetchWeeklyReactionBoosts,
  postReactionScore,
  type WeeklyQrafter,
} from "@/lib/weekly";
import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

type ViewTab = "posts" | "users" | "newest";
type SubjectFilter = "all" | Subject;
type ModeFilter = "all" | ProblemMode;
type LevelFilter = "all" | Tier;
type RankingType = "question" | "qrafter";

const VIEW_TABS: { id: ViewTab; label: string }[] = [
  { id: "posts", label: "投稿" },
  { id: "users", label: "ユーザー" },
  { id: "newest", label: "新着順" },
];

const MODE_OPTIONS: { id: ModeFilter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "question", label: "教えてQrafter!" },
  { id: "challenge", label: "Challenger" },
  { id: "aha", label: "Aha!" },
];

function asView(v: string | null): ViewTab {
  if (v === "users" || v === "newest") return v;
  return "posts";
}

function asSubject(v: string | null): SubjectFilter {
  if (v === "math" || v === "physics" || v === "chemistry") return v;
  return "all";
}

function asMode(v: string | null): ModeFilter {
  if (v === "question" || v === "challenge" || v === "aha") return v;
  return "all";
}

function asLevel(v: string | null): LevelFilter {
  const n = Number(v);
  if (n >= 1 && n <= 5) return n as Tier;
  return "all";
}

function matchesQuery(post: Post, q: string) {
  if (!q) return true;
  const n = q.toLowerCase();
  return (
    post.text.toLowerCase().includes(n) ||
    (post.title ?? "").toLowerCase().includes(n) ||
    (post.solution ?? "").toLowerCase().includes(n)
  );
}

function filterPosts(
  posts: Post[],
  {
    subject,
    mode,
    level,
    q,
  }: {
    subject: SubjectFilter;
    mode: ModeFilter;
    level: LevelFilter;
    q: string;
  },
) {
  return posts.filter((p) => {
    if (p.kind === "sprint" || p.kind === "reply") return false;
    if (subject !== "all" && p.subject !== subject) return false;
    if (mode !== "all" && (p.kind !== "problem" || p.problemMode !== mode)) return false;
    if (level !== "all" && (p.kind !== "problem" || (p.difficultyLevel ?? 3) !== level)) {
      return false;
    }
    return matchesQuery(p, q);
  });
}

function sortPosts(list: Post[], newest: boolean) {
  const copy = [...list];
  if (newest) {
    return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  return copy.sort((a, b) => {
    const score = postReactionScore(b) - postReactionScore(a);
    if (score !== 0) return score;
    const aScore =
      a.kind === "solution"
        ? avgStars(a.eleganceSum, a.eleganceCount)
        : avgStars(a.ahaSum, a.ahaCount);
    const bScore =
      b.kind === "solution"
        ? avgStars(b.eleganceSum, b.eleganceCount)
        : avgStars(b.ahaSum, b.ahaCount);
    if (bScore !== aScore) return bScore - aScore;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<DiscoverFallback />}>
      <DiscoverInner />
    </Suspense>
  );
}

function DiscoverFallback() {
  return (
    <div className="mx-auto w-full max-w-[600px]">
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-black/80 px-4 py-3 backdrop-blur">
        <p className="text-sm text-muted">読み込み中…</p>
      </header>
    </div>
  );
}

function DiscoverInner() {
  const { posts, users, me, follows, toggleFollow, searchUsers, userOf } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const view = asView(searchParams.get("view"));
  const subject = asSubject(searchParams.get("subject"));
  const mode = asMode(searchParams.get("mode"));
  const level = asLevel(searchParams.get("lv"));
  const qParam = searchParams.get("q") ?? "";
  const [q, setQ] = useState(qParam);
  const [filterOpen, setFilterOpen] = useState(false);
  const [rankingType, setRankingType] = useState<RankingType>("question");
  const [weeklyBoost, setWeeklyBoost] = useState<{
    byProblem: Record<string, number>;
    byAuthor: Record<string, number>;
  }>({ byProblem: {}, byAuthor: {} });

  const filtersActive = subject !== "all" || mode !== "all" || level !== "all";

  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      const trimmed = q.trim();
      if (trimmed === qParam) return;
      patchParams({ q: trimmed || null });
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, qParam, patchParams]);

  useEffect(() => {
    if (view !== "users") return;
    const t = window.setTimeout(() => {
      void searchUsers(q);
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, view, searchUsers]);

  useEffect(() => {
    void fetchWeeklyReactionBoosts().then(setWeeklyBoost);
  }, []);

  const weeklyPool = useMemo(
    () => filterPosts(posts, { subject, mode, level, q: "" }),
    [posts, subject, mode, level],
  );

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

  const filteredPosts = useMemo(
    () => sortPosts(filterPosts(posts, { subject, mode, level, q: q.trim() }), view === "newest"),
    [posts, subject, mode, level, q, view],
  );

  const matchedUsers = useMemo(() => {
    const n = q.trim().toLowerCase().replace(/^@/, "");
    const seen = new Set<string>();
    const out: User[] = [];
    for (const u of users) {
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      if (!n) {
        out.push(u);
        continue;
      }
      if (u.name.toLowerCase().includes(n) || u.handle.toLowerCase().includes(n)) {
        out.push(u);
      }
    }
    return out;
  }, [users, q]);

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-black/80 backdrop-blur">
        <div className="flex items-center gap-2 px-3 pt-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-800 bg-[#202327] py-2 pl-4 pr-1.5">
            <Search size={16} className="shrink-0 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={view === "users" ? "ユーザーを検索" : "投稿を検索"}
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
            />
            <button
              type="button"
              aria-expanded={filterOpen}
              aria-label="フィルタ"
              onClick={() => setFilterOpen((v) => !v)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                filterOpen || filtersActive
                  ? "bg-aha text-black"
                  : "bg-white/10 text-muted hover:text-white"
              }`}
            >
              <SlidersHorizontal size={13} strokeWidth={2.4} />
              フィルタ
            </button>
          </div>
        </div>
        <nav className="mt-1 flex">
          {VIEW_TABS.map((t) => {
            const active = view === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => patchParams({ view: t.id === "posts" ? null : t.id })}
                className={`relative min-w-0 flex-1 py-3 text-[13px] font-bold sm:text-[15px] ${
                  active ? "text-white" : "text-muted"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-aha sm:inset-x-8" />
                )}
              </button>
            );
          })}
        </nav>
        {filterOpen && (
          <div className="space-y-3 border-t border-gray-800 px-3 py-3">
            <div>
              <p className="mb-1.5 text-[10px] font-bold tracking-wide text-muted">教科</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  active={subject === "all"}
                  onClick={() => patchParams({ subject: null })}
                >
                  すべて
                </FilterChip>
                {SUBJECTS.map((s) => (
                  <FilterChip
                    key={s.id}
                    active={subject === s.id}
                    onClick={() => patchParams({ subject: s.id })}
                  >
                    {s.label}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold tracking-wide text-muted">問題モード</p>
              <div className="flex flex-wrap gap-1.5">
                {MODE_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.id}
                    active={mode === opt.id}
                    onClick={() => patchParams({ mode: opt.id === "all" ? null : opt.id })}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-bold tracking-wide text-muted">難易度</p>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip active={level === "all"} onClick={() => patchParams({ lv: null })}>
                  すべて
                </FilterChip>
                {DIFFICULTY_LEVELS.map((d) => (
                  <FilterChip
                    key={d.id}
                    active={level === d.id}
                    onClick={() => patchParams({ lv: String(d.id) })}
                  >
                    {d.label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {view !== "users" && (
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

      {view === "users" ? (
        <div className="divide-y divide-gray-800">
          {matchedUsers.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              {q.trim() ? "一致するユーザーが見つかりません" : "ユーザーが見つかりません"}
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
      ) : (
        <div>
          <p className="border-t border-gray-800 px-4 py-2 text-[11px] font-bold text-muted">
            {view === "newest" ? "新着の投稿" : "投稿"} · {filteredPosts.length}件
          </p>
          {filteredPosts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              {q.trim() ? "一致する投稿が見つかりません" : "条件に合う投稿はまだありません"}
            </p>
          ) : (
            filteredPosts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
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
      <div className="flex border-b border-slate-800">
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

function FilterChip({
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
      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
        active
          ? "border-aha bg-aha/15 text-aha"
          : "border-gray-700 text-muted hover:border-gray-500 hover:text-white"
      }`}
    >
      {children}
    </button>
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
    <span className={`absolute left-2 top-3 z-10 rounded-md px-1.5 py-0.5 text-[11px] ${tone}`}>
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
  const verified = userIsVerified(user);
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href={`/u/${user.handle}`} className="shrink-0">
        <UserAvatar user={user} className="h-12 w-12 text-xl" />
      </Link>
      <Link href={`/u/${user.handle}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate text-sm font-bold">{user.name}</p>
          <VerifiedBadge show={verified} />
        </div>
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
