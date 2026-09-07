"use client";

import { useEffect, useState } from "react";
import AdminShell from "./AdminShell";
import MapPostsAdmin from "./MapPostsAdmin";
import NewsAdmin from "./NewsAdmin";
import ReportsAdmin from "./ReportsAdmin";
import UsersAdmin from "./UsersAdmin";
import { useSession } from "@/hooks/use-session";
import { fetchAdminStats, type AdminStats } from "@/lib/admin-queries";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Tab = "news" | "map" | "reports" | "users";

const TABS: { id: Tab; label: string }[] = [
  { id: "news", label: "ニュース" },
  { id: "map", label: "マップ投稿" },
  { id: "reports", label: "通報" },
  { id: "users", label: "ユーザー" },
];

export default function AdminDashboard() {
  const { profile } = useSession();
  const [tab, setTab] = useState<Tab>("news");
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!profile?.is_admin || !isSupabaseConfigured) return;
    let active = true;
    void fetchAdminStats(getSupabase())
      .then((value) => {
        if (active) setStats(value);
      })
      .catch(() => {
        if (active) setStats(null);
      });
    return () => {
      active = false;
    };
  }, [profile?.is_admin]);

  return (
    <AdminShell title="管理画面" backHref="/me">
      <div className="px-4 pt-3.5">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "ニュース", value: stats?.news },
            { label: "下書き", value: stats?.drafts },
            { label: "マップ", value: stats?.mapPosts },
            { label: "未対応通報", value: stats?.openReports },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-line bg-ink-700 px-2 py-2.5 text-center"
            >
              <p className="text-[17px] font-black tabular-nums text-fg">
                {item.value ?? "–"}
              </p>
              <p className="mt-0.5 text-[9.5px] font-semibold text-fg-faint">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="no-scrollbar -mx-4 mt-3.5 flex gap-2 overflow-x-auto px-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                tab === item.id
                  ? "grad-cta text-[#07121a]"
                  : "border border-line-strong text-fg-muted"
              }`}
            >
              {item.label}
              {item.id === "reports" && (stats?.openReports ?? 0) > 0 && (
                <span className="ml-1.5 rounded-full bg-[#ff5c7a] px-1.5 py-[1px] text-[10px] font-bold text-[#0b0d12]">
                  {stats?.openReports}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="pt-3.5">
          {tab === "news" && <NewsAdmin />}
          {tab === "map" && <MapPostsAdmin />}
          {tab === "reports" && <ReportsAdmin />}
          {tab === "users" && <UsersAdmin />}
        </div>
      </div>
    </AdminShell>
  );
}
