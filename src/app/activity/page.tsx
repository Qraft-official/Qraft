"use client";

import { UserAvatar } from "@/components/UserAvatar";
import { TIER_NAMES } from "@/lib/constants";
import { RIVAL_ACTIVITY } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { Swords } from "lucide-react";
import Link from "next/link";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "今";
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間`;
  return `${Math.floor(h / 24)}日`;
}

export default function ActivityPage() {
  const { users, me, follows, toggleFollow, sprint, activities, userOf, getPost } = useApp();
  const rivals = users
    .filter((u) => u.id !== me.id && u.id !== "u-official")
    .sort((a, b) => b.stats.insight - a.stats.insight);

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-black/80 px-4 py-4 backdrop-blur">
        <h1 className="flex items-center gap-2 text-lg font-black">
          <Swords size={18} className="text-aha" /> Activity / Rivals
        </h1>
      </header>

      <section className="border-b border-gray-800 px-4 py-4">
        <p className="text-xs font-bold text-muted">今週のライバルレーダー</p>
        <div className="mt-3 space-y-3">
          {rivals.map((u, i) => (
            <div key={u.id} className="flex items-center gap-3">
              <span className="w-5 text-xs text-muted">{i + 1}</span>
              <Link href={`/u/${u.handle}`}>
                <UserAvatar user={u} className="h-10 w-10 text-lg" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{u.name}</p>
                <p className="truncate text-[11px] text-muted">
                  {u.school} · 数学 {TIER_NAMES.math[u.tiers.math]}
                </p>
              </div>
              <button
                onClick={() => toggleFollow(u.id)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  follows.includes(u.id) ? "border border-gray-700" : "bg-white text-black"
                }`}
              >
                {follows.includes(u.id) ? "Rival" : "勝負"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-4">
        <p className="text-xs font-bold text-muted">あなたのアクション · 全国戦 {sprint.dayId}</p>
        <div className="mt-3 space-y-4">
          {activities.map((a) => {
            const u = userOf(a.userId);
            const post = a.postId ? getPost(a.postId) : undefined;
            return (
              <div key={a.id} className="flex gap-3">
                <UserAvatar user={u} className="h-10 w-10 text-lg" />
                <div>
                  <p className="text-sm">
                    <span className="font-bold">{u.name}</span> {a.text}
                    {post && (
                      <span className="mt-1 block text-xs text-muted line-clamp-2">
                        {post.text.replace(/\$+/g, "").slice(0, 80)}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            );
          })}
          {RIVAL_ACTIVITY.map((a) => {
            const u = userOf(a.userId);
            return (
              <div key={a.id} className="flex gap-3">
                <UserAvatar user={u} className="h-10 w-10 text-lg" />
                <div>
                  <p className="text-sm">
                    <span className="font-bold">{u.name}</span>{" "}
                    <span className="text-[#e7e9ea]">{a.text}</span>
                  </p>
                  <p className="text-[11px] text-muted">{a.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
