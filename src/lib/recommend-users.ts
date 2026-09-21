import { SUBJECT_LABEL } from "./constants";
import type { Post, Subject, User } from "./types";

export type SuggestedUser = {
  user: User;
  reason: string;
};

function subjectOfPosts(posts: Post[], authorId: string): Subject | null {
  const counts: Record<Subject, number> = { math: 0, physics: 0, chemistry: 0 };
  for (const p of posts) {
    if (p.authorId !== authorId) continue;
    if (p.kind !== "problem" && p.kind !== "sprint") continue;
    counts[p.subject] += 1;
  }
  const top = (Object.entries(counts) as [Subject, number][]).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] > 0 ? top[0] : null;
}

export function suggestUsers(input: {
  meId: string;
  follows: string[];
  posts: Post[];
  users: User[];
  savedIds: string[];
  attemptedIds: string[];
  likedIds?: string[];
  limit?: number;
}): SuggestedUser[] {
  const limit = input.limit ?? 8;
  const meId = input.meId;
  const followSet = new Set(input.follows);
  const saved = new Set(input.savedIds);
  const attempted = new Set(input.attemptedIds);
  const liked = new Set(input.likedIds ?? []);
  const recentCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;

  const myPosts = input.posts.filter((p) => p.authorId === meId && p.kind !== "reply");
  const mySubject = subjectOfPosts(myPosts, meId);

  const scores = new Map<string, { score: number; reason: string }>();

  const bump = (id: string, n: number, reason: string) => {
    if (!id || id === meId) return;
    const prev = scores.get(id);
    if (!prev) {
      scores.set(id, { score: n, reason });
      return;
    }
    scores.set(id, {
      score: prev.score + n,
      reason: n >= 6 && n >= prev.score ? reason : prev.reason,
    });
  };

  for (const p of input.posts) {
    if (p.kind === "reply" || p.authorId === meId) continue;
    if (attempted.has(p.id)) bump(p.authorId, 8, "あなたが解いた問題の投稿者");
    else if (saved.has(p.id)) bump(p.authorId, 6, "保存した問題の投稿者");
    else if (liked.has(p.id)) bump(p.authorId, 4, "リアクションした問題の投稿者");
    if (mySubject && p.subject === mySubject && p.kind === "problem") {
      bump(p.authorId, 3, `${SUBJECT_LABEL[mySubject]}の問題をよく投稿`);
    }
    const created = Date.parse(p.createdAt);
    if (Number.isFinite(created) && created >= recentCutoff) bump(p.authorId, 2, "最近活動している");
  }

  for (const id of followSet) bump(id, 1, "フォロー中");

  const ranked = [...scores.entries()]
    .map(([id, v]) => {
      const user = input.users.find((u) => u.id === id);
      if (!user || user.isSample) return null;
      return { user, score: v.score, reason: v.reason };
    })
    .filter((row): row is { user: User; score: number; reason: string } => !!row)
    .sort((a, b) => b.score - a.score || a.user.handle.localeCompare(b.user.handle));

  const out: SuggestedUser[] = [];
  const seen = new Set<string>();
  for (const row of ranked) {
    if (seen.has(row.user.id)) continue;
    seen.add(row.user.id);
    out.push({ user: row.user, reason: row.reason });
    if (out.length >= limit) return out;
  }

  const fallback = input.users
    .filter((u) => u.id !== meId && !u.isSample && !seen.has(u.id))
    .map((user) => {
      const authored = input.posts.filter(
        (p) => p.authorId === user.id && (p.kind === "problem" || p.kind === "sprint"),
      ).length;
      return { user, authored };
    })
    .filter((row) => row.authored > 0)
    .sort((a, b) => b.authored - a.authored || (b.user.followerCount ?? 0) - (a.user.followerCount ?? 0));

  for (const row of fallback) {
    const sub = subjectOfPosts(input.posts, row.user.id);
    out.push({
      user: row.user,
      reason: sub ? `${SUBJECT_LABEL[sub]}の問題をよく投稿` : "最近活動している",
    });
    seen.add(row.user.id);
    if (out.length >= limit) break;
  }
  return out;
}
