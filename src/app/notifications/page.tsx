"use client";

import { EmptyState } from "@/components/UiStates";
import { useApp } from "@/lib/store";
import {
  Bell,
  Gift,
  Heart,
  MessageCircle,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}日前`;
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kindOf(title: string, message: string) {
  const t = `${title}${message}`;
  const postMatch = `${title}\n${message}`.match(/\/p\/([a-zA-Z0-9_-]+)/);
  const postHref = postMatch ? `/p/${postMatch[1]}` : null;
  if (/Welcome Mission|紹介|招待|半額/.test(t)) {
    return { label: "紹介", Icon: Gift, href: "/welcome-mission" };
  }
  if (/リベンジ/.test(t)) return { label: "リベンジ", Icon: Sparkles, href: postHref ?? "/" };
  if (/新着問題/.test(t)) return { label: "新着", Icon: Bell, href: postHref ?? "/" };
  if (/フォロー/.test(t)) return { label: "フォロー", Icon: UserPlus, href: "/discover?view=users" };
  if (/コメント|返信/.test(t)) return { label: "コメント", Icon: MessageCircle, href: postHref ?? "/" };
  if (/Aha|リアクション|脳汁/.test(t)) return { label: "Aha", Icon: Heart, href: postHref ?? "/" };
  if (/解答|回答|解法/.test(t)) return { label: "回答", Icon: Sparkles, href: postHref ?? "/" };
  if (/Premium|プレミアム/.test(t)) return { label: "Premium", Icon: Sparkles, href: "/premium" };
  return { label: "システム", Icon: Bell, href: postHref ?? "/" };
}

export default function NotificationsPage() {
  const { notifications, refreshNotifications, markNotificationRead } = useApp();
  const router = useRouter();

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  return (
    <div>
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-black/80 px-4 py-4 backdrop-blur">
        <h1 className="flex items-center gap-2 text-lg font-black">
          <Bell size={18} className="text-aha" />
          通知
        </h1>
      </header>

      {notifications.length === 0 ? (
        <EmptyState
          title="通知はまだありません"
          body="Aha・コメント・紹介が届くと、ここに表示されます。"
          actionHref="/"
          actionLabel="問題を見にいく"
        />
      ) : (
        <ul>
          {notifications.map((n) => {
            const kind = kindOf(n.title, n.message);
            const href = n.link || kind.href;
            const Icon = kind.Icon;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    void markNotificationRead(n.id);
                    router.push(href);
                  }}
                  className={`w-full border-b border-gray-800 px-4 py-3 text-left ${
                    n.isRead ? "bg-black" : "bg-aha/5"
                  }`}
                >
                  <div className="flex gap-3">
                    <span
                      className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        n.isRead ? "bg-white/5 text-muted" : "bg-aha/15 text-aha"
                      }`}
                      aria-hidden
                    >
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${n.isRead ? "font-bold text-white" : "font-black text-white"}`}>
                          <span className="mr-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold text-muted">
                            {kind.label}
                          </span>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="未読" />
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#c5cdd6]">
                        {n.message}
                      </p>
                      <p className="mt-2 text-xs text-muted">{formatWhen(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
