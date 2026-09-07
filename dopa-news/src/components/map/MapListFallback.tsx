"use client";

import { MapPin, ThumbsUp, TriangleAlert } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { timeLabel } from "@/lib/format";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { mapCategory } from "@/lib/map-categories";
import type { MapPostWithAuthor } from "@/types/database";

/**
 * Shown instead of the MapLibre canvas when the browser has no WebGL context.
 * The same posts stay reachable — sorted by distance rather than plotted — so
 * the Dopa Map never degrades into a blank screen.
 */
export default function MapListFallback({
  posts,
  userCoords,
  onSelect,
}: {
  posts: MapPostWithAuthor[];
  userCoords: { lat: number; lng: number } | null;
  onSelect: (post: MapPostWithAuthor) => void;
}) {
  const now = useNow();

  const ordered = userCoords
    ? [...posts].sort(
        (a, b) =>
          distanceMeters(userCoords, { lat: a.latitude, lng: a.longitude }) -
          distanceMeters(userCoords, { lat: b.latitude, lng: b.longitude }),
      )
    : posts;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-ink-900 px-3 pb-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px)+150px)] pt-[calc(env(safe-area-inset-top,0px)+118px)]">
      <div className="mb-3 flex items-start gap-2 rounded-2xl border border-[#ffc44d]/35 bg-[#ffc44d]/[0.08] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#ffc44d]">
        <TriangleAlert size={13} className="mt-[2px] shrink-0" />
        <span>
          お使いの環境では地図を表示できないため、一覧で表示しています。投稿の閲覧・投稿はそのまま利用できます。
        </span>
      </div>

      {ordered.length === 0 ? (
        <p className="px-1 py-8 text-center text-[12.5px] text-fg-faint">
          この種類の投稿はまだありません。
        </p>
      ) : (
        <div className="space-y-2">
          {ordered.map((post) => {
            const meta = mapCategory(post.category);
            const distance = userCoords
              ? formatDistance(
                  distanceMeters(userCoords, { lat: post.latitude, lng: post.longitude }),
                )
              : null;

            return (
              <button
                key={post.id}
                type="button"
                onClick={() => onSelect(post)}
                className="card flex w-full items-center gap-3 p-3 text-left active:bg-ink-700"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-[17px]"
                  style={{
                    borderColor: meta.color,
                    boxShadow: `0 0 14px -3px ${meta.color}88`,
                  }}
                >
                  {meta.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-bold text-fg">{meta.label}</span>
                    {post.urgency && (
                      <span className="rounded-md border border-[#ff5c7a]/50 bg-[#ff5c7a]/15 px-1.5 py-[1px] text-[10px] font-bold text-[#ff5c7a]">
                        🚨 緊急
                      </span>
                    )}
                  </span>
                  {post.comment && (
                    <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-fg/90">
                      {post.comment}
                    </span>
                  )}
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[10.5px] text-fg-faint">
                    <span>{timeLabel(post.created_at, now)}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={10} />
                      {post.area ?? "日本国内"}
                    </span>
                    {distance && <span>現在地から{distance}</span>}
                  </span>
                </span>
                {post.helpful_count > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-fg-muted">
                    <ThumbsUp size={12} />
                    {post.helpful_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
