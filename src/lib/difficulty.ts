import type { Post, Tier, Tiers } from "./types";

export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 5;
export const CONFUSED_EMOJI = "?";
export const HARD_SPOTLIGHT_MIN = 3;

export const DIFFICULTY_LEVELS: {
  id: Tier;
  label: string;
  hint: string;
}[] = [
  { id: 1, label: "Lv1", hint: "基礎" },
  { id: 2, label: "Lv2", hint: "初級" },
  { id: 3, label: "Lv3", hint: "中級" },
  { id: 4, label: "Lv4", hint: "上級" },
  { id: 5, label: "Lv5", hint: "最難関" },
];

export function asDifficulty(value: unknown): Tier {
  const n = Number(value);
  if (n >= 1 && n <= 5) return n as Tier;
  return 3;
}

export function difficultyLabel(level: number) {
  return DIFFICULTY_LEVELS.find((d) => d.id === level)?.hint ?? "中級";
}

export function isProblemUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

/** Demo metadata for mock feed posts (not in DB). */
export const MOCK_PROBLEM_META: Record<string, { level: Tier; confused: number }> = {
  p1: { level: 5, confused: 4 },
  p2: { level: 4, confused: 3 },
  p4: { level: 3, confused: 1 },
  p6: { level: 2, confused: 0 },
  p7: { level: 5, confused: 5 },
};

export function inferUserLevel(tiers: Tiers, posts: Post[], userId: string): Tier {
  const tierAvg = (tiers.math + tiers.physics + tiers.chemistry) / 3;
  const solvedLevels = posts
    .filter((p) => p.kind === "solution" && p.authorId === userId && p.problemId)
    .map((s) => posts.find((p) => p.id === s.problemId)?.difficultyLevel)
    .filter((n): n is number => typeof n === "number");
  const mixed =
    solvedLevels.length > 0
      ? tierAvg * 0.45 +
        (solvedLevels.reduce((a, b) => a + b, 0) / solvedLevels.length) * 0.55
      : tierAvg;
  return asDifficulty(Math.round(mixed));
}
