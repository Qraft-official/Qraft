"use client";

import { NotePages } from "@/components/NotePages";
import { PostCard } from "@/components/PostCard";
import { UserAvatar } from "@/components/UserAvatar";
import { SUBJECTS } from "@/lib/constants";
import { DIFFICULTY_LEVELS } from "@/lib/difficulty";
import { avgStars, useApp } from "@/lib/store";
import type { HallMode, Subject, Tier, User } from "@/lib/types";
import { Crown, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PrimaryTab = "posts" | "users" | "trend" | Subject;

const PRIMARY_TABS: { id: PrimaryTab; label: string }[] = [
  { id: "posts", label: "投稿" },
  { id: "users", label: "ユーザー" },
  { id: "trend", label: "トレンド" },
  ...SUBJECTS.map((s) => ({ id: s.id as PrimaryTab, label: s.label })),
];

export default function DiscoverPage() {
  const { posts, users, me, follows, toggleFollow, searchUsers } = useApp();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<PrimaryTab>("posts");
  const [difficulty, setDifficulty] = useState<Tier | "all">("all");
  const [hall, setHall] = useState(true);
  const [mode, setMode] = useState<HallMode>("problems");

  const subject: Subject | "all" =
    tab === "math" || tab === "physics" || tab === "chemistry" ? tab : "all";
  const showUsers = tab === "users";
  const showPosts = !showUsers;
  const useHall = tab === "trend" || (tab === "posts" && hall);

  useEffect(() => {
    if (!showUsers) return;
    const t = window.setTimeout(() => {
      void searchUsers(q);
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, showUsers, searchUsers]);

  const ranked = useMemo(() => {
    let list = posts.filter((p) => p.kind !== "sprint" && p.kind !== "reply");
    if (subject !== "all") list = list.filter((p) => p.subject === subject);
    if (difficulty !== "all") {
      list = list.filter(
        (p) => p.kind !== "problem" || (p.difficultyLevel ?? 3) === difficulty,
      );
    }
    if (q.trim()) {
      const n = q.toLowerCase();
      list = list.filter((p) => p.text.toLowerCase().includes(n));
    }
    if (!useHall) return list;
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
  }, [posts, q, subject, difficulty, useHall, mode]);

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
    <div>
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

      {showPosts && (
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

          {tab !== "trend" && (
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => setHall((v) => !v)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  hall ? "bg-aha text-black" : "border border-gray-700 text-muted"
                }`}
              >
                <Crown size={14} /> 殿堂入り
              </button>
              {useHall && (
                <div className="flex rounded-full bg-panel p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setMode("problems")}
                    className={`rounded-full px-3 py-1.5 ${mode === "problems" ? "bg-neon text-white" : "text-muted"}`}
                  >
                    👑 クイズ
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("solutions")}
                    className={`rounded-full px-3 py-1.5 ${mode === "solutions" ? "bg-neon text-white" : "text-muted"}`}
                  >
                    🧠 解法
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "trend" && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="flex items-center gap-1 text-xs font-bold text-aha">
                <Crown size={14} /> トレンド
              </p>
              <div className="flex rounded-full bg-panel p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("problems")}
                  className={`rounded-full px-3 py-1.5 ${mode === "problems" ? "bg-neon text-white" : "text-muted"}`}
                >
                  👑 クイズ
                </button>
                <button
                  type="button"
                  onClick={() => setMode("solutions")}
                  className={`rounded-full px-3 py-1.5 ${mode === "solutions" ? "bg-neon text-white" : "text-muted"}`}
                >
                  🧠 解法
                </button>
              </div>
            </div>
          )}

          {useHall && ranked[0] && (
            <div className="mx-4 mb-3 rounded-2xl border border-aha/30 bg-aha/5 p-3">
              <p className="text-[11px] font-bold text-aha">
                {mode === "problems" ? "殿堂入りクイズ #1" : "殿堂入り解法 #1"}
              </p>
              {ranked[0].pages && <NotePages pages={ranked[0].pages} />}
            </div>
          )}

          {ranked.map((p, i) => (
            <div key={p.id} className="relative">
              {useHall && (
                <span className="absolute left-2 top-3 z-10 text-xs font-black text-aha">
                  #{i + 1}
                </span>
              )}
              <PostCard post={p} />
            </div>
          ))}
        </>
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
