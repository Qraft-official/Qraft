"use client";

import { PostCard } from "@/components/PostCard";
import { fetchSeriesById } from "@/lib/learn-client";
import { useApp } from "@/lib/store";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function SeriesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { posts, me, assignToSeries } = useApp();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void fetchSeriesById(id).then((s) => {
      if (s) {
        setTitle(s.title);
        setDesc(s.description);
        setOwnerId(s.ownerId);
      }
    });
  }, [id]);

  const items = useMemo(
    () =>
      posts
        .filter((p) => p.seriesId === id)
        .sort((a, b) => (a.seriesOrd ?? 0) - (b.seriesOrd ?? 0)),
    [posts, id],
  );
  const canReorder = ownerId === me.id;

  const move = (index: number, dir: -1 | 1) => {
    const other = items[index + dir];
    const cur = items[index];
    if (!cur || !other || !id) return;
    const aOrd = cur.seriesOrd ?? index;
    const bOrd = other.seriesOrd ?? index + dir;
    void assignToSeries(cur.id, id, title, bOrd);
    void assignToSeries(other.id, id, title, aOrd);
  };

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-black/80 px-3 py-3 backdrop-blur">
        <button type="button" className="tap-target" onClick={() => router.back()} aria-label="戻る">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="font-bold">{title || "シリーズ"}</p>
          {desc && <p className="text-xs text-muted">{desc}</p>}
        </div>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted">このシリーズの問題はまだありません。</p>
      ) : (
        items.map((p, i) => (
          <div key={p.id}>
            {canReorder && items.length > 1 && (
              <div className="flex justify-end gap-1 px-4 pt-2">
                <button
                  type="button"
                  className="tap-target text-muted disabled:opacity-30"
                  aria-label="上へ"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  type="button"
                  className="tap-target text-muted disabled:opacity-30"
                  aria-label="下へ"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronDown size={18} />
                </button>
              </div>
            )}
            <PostCard post={p} />
          </div>
        ))
      )}
    </div>
  );
}
