"use client";

import { EmptyState } from "@/components/UiStates";
import { PostCard } from "@/components/PostCard";
import { SAVE_CATEGORIES, formatDuration, saveCategoryLabel, type SaveCategory } from "@/lib/learn";
import { fetchMyAttempts, fetchMySavedRows } from "@/lib/learn-client";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Sub = "saved" | "history" | "calendar";
type HistFilter = "all" | "correct" | "incorrect";

export function LearningPanel() {
  const { saved, getPost, posts, calendarDays, learnStreak, openComposer } = useApp();
  const [sub, setSub] = useState<Sub>("saved");
  const [hist, setHist] = useState<HistFilter>("all");
  const [savedRows, setSavedRows] = useState<{ problemId: string; category: SaveCategory }[]>([]);
  const [attempts, setAttempts] = useState<
    { id: string; problemId: string; grade: string | null; durationSeconds: number | null; submittedAt: string | null; isRevenge: boolean }[]
  >([]);
  const [cat, setCat] = useState<SaveCategory | "all">("all");

  useEffect(() => {
    void fetchMySavedRows().then((rows) => setSavedRows(rows ?? []));
    void fetchMyAttempts().then(setAttempts);
  }, [saved]);

  const savedPosts = savedRows
    .filter((r) => cat === "all" || r.category === cat)
    .map((r) => ({ row: r, post: getPost(r.problemId) || posts.find((p) => p.id === r.problemId) }));

  const filteredAttempts = attempts.filter((a) => {
    if (hist === "correct") return a.grade === "correct";
    if (hist === "incorrect") return a.grade === "incorrect";
    return true;
  });

  return (
    <div>
      <div className="flex border-b border-gray-800">
        {(
          [
            ["saved", "保存"],
            ["history", "履歴"],
            ["calendar", "カレンダー"],
          ] as [Sub, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSub(id)}
            className={`min-h-11 flex-1 text-sm font-bold ${sub === id ? "text-white" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === "saved" && (
        <>
          <div className="flex flex-wrap gap-1 px-4 py-2">
            <Chip on={cat === "all"} onClick={() => setCat("all")}>
              すべて
            </Chip>
            {SAVE_CATEGORIES.map((c) => (
              <Chip key={c.id} on={cat === c.id} onClick={() => setCat(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>
          {savedPosts.length === 0 ? (
            <EmptyState
              title="保存した問題はまだありません"
              body="タイムラインのブックマークから「あとで解く」に保存できます。"
              actionHref="/"
              actionLabel="問題を見にいく"
            />
          ) : (
            savedPosts.map(({ post, row }) =>
              post ? (
                <div key={post.id}>
                  <p className="px-4 pt-2 text-xs font-bold text-muted">{saveCategoryLabel(row.category)}</p>
                  <PostCard post={post} />
                </div>
              ) : (
                <div key={row.problemId} className="border-b border-gray-800 px-4 py-3">
                  <p className="text-xs font-bold text-muted">{saveCategoryLabel(row.category)}</p>
                  <Link href={`/p/${row.problemId}`} className="mt-1 block text-sm font-bold text-aha">
                    保存した問題を開く
                  </Link>
                </div>
              ),
            )
          )}
        </>
      )}

      {sub === "history" && (
        <>
          <div className="flex flex-wrap gap-1 px-4 py-2">
            <Chip on={hist === "all"} onClick={() => setHist("all")}>
              解答済み
            </Chip>
            <Chip on={hist === "correct"} onClick={() => setHist("correct")}>
              正解
            </Chip>
            <Chip on={hist === "incorrect"} onClick={() => setHist("incorrect")}>
              不正解
            </Chip>
          </div>
          {filteredAttempts.length === 0 ? (
            <EmptyState
              title="解答履歴はまだありません"
              body="問題を解くと、ここに記録されます。"
              actionHref="/"
              actionLabel="問題を見にいく"
            />
          ) : (
            <ul>
              {filteredAttempts.map((a) => {
                const p = getPost(a.problemId);
                const title = p?.title?.trim() || p?.text.replace(/\s+/g, " ").slice(0, 48) || "問題";
                const when = a.submittedAt
                  ? new Date(a.submittedAt).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";
                return (
                  <li key={a.id} className="border-b border-gray-800 px-4 py-3">
                    <p className="text-sm font-bold">{title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {when}
                      {a.grade === "correct" ? " · 正解" : a.grade === "incorrect" ? " · 不正解" : " · 解答済み"}
                      {formatDuration(a.durationSeconds) ? ` · ${formatDuration(a.durationSeconds)}` : ""}
                      {a.isRevenge ? " · リベンジ" : ""}
                    </p>
                    <button
                      type="button"
                      className="mt-2 min-h-11 rounded-full bg-aha px-4 text-sm font-black text-black"
                      onClick={() => openComposer({ open: true, mode: "solution", quotePostId: a.problemId })}
                    >
                      再挑戦
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {sub === "calendar" && <LearnCalendar days={calendarDays} streak={learnStreak} />}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-full px-3 text-xs font-bold ${
        on ? "bg-aha text-black" : "border border-gray-700 text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function LearnCalendar({
  days,
  streak,
}: {
  days: string[];
  streak: { current: number; longest: number };
}) {
  const set = useMemo(() => new Set(days.map((d) => d.slice(0, 10))), [days]);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const startPad = (start.getDay() + 6) % 7;
  const last = new Date(y, m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(startPad).fill(null)];
  for (let d = 1; d <= last; d++) {
    cells.push(`${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return (
    <div className="px-4 py-4">
      <p className="text-sm font-bold">
        学習連続 {streak.current}日 · 最長 {streak.longest}日
      </p>
      <p className="mt-1 text-xs text-muted">解答・投稿・PULSE参加（ログイン連続とは別）</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
          <span key={d}>{d}</span>
        ))}
        {cells.map((iso, i) => (
          <span
            key={iso ?? `e${i}`}
            className={`flex h-8 items-center justify-center rounded-md ${
              iso && set.has(iso) ? "bg-aha/80 text-black font-bold" : iso ? "bg-white/5" : ""
            }`}
          >
            {iso ? Number(iso.slice(8)) : ""}
          </span>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        <Link href="/" className="font-bold text-aha">
          今日の問題を解く
        </Link>
      </p>
    </div>
  );
}
