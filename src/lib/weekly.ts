import { supabase } from "./supabase";
import type { Post, User } from "./types";

export const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;

export function weeklyPeriodLabel(now = Date.now()) {
  const end = new Date(now);
  const start = new Date(now - WEEKLY_MS);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return { short: "過去7日間", range: `${fmt(start)}〜${fmt(end)}` };
}

export function isWithinLast7Days(iso: string, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  const age = now - t;
  return age >= 0 && age <= WEEKLY_MS;
}

/** Likes, 脳汁 ratings, reposts, confused, etc. */
export function postReactionScore(post: Post, extraReactions = 0) {
  const likes = post.likeCount ?? 0;
  const reposts = post.repostCount ?? 0;
  const replies = post.replyCount ?? 0;
  const confused = post.confusedCount ?? 0;
  const aha = post.ahaCount ?? 0;
  const elegance = post.eleganceCount ?? 0;
  const ahaAvg = post.ahaCount ? post.ahaSum / post.ahaCount : 0;
  const eleganceAvg = post.eleganceCount ? post.eleganceSum / post.eleganceCount : 0;
  return (
    extraReactions +
    likes +
    reposts * 2 +
    replies +
    confused +
    aha * 2 +
    elegance * 2 +
    ahaAvg +
    eleganceAvg
  );
}

export type WeeklyQrafter = {
  user: User;
  weeklyReactions: number;
};

export type WeeklyRankings = {
  weeklyQuestions: Post[];
  weeklyQrafters: WeeklyQrafter[];
  since: string;
};

export type WeeklyHighlights = {
  weeklyQrafter: WeeklyQrafter | null;
  weeklyQuestion: Post | null;
  since: string;
};

export function computeWeeklyRankings(
  posts: Post[],
  userOf: (id: string) => User,
  extraByProblem: Record<string, number> = {},
  extraByAuthor: Record<string, number> = {},
  now = Date.now(),
): WeeklyRankings {
  const eligible = posts.filter(
    (p) => p.kind !== "reply" && p.kind !== "sprint" && isWithinLast7Days(p.createdAt, now),
  );
  const pool =
    eligible.length > 0
      ? eligible
      : posts.filter((p) => p.kind !== "reply" && p.kind !== "sprint");

  const scored = pool
    .map((p) => ({ post: p, score: postReactionScore(p, extraByProblem[p.id] ?? 0) }))
    .sort((a, b) => b.score - a.score);

  const problems = scored.filter((s) => s.post.kind === "problem").map((s) => s.post);
  const weeklyQuestions = problems.length > 0 ? problems : scored.map((s) => s.post);

  const dbAuthorBoost = Object.keys(extraByAuthor).length > 0;
  const byAuthor = new Map<string, number>();
  for (const { post } of scored) {
    const local = postReactionScore(post, dbAuthorBoost ? 0 : (extraByProblem[post.id] ?? 0));
    byAuthor.set(post.authorId, (byAuthor.get(post.authorId) ?? 0) + local);
  }
  if (dbAuthorBoost) {
    for (const [authorId, n] of Object.entries(extraByAuthor)) {
      byAuthor.set(authorId, (byAuthor.get(authorId) ?? 0) + n);
    }
  }

  const weeklyQrafters = [...byAuthor.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ user: userOf(id), weeklyReactions: Math.round(n) }));

  return {
    weeklyQuestions,
    weeklyQrafters,
    since: new Date(now - WEEKLY_MS).toISOString(),
  };
}

export function computeWeeklyHighlights(
  posts: Post[],
  userOf: (id: string) => User,
  extraByProblem: Record<string, number> = {},
  extraByAuthor: Record<string, number> = {},
  now = Date.now(),
): WeeklyHighlights {
  const ranked = computeWeeklyRankings(posts, userOf, extraByProblem, extraByAuthor, now);
  return {
    weeklyQrafter: ranked.weeklyQrafters[0] ?? null,
    weeklyQuestion: ranked.weeklyQuestions[0] ?? null,
    since: ranked.since,
  };
}

function asCountMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

export async function fetchWeeklyReactionBoosts(now = Date.now()) {
  const byProblem: Record<string, number> = {};
  const byAuthor: Record<string, number> = {};
  try {
    const { data, error } = await supabase.rpc("weekly_highlights");
    if (!error && data && typeof data === "object") {
      const row = data as { by_problem?: unknown; by_author?: unknown };
      return {
        byProblem: asCountMap(row.by_problem),
        byAuthor: asCountMap(row.by_author),
      };
    }
    const since = new Date(now - WEEKLY_MS).toISOString();
    const { data: rx, error: rxError } = await supabase
      .from("problem_reactions")
      .select("problem_id")
      .gte("created_at", since);
    if (rxError || !rx?.length) return { byProblem, byAuthor };
    for (const row of rx) {
      const id = String((row as { problem_id: string }).problem_id);
      byProblem[id] = (byProblem[id] ?? 0) + 1;
    }
    const ids = Object.keys(byProblem);
    const { data: problems } = await supabase.from("problems").select("id, author_id").in("id", ids);
    for (const p of problems ?? []) {
      const id = String((p as { id: string }).id);
      const author = String((p as { author_id: string }).author_id);
      byAuthor[author] = (byAuthor[author] ?? 0) + (byProblem[id] ?? 0);
    }
  } catch (err) {
    console.warn("fetchWeeklyReactionBoosts:", err);
  }
  return { byProblem, byAuthor };
}
