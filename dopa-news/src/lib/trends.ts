import { LANDMARKS, distanceMeters } from "@/lib/geo";
import { mapCategory } from "@/lib/map-categories";
import type { MapPost, MapPostType } from "@/types/database";

export interface Trend {
  key: string;
  place: string;
  emoji: string;
  label: string;
  color: string;
  count: number;
  /** Reports in the last 30 min vs. the 30 before that. */
  surging: boolean;
}

const RADIUS_M = 1500;
const RECENT_WINDOW_MS = 30 * 60_000;

/**
 * Derives "what is picking up near you" purely from live map posts, by
 * bucketing them into the nearest known landmark and category.
 */
export function computeTrends(
  posts: MapPost[],
  type: MapPostType,
  now = Date.now(),
  limit = 4,
): Trend[] {
  const buckets = new Map<string, { place: string; category: string; recent: number; older: number }>();

  for (const post of posts) {
    if (post.post_type !== type) continue;
    const created = new Date(post.created_at).getTime();
    const age = now - created;
    if (age > 2 * RECENT_WINDOW_MS) continue;

    let nearest = LANDMARKS[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const landmark of LANDMARKS) {
      const d = distanceMeters({ lat: post.latitude, lng: post.longitude }, landmark);
      if (d < bestDistance) {
        nearest = landmark;
        bestDistance = d;
      }
    }
    if (bestDistance > RADIUS_M) continue;

    const key = `${nearest.name}::${post.category}`;
    const bucket = buckets.get(key) ?? {
      place: nearest.name,
      category: post.category,
      recent: 0,
      older: 0,
    };
    if (age <= RECENT_WINDOW_MS) bucket.recent += 1;
    else bucket.older += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([key, bucket]) => {
      const meta = mapCategory(bucket.category);
      const count = bucket.recent + bucket.older;
      return {
        key,
        place: bucket.place,
        emoji: meta.emoji,
        label: meta.label,
        color: meta.color,
        count,
        surging: bucket.recent >= 2 && bucket.recent > bucket.older,
      };
    })
    .filter((t) => t.count >= 2)
    .sort((a, b) => Number(b.surging) - Number(a.surging) || b.count - a.count)
    .slice(0, limit);
}
