"use client";

import { Eye, EyeOff, Siren, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/ui/States";
import { useToast } from "@/hooks/use-toast";
import { deleteMapPost, fetchAdminMapPosts, setMapPostHidden } from "@/lib/admin-queries";
import { relativeTime } from "@/lib/format";
import { mapCategory } from "@/lib/map-categories";
import { getSupabase } from "@/lib/supabase/client";
import type { MapPostWithAuthor } from "@/types/database";

type Filter = "all" | "urgent" | "reported" | "hidden";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "urgent", label: "緊急" },
  { id: "reported", label: "通報あり" },
  { id: "hidden", label: "非表示中" },
];

export default function MapPostsAdmin() {
  const { toast } = useToast();
  const [items, setItems] = useState<MapPostWithAuthor[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const rows = await fetchAdminMapPosts(getSupabase());
        if (!active) return;
        setItems(rows);
        setLoadedAt(Date.now());
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
  }, [reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  async function toggleHidden(post: MapPostWithAuthor) {
    const next = !post.is_hidden;
    setItems((prev) =>
      prev.map((item) => (item.id === post.id ? { ...item, is_hidden: next } : item)),
    );
    try {
      await setMapPostHidden(getSupabase(), post.id, next);
      toast(next ? "投稿を非表示にしました" : "投稿を再表示しました", "success");
    } catch {
      setItems((prev) =>
        prev.map((item) => (item.id === post.id ? { ...item, is_hidden: !next } : item)),
      );
      toast("更新できませんでした", "error");
    }
  }

  async function remove(post: MapPostWithAuthor) {
    const snapshot = items;
    setItems((prev) => prev.filter((item) => item.id !== post.id));
    try {
      await deleteMapPost(getSupabase(), post.id);
      toast("投稿を削除しました", "success");
    } catch {
      setItems(snapshot);
      toast("削除できませんでした", "error");
    }
  }

  const visible = items.filter((post) => {
    if (filter === "urgent") return post.urgency;
    if (filter === "reported") return post.report_count > 0;
    if (filter === "hidden") return post.is_hidden;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold ${
              filter === item.id
                ? "border-[#4ef5a3]/50 bg-[#4ef5a3]/12 text-[#4ef5a3]"
                : "border-line-strong text-fg-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <RowSkeleton count={4} />
      ) : failed ? (
        <ErrorState message="投稿を読み込めませんでした" onRetry={retry} />
      ) : visible.length === 0 ? (
        <EmptyState title="該当する投稿がありません" />
      ) : (
        <ul className="space-y-2">
          {visible.map((post) => {
            const meta = mapCategory(post.category);
            const expired = new Date(post.expires_at).getTime() < loadedAt;
            return (
              <li key={post.id} className="card px-3.5 py-3">
                <div className="flex gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[19px]"
                    style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}44` }}
                  >
                    {meta.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[12px] font-bold" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      {post.urgency && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#ff5c7a]/45 bg-[#ff5c7a]/12 px-1.5 py-[2px] text-[10px] font-bold text-[#ff5c7a]">
                          <Siren size={9} /> 緊急
                        </span>
                      )}
                      {post.report_count > 0 && (
                        <span className="rounded-md border border-[#ffc44d]/45 bg-[#ffc44d]/12 px-1.5 py-[2px] text-[10px] font-bold text-[#ffc44d]">
                          通報 {post.report_count}
                        </span>
                      )}
                      {post.is_hidden && (
                        <span className="rounded-md border border-line-strong px-1.5 py-[2px] text-[10px] font-bold text-fg-faint">
                          非表示中
                        </span>
                      )}
                      {post.is_sample && (
                        <span className="rounded-md border border-line-strong px-1.5 py-[2px] text-[10px] font-bold text-fg-faint">
                          サンプル
                        </span>
                      )}
                    </div>
                    {post.comment && (
                      <p className="mt-1 text-[13px] leading-snug text-fg">{post.comment}</p>
                    )}
                    <p className="mt-1 text-[10.5px] text-fg-faint">
                      {relativeTime(post.created_at)} ・ {post.area ?? "日本国内"} ・{" "}
                      {post.author_name} ・ 👍 {post.helpful_count}
                      {expired ? " ・ 期限切れ" : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
                  <button
                    type="button"
                    onClick={() => void toggleHidden(post)}
                    className="flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1.5 text-[11.5px] font-bold text-fg active:bg-white/10"
                  >
                    {post.is_hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    {post.is_hidden ? "再表示" : "非表示"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(post)}
                    className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-[#ff5c7a]/35 text-[#ff5c7a] active:bg-[#ff5c7a]/10"
                    aria-label="削除"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
