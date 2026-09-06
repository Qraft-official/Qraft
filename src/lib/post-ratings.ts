import { supabase } from "./supabase";
import type { Post, RatingKind } from "./types";

export type PostRatingStat = {
  postId: string;
  kind: RatingKind;
  ratingSum: number;
  ratingCount: number;
  myStars: number;
};

export function optimisticRatingAggregate(input: {
  average: number;
  count: number;
  myRating: number;
  nextRating: number;
}): { average: number; count: number; sum: number } {
  const oldCount = Math.max(0, input.count);
  const oldAvg = oldCount > 0 ? input.average : 0;
  const oldMy = input.myRating > 0 ? input.myRating : 0;
  const next = input.nextRating > 0 ? input.nextRating : 0;
  let count = oldCount;
  let sum = oldAvg * oldCount;
  if (oldMy > 0 && next > 0) {
    sum = sum - oldMy + next;
  } else if (oldMy > 0 && next === 0) {
    sum = sum - oldMy;
    count = Math.max(0, oldCount - 1);
  } else if (oldMy === 0 && next > 0) {
    sum = sum + next;
    count = oldCount + 1;
  }
  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
  return { average, count, sum };
}

export function mergeEleganceStats(posts: Post[], stats: PostRatingStat[]): Post[] {
  if (!stats.length) return posts;
  const byId = new Map<string, PostRatingStat>();
  for (const s of stats) {
    if (s.kind === "elegance") byId.set(s.postId, s);
  }
  if (!byId.size) return posts;
  let changed = false;
  const next = posts.map((p) => {
    const s = byId.get(p.id);
    if (!s) return p;
    if (p.eleganceSum === s.ratingSum && p.eleganceCount === s.ratingCount) return p;
    changed = true;
    return { ...p, eleganceSum: s.ratingSum, eleganceCount: s.ratingCount };
  });
  return changed ? next : posts;
}

function asStat(row: Record<string, unknown>): PostRatingStat | null {
  const postId = typeof row.post_id === "string" ? row.post_id : "";
  const kind = row.kind === "aha" || row.kind === "elegance" ? row.kind : null;
  if (!postId || !kind) return null;
  return {
    postId,
    kind,
    ratingSum: Number(row.rating_sum ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
    myStars: Number(row.my_stars ?? 0),
  };
}

export async function fetchPostRatingStats(postIds: string[]): Promise<{
  stats: PostRatingStat[];
  error: string | null;
}> {
  const ids = [...new Set(postIds.filter(Boolean))];
  if (!ids.length) return { stats: [], error: null };
  const { data, error } = await supabase.rpc("post_rating_stats", { p_post_ids: ids });
  if (error) {
    console.warn("post_rating_stats:", error.message);
    return { stats: [], error: error.message };
  }
  const stats: PostRatingStat[] = [];
  for (const raw of data ?? []) {
    const s = asStat(raw as Record<string, unknown>);
    if (s) stats.push(s);
  }
  return { stats, error: null };
}

export async function upsertPostRating(
  postId: string,
  kind: RatingKind,
  stars: number,
): Promise<{ stat: PostRatingStat | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return { stat: null, error: "ログインしてください" };

  const { data, error } = await supabase.rpc("upsert_post_rating", {
    p_post_id: postId,
    p_kind: kind,
    p_stars: stars > 0 ? stars : 0,
  });
  if (error) return { stat: null, error: error.message };
  const row = (data ?? {}) as Record<string, unknown>;
  const stat = asStat({
    post_id: typeof row.post_id === "string" ? row.post_id : postId,
    kind: typeof row.kind === "string" ? row.kind : kind,
    rating_sum: row.rating_sum,
    rating_count: row.rating_count,
    my_stars: row.my_stars,
  });
  return { stat, error: null };
}
