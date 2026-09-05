import type { Post, ProblemMode, Subject, Tier } from "./types";
import { postReactionScore } from "./weekly";

function avgStars(sum: number, count: number) {
  if (!count) return 0;
  return Math.round((sum / count) * 10) / 10;
}

export type DiscoverSortKey =
  | "newest"
  | "trending"
  | "hall"
  | "most_confused"
  | "top_rated"
  | "most_reposted";

export type DiscoverKindFilter = "all" | "problem" | "solution";
export type SubjectFilter = "all" | Subject;
export type ModeFilter = "all" | ProblemMode;
export type LevelFilter = "all" | Tier;

export const DISCOVER_SORT_OPTIONS: {
  id: DiscoverSortKey;
  label: string;
  /** 投稿タイプを絞ったときだけ無効化する */
  requiresKind?: "problem" | "solution";
  unavailableHint?: string;
}[] = [
  { id: "newest", label: "新着順" },
  { id: "trending", label: "話題の問題" },
  { id: "hall", label: "殿堂入り" },
  {
    id: "most_confused",
    label: "？が多い順",
    requiresKind: "problem",
    unavailableHint: "「？」は問題投稿の機能です",
  },
  {
    id: "top_rated",
    label: "評価が高い順",
    requiresKind: "solution",
    unavailableHint: "星評価は解法投稿の機能です",
  },
  { id: "most_reposted", label: "リポストが多い順" },
];

export const DISCOVER_KIND_OPTIONS: { id: DiscoverKindFilter; label: string }[] = [
  { id: "all", label: "すべて" },
  { id: "problem", label: "問題" },
  { id: "solution", label: "解法" },
];

export function asDiscoverSort(v: string | null): DiscoverSortKey {
  if (
    v === "trending" ||
    v === "hall" ||
    v === "most_confused" ||
    v === "top_rated" ||
    v === "most_reposted"
  ) {
    return v;
  }
  return "newest";
}

export function asDiscoverKind(v: string | null): DiscoverKindFilter {
  if (v === "problem" || v === "solution") return v;
  return "all";
}

export function sortUnavailableForKind(
  sort: DiscoverSortKey,
  kind: DiscoverKindFilter,
): string | null {
  if (sort === "most_confused" && kind === "solution") {
    return "「？」は問題投稿の機能です";
  }
  if (sort === "top_rated" && kind === "problem") {
    return "星評価は解法投稿の機能です";
  }
  return null;
}

export function coerceDiscoverSort(
  sort: DiscoverSortKey,
  kind: DiscoverKindFilter,
): DiscoverSortKey {
  return sortUnavailableForKind(sort, kind) ? "newest" : sort;
}

function matchesQuery(post: Post, q: string) {
  if (!q) return true;
  const n = q.toLowerCase();
  return (
    post.text.toLowerCase().includes(n) ||
    (post.title ?? "").toLowerCase().includes(n) ||
    (post.solution ?? "").toLowerCase().includes(n)
  );
}

/** 投稿タイプは kind（problem / solution）のみ。本文推測や単純リポストは使わない。 */
export function isDiscoverPostKind(post: Post, kind: DiscoverKindFilter) {
  if (kind === "all") return true;
  return post.kind === kind;
}

export function filterDiscoverPosts(
  posts: Post[],
  {
    subject,
    mode,
    level,
    q,
    kind,
  }: {
    subject: SubjectFilter;
    mode: ModeFilter;
    level: LevelFilter;
    q: string;
    kind: DiscoverKindFilter;
  },
) {
  return posts.filter((p) => {
    if (p.kind === "sprint" || p.kind === "reply") return false;
    if (!isDiscoverPostKind(p, kind)) return false;
    if (subject !== "all" && p.subject !== subject) return false;
    if (kind !== "solution") {
      if (mode !== "all" && (p.kind !== "problem" || p.problemMode !== mode)) return false;
      if (level !== "all" && (p.kind !== "problem" || (p.difficultyLevel ?? 3) !== level)) {
        return false;
      }
    }
    return matchesQuery(p, q);
  });
}

export type DiscoverSortContext = {
  ratings: Record<string, Partial<Record<"aha" | "elegance", number>>>;
  repostedIds: string[];
};

function createdMs(post: Post) {
  return +new Date(post.createdAt);
}

function confusedScore(post: Post) {
  return post.confusedCount ?? 0;
}

function repostScore(post: Post, ctx: DiscoverSortContext) {
  const local = ctx.repostedIds.includes(post.id) ? 1 : 0;
  return (post.repostCount ?? 0) + local;
}

/** 解法の星評価。件数があるときは平均を優先。 */
export function solutionRatingStats(post: Post, ctx: DiscoverSortContext) {
  const count = post.eleganceCount ?? 0;
  if (count > 0) {
    return { avg: avgStars(post.eleganceSum, count), count };
  }
  const local = ctx.ratings[post.id]?.elegance;
  if (typeof local === "number" && local > 0) {
    return { avg: local, count: 1 };
  }
  return { avg: 0, count: 0 };
}

export function sortDiscoverPosts(
  list: Post[],
  sort: DiscoverSortKey,
  ctx: DiscoverSortContext,
) {
  const copy = [...list];
  if (sort === "newest") {
    return copy.sort((a, b) => createdMs(b) - createdMs(a));
  }
  if (sort === "trending") {
    return copy.sort((a, b) => {
      const score = postReactionScore(b) - postReactionScore(a);
      if (score !== 0) return score;
      return createdMs(b) - createdMs(a);
    });
  }
  if (sort === "most_confused") {
    return copy.sort((a, b) => {
      const d = confusedScore(b) - confusedScore(a);
      if (d !== 0) return d;
      return createdMs(b) - createdMs(a);
    });
  }
  if (sort === "most_reposted") {
    return copy.sort((a, b) => {
      const d = repostScore(b, ctx) - repostScore(a, ctx);
      if (d !== 0) return d;
      return createdMs(b) - createdMs(a);
    });
  }
  if (sort === "top_rated") {
    return copy.sort((a, b) => {
      const ar = solutionRatingStats(a, ctx);
      const br = solutionRatingStats(b, ctx);
      if (br.avg !== ar.avg) return br.avg - ar.avg;
      if (br.count !== ar.count) return br.count - ar.count;
      return createdMs(b) - createdMs(a);
    });
  }
  return copy.sort((a, b) => {
    const aScore =
      a.kind === "solution"
        ? avgStars(a.eleganceSum, a.eleganceCount)
        : avgStars(a.ahaSum, a.ahaCount);
    const bScore =
      b.kind === "solution"
        ? avgStars(b.eleganceSum, b.eleganceCount)
        : avgStars(b.ahaSum, b.ahaCount);
    if (bScore !== aScore) return bScore - aScore;
    return postReactionScore(b) - postReactionScore(a);
  });
}
