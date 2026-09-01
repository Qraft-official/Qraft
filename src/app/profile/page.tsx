"use client";

import { EditProfileModal } from "@/components/EditProfileModal";
import { PostCard } from "@/components/PostCard";
import { ProfileRadar } from "@/components/ProfileRadar";
import { UserAvatar, UserBanner } from "@/components/UserAvatar";
import { UserListModal } from "@/components/UserListModal";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PREMIUM_PRICE_JPY, PREMIUM_TITLES, SUBJECTS, TIER_NAMES } from "@/lib/constants";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Settings } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type Tab = "posts" | "solutions" | "analytics" | "titles";

export default function ProfilePage() {
  const { me, posts, follows, followers, userOf, reposts, getPost, hasPremium, isDeveloper, openPremium, authorVerified, logout } =
    useApp();
  const [tab, setTab] = useState<Tab>("posts");
  const [edit, setEdit] = useState(false);
  const [list, setList] = useState<"following" | "followers" | null>(null);

  const mine = useMemo(
    () => posts.filter((p) => p.authorId === me.id && p.kind !== "reply"),
    [posts, me.id],
  );
  const sols = mine.filter((p) => p.kind === "solution");
  const probs = mine.filter((p) => p.kind === "problem");
  const myReposts = reposts
    .map((id) => getPost(id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.authorId !== me.id);
  const followingUsers = follows.map(userOf);
  const followerUsers = followers.map(userOf);

  return (
    <div>
      <UserBanner user={me} />
      <div className="px-4">
        <UserAvatar user={me} className="-mt-10 h-20 w-20 border-4 border-black text-3xl" />
        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-1 text-xl font-black">
              {me.name}
              <VerifiedBadge show={authorVerified(me.id)} />
            </h1>
            <p className="text-sm text-muted">@{me.handle}</p>
            <p className="mt-1 text-xs text-aha">{me.school}</p>
            {(hasPremium || isDeveloper) && (
              <p className="mt-1 text-[11px] font-bold text-amber-300">
                {isDeveloper ? "開発者 · Premium 無料" : "Qraft Premium"}
              </p>
            )}
            <p className="mt-1 text-xs text-muted">
              {me.age !== null && me.age !== undefined ? `${me.age}歳` : "年齢未設定"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1.5 text-sm font-bold"
            >
              <Settings size={14} /> 設定
            </Link>
            <button
              onClick={() => setEdit(true)}
              className="rounded-full border border-gray-700 px-4 py-1.5 text-sm font-bold"
            >
              編集
            </button>
            <button
              onClick={() => void logout()}
              className="rounded-full border border-gray-700 px-4 py-1.5 text-sm font-bold text-muted"
            >
              ログアウト
            </button>
          </div>
        </div>
        <Link
          href="/settings?tab=referral"
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-400/20 via-aha/10 to-transparent px-4 py-3"
        >
          <span>
            <span className="block text-sm font-black text-amber-200">🎁 友達紹介で半額！</span>
            <span className="mt-0.5 block text-[11px] text-muted">
              条件達成でプレミアムが1か月 ¥200。詳細は設定へ
            </span>
          </span>
          <span className="shrink-0 text-xs font-bold text-aha">開く →</span>
        </Link>
        <p className="mt-3 text-sm">{me.bio}</p>

        <div className="mt-2 flex flex-wrap gap-1">
          {me.activeTitles.map((t) => (
            <span
              key={t}
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                PREMIUM_TITLES.includes(t)
                  ? "bg-amber-400/15 text-amber-300"
                  : "bg-aha/10 text-aha"
              }`}
            >
              {PREMIUM_TITLES.includes(t) ? t : `🏆 ${t}`}
            </span>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">
          <button onClick={() => setList("following")} className="hover:underline">
            <span className="font-bold text-white">{follows.length}</span> フォロー中
          </button>{" "}
          <button onClick={() => setList("followers")} className="ml-3 hover:underline">
            <span className="font-bold text-white">{followers.length}</span> フォロワー
          </button>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px]"
            >
              {s.emoji} {TIER_NAMES[s.id][me.tiers[s.id]]}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex border-b border-gray-800">
        {(
          [
            ["posts", "ポスト"],
            ["solutions", "解法"],
            ["analytics", "📊 アナリティクス"],
            ["titles", "🏆 称号"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-3 text-xs font-bold ${tab === id ? "text-white" : "text-muted"}`}
          >
            {label}
            {tab === id && (
              <span className="mx-auto mt-2 block h-1 w-8 rounded-full bg-neon" />
            )}
          </button>
        ))}
      </div>

      {tab === "posts" && (
        <>
          {myReposts.map((p) => (
            <PostCard key={`rp-${p.id}`} post={p} showRepostLabel />
          ))}
          {probs.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </>
      )}
      {tab === "solutions" &&
        (sols.length ? (
          sols.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <p className="px-4 py-8 text-sm text-muted">
            まだ解法がありません。🔁 から「引用して解法を投稿」できます。
          </p>
        ))}
      {tab === "analytics" && (
        <div className="px-2 py-4">
          <ProfileRadar {...me.stats} />
          <p className="mb-2 px-2 text-xs font-bold text-muted">週間アクティビティ</p>
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={me.analytics}>
                <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#15202b", border: "1px solid #1f2937" }}
                />
                <Bar dataKey="solves" fill="#A855F7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {hasPremium ? (
            <div className="mt-4 space-y-2 px-2">
              <p className="text-xs font-bold text-amber-300">📊 年鑑アナリティクス</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-gray-800 bg-panel p-3">
                  <p className="text-lg font-black">{me.stats.calc}</p>
                  <p className="text-[10px] text-muted">計算力</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-panel p-3">
                  <p className="text-lg font-black">{me.stats.insight}</p>
                  <p className="text-[10px] text-muted">洞察</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-panel p-3">
                  <p className="text-lg font-black">{me.stats.proof}</p>
                  <p className="text-[10px] text-muted">証明</p>
                </div>
              </div>
              <p className="text-[11px] text-muted">
                2026年累計リアクション {me.analytics.reduce((s, d) => s + d.aha, 0)} · 解法{" "}
                {me.analytics.reduce((s, d) => s + d.solves, 0)} · 習熟ピークは週末
              </p>
            </div>
          ) : (
            <button
              onClick={openPremium}
              className="mx-2 mt-4 w-[calc(100%-1rem)] rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-left text-xs"
            >
              <span className="font-bold text-amber-200">年鑑アナリティクスは Premium</span>
              <span className="mt-1 block text-muted">習熟度の深掘り統計は月額¥{PREMIUM_PRICE_JPY}で解放</span>
            </button>
          )}
        </div>
      )}
      {tab === "titles" && (
        <div className="space-y-2 px-4 py-4">
          {me.titles.map((t) => (
            <div
              key={t}
              className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                PREMIUM_TITLES.includes(t)
                  ? "border border-amber-400/40 bg-amber-400/10"
                  : "border border-aha/20 bg-aha/5"
              }`}
            >
              {PREMIUM_TITLES.includes(t) ? t : `🏆 ${t}`}
              {me.activeTitles.includes(t) && (
                <span className="ml-2 text-[10px] text-aha">ACTIVE</span>
              )}
            </div>
          ))}
        </div>
      )}

      <EditProfileModal open={edit} onClose={() => setEdit(false)} />
      <UserListModal
        open={list === "following"}
        title="フォロー中"
        users={followingUsers}
        onClose={() => setList(null)}
      />
      <UserListModal
        open={list === "followers"}
        title="フォロワー"
        users={followerUsers}
        onClose={() => setList(null)}
      />
    </div>
  );
}