"use client";

import { PostCard } from "@/components/PostCard";
import { ProfileRadar } from "@/components/ProfileRadar";
import { UserAvatar, UserBanner } from "@/components/UserAvatar";
import { UserListModal } from "@/components/UserListModal";
import { SampleAccountHint } from "@/components/SampleAccountHint";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { PREMIUM_TITLES, SUBJECTS, TIER_NAMES } from "@/lib/constants";
import { INITIAL_FOLLOWS } from "@/lib/mock-data";
import { useApp } from "@/lib/store";
import { verifiedBadgeTone } from "@/lib/verified";
import { ArrowLeft, Bell } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function UserPage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const { posts, follows, toggleFollow, me, users, userOf, authorVerified, searchUsers, notifyAuthors, toggleNotifyAuthor } = useApp();
  const decoded = decodeURIComponent(String(handle ?? "")).replace(/^@/, "");
  const user =
    users.find((u) => u.handle === decoded) ??
    users.find((u) => u.handle.toLowerCase() === decoded.toLowerCase());

  useEffect(() => {
    if (!decoded) return;
    void searchUsers(decoded);
  }, [decoded, searchUsers]);

  const [tab, setTab] = useState<"posts" | "solutions">("posts");
  const [list, setList] = useState<"following" | "followers" | null>(null);
  const theirs = useMemo(
    () =>
      user
        ? posts.filter(
            (p) => p.authorId === user.id && p.kind !== "sprint" && p.kind !== "reply",
          )
        : [],
    [posts, user],
  );

  const followingUsers = user
    ? user.id === me.id
      ? follows.map(userOf)
      : INITIAL_FOLLOWS.map(userOf).filter((u) => u.id !== user.id)
    : [];
  const followerUsers = user ? users.filter((u) => u.id !== user.id).slice(0, 4) : [];

  if (!user) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-muted">ユーザーが見つかりません</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-4 text-sm font-bold text-aha"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="absolute left-3 top-3 z-10 rounded-full bg-black/50 p-2"
      >
        <ArrowLeft size={18} />
      </button>
      <UserBanner user={user} />
      <div className="px-4">
        <UserAvatar user={user} className="-mt-10 h-20 w-20 border-4 border-black text-3xl" />
        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="flex items-center gap-1 text-xl font-black">
              {user.name}
              <VerifiedBadge show={authorVerified(user.id)} tone={verifiedBadgeTone(user)} />
            </h1>
            <p className="text-sm text-muted">@{user.handle}</p>
            <SampleAccountHint show={user.isSample} />
            {user.school ? <p className="mt-1 text-xs text-aha">{user.school}</p> : null}
          </div>
          {user.id !== me.id && (
            <div className="flex items-center gap-2">
              {follows.includes(user.id) && (
                <button
                  type="button"
                  onClick={() => void toggleNotifyAuthor(user.id)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    notifyAuthors.includes(user.id)
                      ? "bg-aha/20 text-aha"
                      : "border border-gray-700 text-muted"
                  }`}
                  aria-label={
                    notifyAuthors.includes(user.id)
                      ? "新着問題の通知をオフ"
                      : "このユーザーの新着問題を通知"
                  }
                  aria-pressed={notifyAuthors.includes(user.id)}
                >
                  <Bell size={18} fill={notifyAuthors.includes(user.id) ? "#ccff00" : "none"} />
                </button>
              )}
              <button
              onClick={() => toggleFollow(user.id)}
              className={`min-h-11 rounded-full px-4 py-1.5 text-sm font-bold ${
                follows.includes(user.id) ? "border border-gray-700" : "bg-white text-black"
              }`}
            >
              {follows.includes(user.id) ? "フォロー中" : "フォロー"}
            </button>
            </div>
          )}
        </div>
        <p className="mt-2 text-sm">{user.bio}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {user.activeTitles.map((t) => (
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
            <span className="font-bold text-white">
              {user.id === me.id ? follows.length : user.followingCount}
            </span>{" "}
            フォロー中
          </button>{" "}
          <button onClick={() => setList("followers")} className="ml-3 hover:underline">
            <span className="font-bold text-white">{user.followerCount}</span> フォロワー
          </button>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <span
              key={s.id}
              className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-[11px]"
            >
              {s.emoji} {TIER_NAMES[s.id][user.tiers[s.id]]}
            </span>
          ))}
        </div>
      </div>
      <ProfileRadar {...user.stats} />
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setTab("posts")}
          className={`flex-1 py-3 text-sm ${tab === "posts" ? "font-bold text-white" : "text-muted"}`}
        >
          ポスト
        </button>
        <button
          onClick={() => setTab("solutions")}
          className={`flex-1 py-3 text-sm ${tab === "solutions" ? "font-bold text-white" : "text-muted"}`}
        >
          解法
        </button>
      </div>
      {(tab === "posts"
        ? theirs.filter((p) => p.kind === "problem")
        : theirs.filter((p) => p.kind === "solution")
      ).map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
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
