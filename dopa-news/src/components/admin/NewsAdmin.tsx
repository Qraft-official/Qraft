"use client";

import Link from "next/link";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { EmptyState, ErrorState, RowSkeleton, Spinner } from "@/components/ui/States";
import { useToast } from "@/hooks/use-toast";
import { deleteNews, fetchAdminNews, updateNewsFlags } from "@/lib/admin-queries";
import { dateLabel } from "@/lib/format";
import { getSupabase } from "@/lib/supabase/client";
import type { NewsWithQuiz } from "@/types/database";

export default function NewsAdmin() {
  const { toast } = useToast();
  const [items, setItems] = useState<NewsWithQuiz[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsWithQuiz | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setFailed(false);
    try {
      setItems(await fetchAdminNews(getSupabase(), { search: term }));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(search), search ? 320 : 0);
    return () => clearTimeout(timer);
  }, [search, load]);

  async function toggle(article: NewsWithQuiz, patch: { is_published?: boolean; is_breaking?: boolean }) {
    setPendingId(article.id);
    try {
      await updateNewsFlags(getSupabase(), article.id, patch);
      setItems((prev) =>
        prev.map((item) => (item.id === article.id ? { ...item, ...patch } : item)),
      );
    } catch {
      toast("更新できませんでした", "error");
    } finally {
      setPendingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteNews(getSupabase(), target.id);
      setItems((prev) => prev.filter((item) => item.id !== target.id));
      toast("ニュースを削除しました", "success");
    } catch {
      toast("削除できませんでした", "error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <label className="card flex flex-1 items-center gap-2 px-3.5 py-2.5">
          <Search size={16} className="text-fg-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトル・キーワードで検索"
            className="w-full bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-faint"
          />
        </label>
        <Link
          href="/admin/news/new"
          className="grad-cta grid shrink-0 place-items-center rounded-[20px] px-4 text-[13px] font-black text-[#07121a]"
        >
          <span className="flex items-center gap-1">
            <Plus size={15} strokeWidth={3} />
            新規
          </span>
        </Link>
      </div>

      {loading ? (
        <RowSkeleton count={4} />
      ) : failed ? (
        <ErrorState message="ニュースを読み込めませんでした" onRetry={() => void load(search)} />
      ) : items.length === 0 ? (
        <EmptyState
          title={search ? "該当するニュースがありません" : "ニュースがまだありません"}
          description={search ? undefined : "「新規」から最初のニュースを作成できます。"}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((article) => (
            <li key={article.id} className="card px-3.5 py-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-md bg-white/8 px-1.5 py-[2px] text-[10px] font-bold text-fg-muted">
                      {article.category}
                    </span>
                    {article.is_breaking && (
                      <span className="rounded-md border border-[#ff5c7a]/45 bg-[#ff5c7a]/12 px-1.5 py-[2px] text-[10px] font-bold text-[#ff5c7a]">
                        速報
                      </span>
                    )}
                    {!article.is_published && (
                      <span className="rounded-md border border-[#ffc44d]/45 bg-[#ffc44d]/12 px-1.5 py-[2px] text-[10px] font-bold text-[#ffc44d]">
                        下書き
                      </span>
                    )}
                    {article.is_sample && (
                      <span className="rounded-md border border-line-strong px-1.5 py-[2px] text-[10px] font-bold text-fg-faint">
                        サンプル
                      </span>
                    )}
                    {article.quiz && (
                      <span className="rounded-md border border-[#a98bff]/40 bg-[#a98bff]/10 px-1.5 py-[2px] text-[10px] font-bold text-[#a98bff]">
                        クイズ{article.quiz.result_option ? "・結果あり" : ""}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13.5px] font-semibold leading-snug text-fg">
                    {article.title}
                  </p>
                  <p className="mt-1 text-[10.5px] text-fg-faint">
                    {dateLabel(article.published_at)} ・ {article.source_name}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2.5">
                <button
                  type="button"
                  onClick={() => void toggle(article, { is_published: !article.is_published })}
                  disabled={pendingId === article.id}
                  className="flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-1.5 text-[11.5px] font-bold text-fg active:bg-white/10 disabled:opacity-50"
                >
                  {pendingId === article.id ? (
                    <Spinner size={12} />
                  ) : article.is_published ? (
                    <EyeOff size={12} />
                  ) : (
                    <Eye size={12} />
                  )}
                  {article.is_published ? "非公開" : "公開"}
                </button>
                <button
                  type="button"
                  onClick={() => void toggle(article, { is_breaking: !article.is_breaking })}
                  disabled={pendingId === article.id}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11.5px] font-bold active:bg-white/10 disabled:opacity-50 ${
                    article.is_breaking
                      ? "border-[#ff5c7a]/50 text-[#ff5c7a]"
                      : "border-line-strong text-fg"
                  }`}
                >
                  <Zap size={12} />
                  速報
                </button>
                <Link
                  href={`/admin/news/${article.id}`}
                  className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-line-strong text-fg active:bg-white/10"
                  aria-label="編集"
                >
                  <Pencil size={13} />
                </Link>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(article)}
                  className="grid h-8 w-8 place-items-center rounded-full border border-[#ff5c7a]/35 text-[#ff5c7a] active:bg-[#ff5c7a]/10"
                  aria-label="削除"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="このニュースを削除しますか？"
        subtitle={deleteTarget?.title}
      >
        <div className="space-y-2.5 pt-1">
          <p className="text-[12px] leading-relaxed text-fg-muted">
            紐づくクイズ・投票・保存も一緒に削除され、元に戻せません。
          </p>
          <button
            type="button"
            onClick={() => void confirmDelete()}
            className="w-full rounded-2xl border border-[#ff5c7a]/40 bg-[#ff5c7a]/10 py-3 text-[14px] font-bold text-[#ff5c7a]"
          >
            削除する
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="w-full rounded-2xl border border-line-strong py-3 text-[14px] font-bold text-fg"
          >
            キャンセル
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
