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
  computeWeeklyRankings,
  fetchWeeklyReactionBoosts,
  postReactionScore,
} from "@/lib/weekly";
import { DiscoverSkeleton, EmptyState } from "@/components/UiStates";
import { WeeklyBoards } from "@/components/WeeklyBoards";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  return <DiscoverSkeleton />;
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
  const [isComposing, setIsComposing] = useState(false);
  const composingRef = useRef(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [boosts, setBoosts] = useState<{
    byProblem: Record<string, number>;
    byAuthor: Record<string, number>;
  }>({ byProblem: {}, byAuthor: {} });

  useEffect(() => {
    if (composingRef.current) return;
    setQ((prev) => (prev === qParam ? prev : qParam));
  }, [qParam]);

  useEffect(() => {
    void fetchWeeklyReactionBoosts().then(setBoosts);
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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

  const commitQuery = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed === qParam) return;
      patchParams({ q: trimmed || null });
    },
    [patchParams, qParam],
  );

  useEffect(() => {
    if (composingRef.current || isComposing) return;
    const t = window.setTimeout(() => commitQuery(q), 280);
    return () => window.clearTimeout(t);
  }, [q, isComposing, commitQuery]);

  useEffect(() => {
    if (view !== "users") return;
    if (composingRef.current || isComposing) return;
    const t = window.setTimeout(() => {
      void searchUsers(q);
    }, 280);
    return () => window.clearTimeout(t);
  }, [q, view, searchUsers, isComposing]);

  const effectiveSort: SortKey = view === "newest" ? "newest" : sort;

  const filterQuery = (isComposing ? qParam : q).trim();

  const filteredPosts = useMemo(
    () => sortPosts(filterPosts(posts, { subject, mode, level, q: filterQuery }), effectiveSort),
    [posts, subject, mode, level, filterQuery, effectiveSort],
  );

  const matchedUsers = useMemo(() => {
    const n = filterQuery.toLowerCase().replace(/^@/, "");
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
  }, [users, filterQuery]);

  const weekly = useMemo(
    () => computeWeeklyRankings(posts, userOf, boosts.byProblem, boosts.byAuthor),
    [posts, userOf, boosts],
  );

  const searching = filterQuery.length > 0;
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
              onCompositionStart={() => {
                composingRef.current = true;
                setIsComposing(true);
              }}
              onCompositionUpdate={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={(e) => {
                composingRef.current = false;
                setIsComposing(false);
                const next = e.currentTarget.value;
                setQ(next);
                commitQuery(next);
                if (view === "users") void searchUsers(next);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (composingRef.current || e.nativeEvent.isComposing) return;
                e.preventDefault();
                commitQuery(q);
              }}
              placeholder={view === "users" ? "ユーザーを検索" : "投稿を検索"}
              aria-label={view === "users" ? "ユーザーを検索" : "投稿を検索"}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-800 bg-[#202327] text-muted ${
              filterOpen || filtersActive ? "text-aha" : ""
            }`}
            aria-label={filtersActive ? "フィルター（適用中）" : "フィルター"}
            aria-expanded={filterOpen}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal size={18} strokeWidth={2} />
            {filtersActive && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-aha ring-2 ring-[#202327]" />
            )}
          </button>
          {filterOpen &&
            createPortal(
              <div
                className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
                role="presentation"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-black/60"
                  aria-label="フィルターを閉じる"
                  onClick={() => setFilterOpen(false)}
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="検索フィルター"
                  className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-gray-800 bg-[#15202b] shadow-2xl sm:mx-4 sm:rounded-3xl"
                  style={{
                    maxHeight:
                      "min(90dvh, calc(var(--vvh, 100dvh) - env(safe-area-inset-top, 0px) - 0.75rem))",
                    marginBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
                    paddingTop: "max(0.25rem, env(safe-area-inset-top, 0px))",
                  }}
                >
                  <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-3">
                    <p className="text-sm font-black">フィルター</p>
                    <button
                      type="button"
                      className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-full px-3 text-sm font-bold text-muted hover:bg-white/10 hover:text-white"
                      aria-label="閉じる"
                      onClick={() => setFilterOpen(false)}
                    >
                      <X size={16} />
                      閉じる
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
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
                    <div className="mt-3 pb-2">
                      <p className="mb-1 text-xs font-bold tracking-wide text-muted">難易度</p>
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
                  <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-800 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
                    <p className="text-xs font-bold text-muted">
                      {filtersActive ? "フィルター適用中" : "絞り込み"}
                    </p>
                    <button
                      type="button"
                      className="min-h-11 rounded-full bg-aha/15 px-4 text-sm font-bold text-aha disabled:bg-transparent disabled:text-muted"
                      disabled={!filtersActive}
                      onClick={() => {
                        patchParams({ sort: null, subject: null, mode: null, lv: null });
                      }}
                    >
                      すべてリセット
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )}
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
                className={`relative flex min-h-11 flex-1 py-3 text-[15px] font-bold ${
                  active ? "text-white" : "text-muted"
                }`}
                aria-current={active ? "page" : undefined}
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
          {!searching && <WeeklyBoards qrafters={weekly.weeklyQrafters} questions={weekly.weeklyQuestions} />}
          {searching && (
            <p className="px-4 py-2 text-xs text-muted">「{q.trim()}」を検索中</p>
          )}
          <div className="divide-y divide-gray-800">
            {matchedUsers.length === 0 ? (
              <EmptyState
                title={q.trim() ? "一致するユーザーがいません" : "ユーザーが見つかりません"}
                body="キーワードを変えるか、フィルターをリセットしてみてください。"
                actionLabel={q.trim() || filtersActive ? "条件をリセット" : undefined}
                onAction={
                  q.trim() || filtersActive
                    ? () => {
                        setQ("");
                        patchParams({ q: null, sort: null, subject: null, mode: null, lv: null });
                      }
                    : undefined
                }
              />
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
          {!searching && <WeeklyBoards qrafters={weekly.weeklyQrafters} questions={weekly.weeklyQuestions} />}
          {searching && (
            <p className="px-4 py-2 text-xs font-bold text-aha">検索結果 · {filteredPosts.length}件</p>
          )}
          {!searching && (
          <p className="px-4 py-2 text-xs text-muted">
            {view === "newest"
              ? "新着順"
              : SORT_OPTIONS.find((s) => s.id === sort)?.label}{" "}
            · {filteredPosts.length}件
            {filtersActive ? " · フィルター適用中" : ""}
          </p>
          )}
          {filteredPosts.length === 0 ? (
            <EmptyState
              title={q.trim() ? "一致する投稿がありません" : "条件に合う投稿はまだありません"}
              body="検索語を変えるか、フィルターをリセットすると見つかりやすくなります。"
              actionLabel="フィルターをリセット"
              onAction={() => {
                setQ("");
                patchParams({ q: null, sort: null, subject: null, mode: null, lv: null });
              }}
            />
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
      <span className="mb-1 block text-xs font-bold tracking-wide text-muted">{label}</span>
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
      className={`min-h-11 rounded-full border px-3 text-xs font-bold ${
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
          className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${
            following ? "border border-gray-700" : "bg-white text-black"
          }`}
        >
          {following ? "フォロー中" : "フォロー"}
        </button>
      )}
    </div>
  );
}
