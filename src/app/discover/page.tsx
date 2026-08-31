"use client";

import { NotePages } from "@/components/NotePages";
import { PostCard } from "@/components/PostCard";
import { SUBJECTS } from "@/lib/constants";
import { avgStars, useApp } from "@/lib/store";
import type { HallMode, Subject } from "@/lib/types";
import { Crown, Search } from "lucide-react";
import { useMemo, useState } from "react";

export default function DiscoverPage() {
  const { posts } = useApp();
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<Subject | "all">("all");
  const [hall, setHall] = useState(true);
  const [mode, setMode] = useState<HallMode>("problems");

  const ranked = useMemo(() => {
    let list = posts.filter((p) => p.kind !== "sprint" && p.kind !== "reply");
    if (subject !== "all") list = list.filter((p) => p.subject === subject);
    if (q.trim()) {
      const n = q.toLowerCase();
      list = list.filter((p) => p.text.toLowerCase().includes(n));
    }
    if (!hall) return list;
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
  }, [posts, q, subject, hall, mode]);

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-black/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2 rounded-full bg-panel px-3 py-2">
          <Search size={16} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="問題・解法を検索"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          <Chip active={subject === "all"} onClick={() => setSubject("all")}>
            ALL
          </Chip>
          {SUBJECTS.map((s) => (
            <Chip
              key={s.id}
              active={subject === s.id}
              onClick={() => setSubject(s.id)}
            >
              {s.emoji} {s.label}
            </Chip>
          ))}
        </div>
      </header>

      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setHall((v) => !v)}
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
            hall ? "bg-aha text-black" : "border border-gray-700 text-muted"
          }`}
        >
          <Crown size={14} /> 殿堂入り
        </button>
        {hall && (
          <div className="flex rounded-full bg-panel p-0.5 text-xs">
            <button
              onClick={() => setMode("problems")}
              className={`rounded-full px-3 py-1.5 ${mode === "problems" ? "bg-neon text-white" : "text-muted"}`}
            >
              👑 クイズ
            </button>
            <button
              onClick={() => setMode("solutions")}
              className={`rounded-full px-3 py-1.5 ${mode === "solutions" ? "bg-neon text-white" : "text-muted"}`}
            >
              🧠 解法
            </button>
          </div>
        )}
      </div>

      {hall && ranked[0] && (
        <div className="mx-4 mb-3 rounded-2xl border border-aha/30 bg-aha/5 p-3">
          <p className="text-[11px] font-bold text-aha">
            {mode === "problems" ? "殿堂入りクイズ #1" : "殿堂入り解法 #1"}
          </p>
          {ranked[0].pages && <NotePages pages={ranked[0].pages} />}
        </div>
      )}

      {ranked.map((p, i) => (
        <div key={p.id} className="relative">
          {hall && (
            <span className="absolute left-2 top-3 z-10 text-xs font-black text-aha">
              #{i + 1}
            </span>
          )}
          <PostCard post={p} />
        </div>
      ))}
    </div>
  );
}

function Chip({
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
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
        active ? "bg-white text-black" : "border border-gray-700 text-muted"
      }`}
    >
      {children}
    </button>
  );
}
