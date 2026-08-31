"use client";

import { useApp } from "@/lib/store";
import { Bell } from "lucide-react";
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

export default function NotificationsPage() {
  const { notifications, refreshNotifications, markNotificationRead } = useApp();

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
        <p className="px-4 py-10 text-center text-sm text-muted">通知はまだありません</p>
      ) : (
        <ul>
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void markNotificationRead(n.id)}
                className={`w-full border-b border-gray-800 px-4 py-3 text-left ${
                  n.isRead ? "bg-black" : "bg-aha/5"
                }`}
              >
                <div className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${
                      n.isRead ? "bg-white/5" : "bg-aha/15"
                    }`}
                    aria-hidden
                  >
                    {Array.from(n.title)[0] || "🔔"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.isRead ? "font-bold text-white" : "font-black text-white"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-label="未読" />
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#c5cdd6]">
                      {n.message}
                    </p>
                    <p className="mt-2 text-[11px] text-muted">{formatWhen(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
