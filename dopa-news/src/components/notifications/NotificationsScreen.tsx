"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCheck, MapPin, Newspaper, Siren, Vote } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/navigation/TopBar";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { dayKey, relativeTime } from "@/lib/format";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AppNotification, NotificationType } from "@/types/database";

const TYPE_STYLE: Record<
  NotificationType,
  { label: string; color: string; Icon: typeof Bell }
> = {
  breaking: { label: "速報", color: "#ff5c7a", Icon: Siren },
  local_emergency: { label: "地域の緊急情報", color: "#ffc44d", Icon: AlertTriangle },
  vote_result: { label: "投票結果", color: "#a98bff", Icon: Vote },
  important: { label: "重要ニュース", color: "#35dcff", Icon: Newspaper },
  map_nearby: { label: "ドパマップ", color: "#4ef5a3", Icon: MapPin },
};

function styleFor(type: string) {
  return TYPE_STYLE[type as NotificationType] ?? TYPE_STYLE.important;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user, loading: sessionLoading, refreshUnread } = useSession();
  const { toast } = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  /** Timestamp of the last successful load; used for the day headings. */
  const [loadedAt, setLoadedAt] = useState(0);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (sessionLoading || !user || !isSupabaseConfigured) return;
    let active = true;

    async function load(userId: string) {
      const { data, error } = await getSupabase()
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(80);
      if (!active) return;
      if (error) {
        setFailed(true);
        setItems([]);
      } else {
        setFailed(false);
        setItems((data ?? []) as AppNotification[]);
        setLoadedAt(Date.now());
      }
      setLoading(false);
    }

    void load(user.id);
    return () => {
      active = false;
    };
  }, [sessionLoading, user, reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!user || ids.length === 0) return;
      setItems((prev) =>
        prev.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)),
      );
      await getSupabase()
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .in("id", ids);
      void refreshUnread();
    },
    [user, refreshUnread],
  );

  async function handleOpen(item: AppNotification) {
    if (!item.read) void markRead([item.id]);
    if (item.link) router.push(item.link);
  }

  async function handleMarkAll() {
    const unread = items.filter((item) => !item.read).map((item) => item.id);
    if (unread.length === 0) return;
    await markRead(unread);
    toast("すべて既読にしました", "success");
  }

  const unreadCount = items.filter((item) => !item.read).length;

  if (!sessionLoading && !user) {
    return (
      <main className="pad-nav min-h-dvh">
        <PageHeader title="通知" backHref="/me" />
        <div className="px-4 pt-8">
          <EmptyState
            icon={<Bell size={24} />}
            title="通知はログイン後に届きます"
            description="速報や、投票したニュースの答え合わせをお知らせします。"
            action={
              <Link
                href="/login?next=/notifications"
                className="grad-cta rounded-full px-5 py-2.5 text-[13px] font-black text-[#07121a]"
              >
                ログイン / 新規登録
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  // Notifications arrive newest-first, so day buckets stay in order.
  const today = dayKey(new Date(loadedAt).toISOString());
  const yesterday = dayKey(new Date(loadedAt - 86_400_000).toISOString());
  const groups: { key: string; label: string; items: AppNotification[] }[] = [];
  for (const item of items) {
    const key = dayKey(item.created_at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else {
      const label = key === today ? "今日" : key === yesterday ? "昨日" : key;
      groups.push({ key, label, items: [item] });
    }
  }

  return (
    <main className="pad-nav min-h-dvh">
      <PageHeader
        title="通知"
        backHref="/me"
        right={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAll}
              className="mr-1 inline-flex items-center gap-1 rounded-full border border-line-strong px-3 py-1.5 text-[12px] font-bold text-fg active:bg-white/10"
            >
              <CheckCheck size={13} />
              すべて既読
            </button>
          ) : undefined
        }
      />

      <div className="px-4 pt-3.5">
        {loading || sessionLoading ? (
          <RowSkeleton count={4} />
        ) : failed ? (
          <ErrorState message="通知を読み込めませんでした" onRetry={retry} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell size={24} />}
            title="新しい通知はありません"
            description="速報や、あなたが投票したニュースの結果が出たときにここに届きます。通知の種類は設定から変更できます。"
            action={
              <Link
                href="/me/settings"
                className="rounded-full border border-line-strong px-4 py-2 text-[12.5px] font-bold text-fg"
              >
                通知設定を開く
              </Link>
            }
          />
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="mb-2 px-0.5 text-[11.5px] font-bold text-fg-faint">
                  {group.label}
                </h2>
                <ul className="space-y-2">
                  {group.items.map((item, index) => {
                    const { label, color, Icon } = styleFor(item.type);
                    return (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.2) }}
                      >
                        <button
                          type="button"
                          onClick={() => void handleOpen(item)}
                          className={`card flex w-full gap-3 px-3.5 py-3 text-left active:bg-ink-700 ${
                            item.read ? "opacity-65" : ""
                          }`}
                          style={
                            item.read ? undefined : { borderColor: `${color}3d` }
                          }
                        >
                          <span
                            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                            style={{ background: `${color}18`, border: `1px solid ${color}44` }}
                          >
                            <Icon size={16} style={{ color }} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="text-[10px] font-bold tracking-wide"
                                style={{ color }}
                              >
                                {label}
                              </span>
                              {!item.read && (
                                <span
                                  className="h-[6px] w-[6px] rounded-full"
                                  style={{ background: color }}
                                />
                              )}
                              <span className="ml-auto shrink-0 text-[10.5px] text-fg-faint">
                                {relativeTime(item.created_at)}
                              </span>
                            </span>
                            <span className="mt-1 block text-[13.5px] font-semibold leading-snug text-fg">
                              {item.title}
                            </span>
                            {item.body && (
                              <span className="mt-1 block line-clamp-2 text-[12px] leading-relaxed text-fg-muted">
                                {item.body}
                              </span>
                            )}
                          </span>
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
