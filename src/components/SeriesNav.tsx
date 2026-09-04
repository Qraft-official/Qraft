"use client";

import { createSeries, fetchMySeries } from "@/lib/learn-client";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export function SeriesNav({ post }: { post: Post }) {
  const { posts } = useApp();
  if (!post.seriesId || !post.seriesTitle) return null;
  const siblings = posts
    .filter((p) => p.seriesId === post.seriesId)
    .sort((a, b) => (a.seriesOrd ?? 0) - (b.seriesOrd ?? 0));
  const idx = siblings.findIndex((p) => p.id === post.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  return (
    <div className="mt-2 rounded-xl border border-gray-800 px-3 py-2">
      <Link href={`/series/${post.seriesId}`} className="text-xs font-bold text-aha">
        シリーズ · {post.seriesTitle}
      </Link>
      <div className="mt-1 flex gap-2">
        {prev && (
          <Link href={`/p/${prev.id}`} className="text-xs text-muted">
            ← 前へ
          </Link>
        )}
        {next && (
          <Link href={`/p/${next.id}`} className="ml-auto text-xs text-muted">
            次へ →
          </Link>
        )}
      </div>
    </div>
  );
}

export function SeriesAssignSheet({
  post,
  open,
  onClose,
}: {
  post: Post;
  open: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [list, setList] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const { posts, assignToSeries } = useApp();

  useEffect(() => {
    if (!open) return;
    void fetchMySeries().then((rows) => setList(rows.map((r) => ({ id: r.id, title: r.title }))));
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-800 bg-[#15202b] p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="シリーズ"
      >
        <p className="text-sm font-black">シリーズに追加</p>
        <div className="mt-3 grid gap-2">
          {list.map((s) => (
            <button
              key={s.id}
              type="button"
              className="min-h-11 rounded-full border border-gray-700 text-sm font-bold"
              onClick={() => {
                const ord = posts.filter((p) => p.seriesId === s.id).length;
                setBusy(true);
                void assignToSeries(post.id, s.id, s.title, ord).then(() => {
                  setBusy(false);
                  onClose();
                });
              }}
              disabled={busy}
            >
              {s.title}
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="新しいシリーズ名"
          className="mt-3 w-full rounded-xl border border-gray-700 bg-black px-3 py-2 text-sm"
        />
        <button
          type="button"
          className="mt-2 min-h-11 w-full rounded-full bg-aha text-sm font-black text-black disabled:opacity-40"
          disabled={busy || !title.trim()}
          onClick={() => {
            setBusy(true);
            void createSeries(title).then((res) => {
              if (res.series) {
                void assignToSeries(post.id, res.series.id, res.series.title, 0);
              }
              setBusy(false);
              onClose();
            });
          }}
        >
          作成して追加
        </button>
      </div>
    </div>
  );
}
