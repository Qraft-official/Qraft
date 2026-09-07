"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bell,
  Bookmark,
  ChevronRight,
  MapPin,
  Settings,
  Shield,
  ThumbsUp,
  UserCog,
  Vote,
} from "lucide-react";
import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import EditProfileSheet from "./EditProfileSheet";
import { PageHeader } from "@/components/navigation/TopBar";
import { EmptyState, RowSkeleton, Spinner } from "@/components/ui/States";
import { useSession } from "@/hooks/use-session";
import { dateLabel, relativeTime } from "@/lib/format";
import { mapCategory } from "@/lib/map-categories";
import { fetchMyPosts } from "@/lib/map-queries";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { MapPostWithAuthor } from "@/types/database";

interface Stats {
  posts: number;
  votes: number;
  helpful: number;
  saved: number;
}

export default function ProfileScreen() {
  const { user, profile, loading, savedIds, unreadCount, refreshProfile } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [posts, setPosts] = useState<MapPostWithAuthor[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editing, setEditing] = useState(false);
  /** Freshness of map posts is judged as of the moment they were fetched. */
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    // Signed-out visitors get the login gate instead of this data.
    if (!user || !isSupabaseConfigured) return;
    let active = true;

    async function load() {
      if (!user) return;
      const supabase = getSupabase();
      try {
        const [myPosts, voteCount] = await Promise.all([
          fetchMyPosts(supabase, user.id),
          supabase
            .from("news_votes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);
        if (!active) return;
        setPosts(myPosts);
        setLoadedAt(Date.now());
        setStats({
          posts: myPosts.length,
          votes: voteCount.count ?? 0,
          helpful: myPosts.reduce((sum, post) => sum + post.helpful_count, 0),
          saved: savedIds.size,
        });
      } catch {
        if (active) setStats(null);
      } finally {
        if (active) setLoadingPosts(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user, savedIds.size]);

  if (loading) {
    return (
      <main className="pad-nav min-h-dvh">
        <PageHeader title="マイページ" />
        <div className="grid min-h-[50dvh] place-items-center text-fg-faint">
          <Spinner size={22} />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="pad-nav min-h-dvh">
        <PageHeader title="マイページ" />
        <div className="px-4 pt-8">
          <EmptyState
            icon={<UserCog size={26} />}
            title="ログインするともっと楽しめます"
            description="投票・保存・ドパマップ投稿はアカウントが必要です。ニュースを読むだけならログイン不要です。"
            action={
              <Link
                href="/login?next=/me"
                className="grad-cta rounded-full px-5 py-2.5 text-[13px] font-black text-[#07121a]"
              >
                ログイン / 新規登録
              </Link>
            }
          />
          <div className="mt-4 space-y-2">
            <Link
              href="/terms"
              className="card flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold"
            >
              利用規約
              <ChevronRight size={17} className="text-fg-faint" />
            </Link>
            <Link
              href="/privacy"
              className="card flex items-center justify-between px-4 py-3.5 text-[14px] font-semibold"
            >
              プライバシーポリシー
              <ChevronRight size={17} className="text-fg-faint" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const displayName = profile?.username ?? "ユーザー";

  return (
    <main className="pad-nav min-h-dvh">
      <PageHeader title="マイページ" />

      <div className="space-y-3 px-4 pt-3.5">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3.5">
            <Avatar url={profile?.avatar_url ?? null} name={displayName} size={62} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-[18px] font-black text-fg">{displayName}</h2>
                {profile?.is_admin && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#a98bff]/45 bg-[#a98bff]/12 px-1.5 py-[2px] text-[10px] font-bold text-[#a98bff]">
                    <Shield size={10} /> 管理者
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[11.5px] text-fg-faint">
                {profile ? `${dateLabel(profile.created_at)}から利用中` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-full border border-line-strong px-3 py-1.5 text-[12px] font-bold text-fg active:bg-white/10"
            >
              編集
            </button>
          </div>

          {profile?.bio && (
            <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">{profile.bio}</p>
          )}

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "マップ投稿", value: stats?.posts ?? 0, Icon: MapPin, tone: "#35dcff" },
              { label: "投票", value: stats?.votes ?? 0, Icon: Vote, tone: "#a98bff" },
              { label: "役に立った", value: stats?.helpful ?? 0, Icon: ThumbsUp, tone: "#4ef5a3" },
              { label: "保存", value: savedIds.size, Icon: Bookmark, tone: "#ffc44d" },
            ].map(({ label, value, Icon, tone }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-ink-700 py-2.5"
              >
                <Icon size={14} style={{ color: tone }} />
                <span className="text-[16px] font-black tabular-nums text-fg">{value}</span>
                <span className="text-[9.5px] font-semibold text-fg-faint">{label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <section>
          <h3 className="mb-2 px-0.5 text-[12px] font-bold text-fg-muted">
            ドパマップの投稿履歴
          </h3>
          {loadingPosts ? (
            <RowSkeleton count={2} />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<MapPin size={22} />}
              title="マップへの投稿はまだありません"
              description="ドパマップの「＋」から、いまの天気や街の様子を共有できます。"
              action={
                <Link
                  href="/map"
                  className="rounded-full border border-line-strong px-4 py-2 text-[12.5px] font-bold text-fg"
                >
                  ドパマップを開く
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2">
              {posts.slice(0, 6).map((post) => {
                const meta = mapCategory(post.category);
                const expired = new Date(post.expires_at).getTime() < loadedAt;
                return (
                  <li key={post.id} className="card flex items-center gap-3 px-3.5 py-3">
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[19px]"
                      style={{
                        background: `${meta.color}18`,
                        border: `1px solid ${meta.color}44`,
                      }}
                    >
                      {meta.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-fg">
                        {post.comment || meta.label}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-fg-faint">
                        {relativeTime(post.created_at)} ・ {post.area ?? "日本国内"}
                        {expired ? " ・ 表示期限切れ" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11.5px] font-bold text-[#4ef5a3]">
                      👍 {post.helpful_count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2 pt-1">
          <Link
            href="/notifications"
            className="card flex items-center gap-3 px-4 py-3.5 active:bg-ink-700"
          >
            <Bell size={17} className="text-fg-muted" />
            <span className="flex-1 text-[14px] font-semibold">通知</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#ff5c7a] px-2 py-[2px] text-[10px] font-bold text-[#0b0d12]">
                {unreadCount}
              </span>
            )}
            <ChevronRight size={17} className="text-fg-faint" />
          </Link>
          <Link
            href="/me/settings"
            className="card flex items-center gap-3 px-4 py-3.5 active:bg-ink-700"
          >
            <Settings size={17} className="text-fg-muted" />
            <span className="flex-1 text-[14px] font-semibold">設定</span>
            <ChevronRight size={17} className="text-fg-faint" />
          </Link>
          {profile?.is_admin && (
            <Link
              href="/admin"
              className="card flex items-center gap-3 px-4 py-3.5 active:bg-ink-700"
            >
              <Shield size={17} className="text-[#a98bff]" />
              <span className="flex-1 text-[14px] font-semibold">管理画面</span>
              <ChevronRight size={17} className="text-fg-faint" />
            </Link>
          )}
        </section>
      </div>

      <EditProfileSheet
        open={editing}
        onClose={() => setEditing(false)}
        onSaved={() => void refreshProfile()}
      />
    </main>
  );
}
