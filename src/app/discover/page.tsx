"use client";

import { PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SUBJECTS } from "@/lib/constants";
import { DIFFICULTY_LEVELS } from "@/lib/difficulty";
import { avgStars, useApp } from "@/lib/store";
import type { Post, ProblemMode, Subject, Tier, User } from "@/lib/types";
import { userIsVerified } from "@/lib/verified";
import { postReactionScore } from "@/lib/weekly";
import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

type ViewTab = "posts" | "users";
type SortKey = "newest" | "trending" | "hall";
type SubjectFilter = "all" | Subject;
type ModeFilter = "all" | ProblemMode;
type LevelFilter = "all" | Tier;

const VIEW_TABS: { id: ViewTab; label: string }[] = [
  { id: "posts", label: "投稿" },
  { id: "users", label: "ユーザー" },
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
  return v === "users" ? "users" : "posts";
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
  const { posts, users, me, follows, toggleFollow, searchUsers } = useApp();
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

  const filteredPosts = useMemo(
    () => sortPosts(filterPosts(posts, { subject, mode, level, q: q.trim() }), sort),
    [posts, subject, mode, level, q, sort],
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
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2 rounded-full border border-gray-800 bg-[#202327] px-4 py-2.5">
            <Search size={16} className="shrink-0 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={view === "users" ? "ユーザーを検索" : "投稿を検索"}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted"
            />
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
                className={`relative flex-1 py-3 text-[15px] font-bold ${
                  active ? "text-white" : "text-muted"
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute inset-x-8 bottom-0 h-1 rounded-full bg-aha" />
                )}
              </button>
            );
          })}
        </nav>
        {view === "posts" && (
          <div className="flex flex-wrap items-end gap-2 border-t border-gray-800 px-3 py-2.5">
            <FilterSelect
              label="並び替え"
              value={sort}
              onChange={(v) => patchParams({ sort: v === "newest" ? null : v })}
              options={SORT_OPTIONS}
            />
            <FilterSelect
              label="教科"
              value={subject}
              onChange={(v) => patchParams({ subject: v === "all" ? null : v })}
              options={[
                { id: "all", label: "すべて" },
                ...SUBJECTS.map((s) => ({ id: s.id, label: s.label })),
              ]}
            />
            <FilterSelect
              label="問題モード"
              value={mode}
              onChange={(v) => patchParams({ mode: v === "all" ? null : v })}
              options={MODE_OPTIONS}
            />
            <div className="min-w-0 flex-1 basis-full sm:basis-auto">
              <p className="mb-1 text-[10px] font-bold tracking-wide text-muted">難易度</p>
              <div className="flex flex-wrap gap-1">
                <LevelChip
                  active={level === "all"}
                  onClick={() => patchParams({ lv: null })}
                >
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
      </header>

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
          <p className="px-4 py-2 text-[11px] text-muted">
            {SORT_OPTIONS.find((s) => s.id === sort)?.label} · {filteredPosts.length}件
          </p>
          {filteredPosts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              {q.trim() ? "一致する投稿が見つかりません" : "条件に合う投稿はまだありません"}
            </p>
          ) : (
            filteredPosts.map((p, i) => (
              <div key={p.id} className="relative">
                {sort === "hall" && <RankBadge rank={i + 1} />}
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
    <label className="relative min-w-[9.5rem] flex-1">
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
