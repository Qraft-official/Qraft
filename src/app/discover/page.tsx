"use client";

import { PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SUBJECTS } from "@/lib/constants";
import { DIFFICULTY_LEVELS } from "@/lib/difficulty";
import { avgStars, useApp } from "@/lib/store";
import type { Post, ProblemMode, Subject, Tier, User } from "@/lib/types";
import { userIsVerified, verifiedBadgeTone } from "@/lib/verified";
import {
  computeWeeklyHighlights,
  fetchWeeklyReactionBoosts,
  postReactionScore,
  type WeeklyHighlights,
} from "@/lib/weekly";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

type ViewTab = "posts" | "users" | "newest";
type SortKey = "newest" | "trending" | "hall";
type SubjectFilter = "all" | Subject;
type ModeFilter = "all" | ProblemMode;
type LevelFilter = "all" | Tier;

const VIEW_TABS: { id: ViewTab; label: string }[] = [
  { id: "posts", label: "投稿" },
  { id: "users", label: "ユーザー" },
  { id: "newest", label: "新着順" },
];

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "新着順" },
  { id: "trending", label: "話題の問題" },
  { id: "hall", label: "殿堂入り" },
];

const MODE_OPTIONS: { id: ModeFilter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "question", label: "教えてQrafter!" },
  { id: "challenge", label: "Challenger" },
  { id: "aha", label: "Aha!" },
];

const SELECT_CLASS =
  "w-full appearance-none rounded-full border border-gray-700 bg-[#15202b] py-1.5 pl-3 pr-8 text-[12px] font-bold text-white outline-none focus:border-aha";

function asView(v: string | null): ViewTab {
  if (v === "users") return "users";
  if (v === "newest") return "newest";
  return "posts";
}

function asSort(v: string | null): SortKey {
  if (v === "trending" || v === "hall") return v;
  return "newest";
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

function sortPosts(list: Post[], sort: SortKey) {
  const copy = [...list];
  if (sort === "newest") {
    return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  if (sort === "trending") {
    return copy.sort((a, b) => {
      const score = postReactionScore(b) - postReactionScore(a);
      if (score !== 0) return score;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });
  }
  return copy.sort((a, b) => {
    const aScore =
      a.kind === "solution"
        ? avgStars(a.eleganceSum, a.eleganceCount)
        : avgStars(a.ahaSum, a.ahaCount);
    const bScore =
      b.kind === "solution"
        ? avgStars(b.eleganceSum, b.eleganceCount)
        : avgStars(b.ahaSum, b.ahaCount);
    if (bScore !== aScore) return bScore - aScore;
    return postReactionScore(b) - postReactionScore(a);
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
  const sort = asSort(searchParams.get("sort"));
  const subject = asSubject(searchParams.get("subject"));
  const mode = asMode(searchParams.get("mode"));
  const level = asLevel(searchParams.get("lv"));
  const qParam = searchParams.get("q") ?? "";
  const [q, setQ] = useState(qParam);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  const [boosts, setBoosts] = useState<{
    byProblem: Record<string, number>;
    byAuthor: Record<string, number>;
  }>({ byProblem: {}, byAuthor: {} });

  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

  useEffect(() => {
    void fetchWeeklyReactionBoosts().then(setBoosts);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!filterWrapRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen]);

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

  const effectiveSort: SortKey = view === "newest" ? "newest" : sort;

  const filteredPosts = useMemo(
    () => sortPosts(filterPosts(posts, { subject, mode, level, q: q.trim() }), effectiveSort),
    [posts, subject, mode, level, q, effectiveSort],
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

  const weekly = useMemo(
    () => computeWeeklyHighlights(posts, userOf, boosts.byProblem, boosts.byAuthor),
    [posts, userOf, boosts],
  );

  const searching = q.trim().length > 0;
  const filtersActive =
    sort !== "newest" || subject !== "all" || mode !== "all" || level !== "all";

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-black/80 backdrop-blur">
        <div className="flex items-center gap-2 px-3 pt-3 sm:px-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-800 bg-[#202327] px-4 py-2.5">
            <Search size={16} className="shrink-0 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={view === "users" ? "ユーザーを検索" : "投稿を検索"}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            />
          </div>
          <div ref={filterWrapRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-800 bg-[#202327] text-muted transition hover:bg-white/5 hover:text-white ${
                filterOpen || filtersActive ? "text-aha" : ""
              }`}
              aria-label="フィルター"
              aria-expanded={filterOpen}
            >
              <SlidersHorizontal size={18} strokeWidth={2} />
              {filtersActive && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-aha" />
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-gray-800 bg-[#15202b] p-3 shadow-2xl">
                <FilterSelect
                  label="並び替え"
                  value={sort}
                  onChange={(v) => patchParams({ sort: v === "newest" ? null : v })}
                  options={SORT_OPTIONS}
                />
                <div className="mt-3">
                  <FilterSelect
                    label="教科"
                    value={subject}
                    onChange={(v) => patchParams({ subject: v === "all" ? null : v })}
                    options={[
                      { id: "all", label: "すべて" },
                      ...SUBJECTS.map((s) => ({ id: s.id, label: s.label })),
                    ]}
                  />
                </div>
                <div className="mt-3">
                  <FilterSelect
                    label="問題モード"
                    value={mode}
                    onChange={(v) => patchParams({ mode: v === "all" ? null : v })}
                    options={MODE_OPTIONS}
                  />
                </div>
                <div className="mt-3">
                  <p className="mb-1 text-[10px] font-bold tracking-wide text-muted">難易度</p>
                  <div className="flex flex-wrap gap-1">
                    <LevelChip active={level === "all"} onClick={() => patchParams({ lv: null })}>
                      すべて
                    </LevelChip>
                    {DIFFICULTY_LEVELS.map((d) => (
                      <LevelChip
                        key={d.id}
                        active={level === d.id}
                        onClick={() => patchParams({ lv: String(d.id) })}
                      >
                        {d.label}
                      </LevelChip>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <nav className="mt-1 flex">
          {VIEW_TABS.map((t) => {
            const active = view === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  patchParams({
                    view: t.id === "posts" ? null : t.id,
                  })
                }
                className={`relative flex-1 py-3 text-[15px] font-bold ${
                  active ? "text-white" : "text-muted"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-6 bottom-0 h-1 rounded-full bg-aha sm:inset-x-8" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {view === "users" ? (
        <div>
          {!searching && <WeeklyDiscoverBlock weekly={weekly} showQuestion={false} />}
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
        </div>
      ) : (
        <div>
          {!searching && <WeeklyDiscoverBlock weekly={weekly} />}
          <p className="px-4 py-2 text-[11px] text-muted">
            {view === "newest"
              ? "新着順"
              : SORT_OPTIONS.find((s) => s.id === sort)?.label}{" "}
            · {filteredPosts.length}件
          </p>
          {filteredPosts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              {q.trim() ? "一致する投稿が見つかりません" : "条件に合う投稿はまだありません"}
            </p>
          ) : (
            filteredPosts.map((p, i) => (
              <div key={p.id} className="relative">
                {effectiveSort === "hall" && <RankBadge rank={i + 1} />}
                <PostCard post={p} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function WeeklyDiscoverBlock({
  weekly,
  showQuestion = true,
}: {
  weekly: WeeklyHighlights;
  showQuestion?: boolean;
}) {
  const qrafter = weekly.weeklyQrafter;
  const question = weekly.weeklyQuestion;
  if (!qrafter && !question) return null;
  return (
    <div className="border-b border-gray-800 px-4 py-3">
      {qrafter && (
        <div className="mb-3">
          <p className="text-[11px] font-black tracking-wide text-aha">WeeklyQrafter</p>
          <Link
            href={`/u/${qrafter.user.handle}`}
            className="mt-2 flex items-center gap-3 rounded-2xl border border-gray-800 bg-panel px-3 py-2.5"
          >
            <UserAvatar user={qrafter.user} className="h-11 w-11 text-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-sm font-bold">{qrafter.user.name}</p>
                <VerifiedBadge show={userIsVerified(qrafter.user)} tone={verifiedBadgeTone(qrafter.user)} />
              </div>
              <p className="truncate text-[11px] text-muted">
                @{qrafter.user.handle} · 今週 {qrafter.weeklyReactions} リアクション
              </p>
            </div>
          </Link>
        </div>
      )}
      {showQuestion && question && (
        <div>
          <p className="mb-1 text-[11px] font-black tracking-wide text-aha">WeeklyQuestion</p>
          <div className="-mx-4">
            <PostCard post={question} />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <label className="relative block">
      <span className="mb-1 block text-[10px] font-bold tracking-wide text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={SELECT_CLASS}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 bottom-2 text-muted"
      />
    </label>
  );
}

function LevelChip({
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
          <VerifiedBadge show={verified} tone={verifiedBadgeTone(user)} />
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
