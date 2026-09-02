import { HARD_SPOTLIGHT_MIN } from "./difficulty";
import type { Post } from "./types";

export function isActivePromotion(post: Post, now = Date.now()) {
  if (!post.promoted) return false;
  const at = post.promotedAt ? new Date(post.promotedAt).getTime() : 0;
  if (!at) return false;
  const a = new Date(at);
  const n = new Date(now);
  return a.getFullYear() === n.getFullYear() && a.getMonth() === n.getMonth();
}

export function recommendScore(post: Post, userLevel: number, now = Date.now()) {
  const ageH = Math.max(0, (now - new Date(post.createdAt).getTime()) / 3_600_000);
  const recency = Math.max(0, 72 - ageH);
  const promo = isActivePromotion(post, now) ? 80 : 0;
  if (post.kind === "problem" || post.kind === "sprint") {
    const level = post.difficultyLevel ?? 3;
    const match = 20 - Math.abs(level - userLevel) * 6;
    const confused = post.confusedCount ?? 0;
    const spotlight = post.isHardSpotlight || confused >= HARD_SPOTLIGHT_MIN ? 16 : 0;
    const aha = post.ahaCount ? post.ahaSum / post.ahaCount : 0;
    return promo + match + recency * 0.18 + spotlight + Math.min(24, confused * 3) + aha * 1.5;
  }
  const elegance = post.eleganceCount ? post.eleganceSum / post.eleganceCount : 0;
  return promo + recency * 0.08 + elegance;
}

export function sortRecommended(posts: Post[], userLevel: number) {
  const now = Date.now();
  return [...posts].sort((a, b) => {
    const ap = isActivePromotion(a, now) ? 1 : 0;
    const bp = isActivePromotion(b, now) ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return recommendScore(b, userLevel, now) - recommendScore(a, userLevel, now);
  });
}
