"use client";

import Link from "next/link";
import { Check, ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { useToast } from "@/hooks/use-toast";
import { fetchReports, setReportStatus } from "@/lib/admin-queries";
import { relativeTime } from "@/lib/format";
import { getSupabase } from "@/lib/supabase/client";
import type { ReportRow } from "@/types/database";

type StatusFilter = "open" | "reviewed" | "dismissed" | "all";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "open", label: "未対応" },
  { id: "reviewed", label: "対応済み" },
  { id: "dismissed", label: "却下" },
  { id: "all", label: "すべて" },
];

const TARGET_LABEL: Record<string, string> = {
  map_post: "マップ投稿",
  news: "ニュース",
  profile: "ユーザー",
};

export default function ReportsAdmin() {
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("open");
  const [items, setItems] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const rows = await fetchReports(getSupabase(), status);
        if (!active) return;
        setItems(rows);
        setFailed(false);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [status, reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  async function resolve(report: ReportRow, next: "reviewed" | "dismissed") {
    const snapshot = items;
    setItems((prev) =>
      status === "all"
        ? prev.map((item) => (item.id === report.id ? { ...item, status: next } : item))
        : prev.filter((item) => item.id !== report.id),
    );
    try {
      await setReportStatus(getSupabase(), report.id, next);
      toast(next === "reviewed" ? "対応済みにしました" : "却下しました", "success");
    } catch {
      setItems(snapshot);
      toast("更新できませんでした", "error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (tab.id === status) return;
              setLoading(true);
              setStatus(tab.id);
            }}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold ${
              status === tab.id
                ? "border-[#4ef5a3]/50 bg-[#4ef5a3]/12 text-[#4ef5a3]"
                : "border-line-strong text-fg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <RowSkeleton count={3} />
      ) : failed ? (
        <ErrorState message="通報を読み込めませんでした" onRetry={retry} />
      ) : items.length === 0 ? (
        <EmptyState
          title={status === "open" ? "未対応の通報はありません" : "該当する通報はありません"}
          description={status === "open" ? "新しい通報が届くとここに表示されます。" : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((report) => (
            <li key={report.id} className="card px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-white/8 px-1.5 py-[2px] text-[10px] font-bold text-fg-muted">
                  {TARGET_LABEL[report.target_type] ?? report.target_type}
                </span>
                <span
                  className={`rounded-md px-1.5 py-[2px] text-[10px] font-bold ${
                    report.status === "open"
                      ? "border border-[#ffc44d]/45 bg-[#ffc44d]/12 text-[#ffc44d]"
                      : "border border-line-strong text-fg-faint"
                  }`}
                >
                  {report.status === "open"
                    ? "未対応"
                    : report.status === "reviewed"
                      ? "対応済み"
                      : "却下"}
                </span>
                <span className="ml-auto text-[10.5px] text-fg-faint">
                  {relativeTime(report.created_at)}
                </span>
              </div>
              <p className="mt-1.5 text-[13.5px] font-semibold text-fg">{report.reason}</p>
              <p className="mt-1 break-all text-[10.5px] text-fg-faint">
                対象ID: {report.target_id}
              </p>

              <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
                {report.target_type === "news" && (
                  <Link
                    href={`/news/${report.target_id}`}
                    className="flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1.5 text-[11.5px] font-bold text-fg active:bg-white/10"
                  >
                    <ExternalLink size={12} />
                    対象を見る
                  </Link>
                )}
                {report.status === "open" && (
                  <>
                    <button
                      type="button"
                      onClick={() => void resolve(report, "reviewed")}
                      className="ml-auto flex items-center gap-1 rounded-full border border-[#4ef5a3]/45 px-2.5 py-1.5 text-[11.5px] font-bold text-[#4ef5a3] active:bg-[#4ef5a3]/10"
                    >
                      <Check size={12} />
                      対応済み
                    </button>
                    <button
                      type="button"
                      onClick={() => void resolve(report, "dismissed")}
                      className="flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1.5 text-[11.5px] font-bold text-fg-muted active:bg-white/10"
                    >
                      <X size={12} />
                      却下
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
