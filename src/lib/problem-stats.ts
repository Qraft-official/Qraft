import { ATTEMPT_AVG_MAX_SEC, ATTEMPT_AVG_MIN_SEC } from "./learn";

/** Hide noisy percentages until a few unique solvers exist. */
export const STATS_MIN_N = 3;

export type DiscoverSortKeyExtended =
  | "newest"
  | "trending"
  | "hall"
  | "most_confused"
  | "top_rated"
  | "most_reposted"
  | "accuracy_asc"
  | "accuracy_desc"
  | "duration_asc"
  | "duration_desc";

export function isDurationSample(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec)) return false;
  return sec >= ATTEMPT_AVG_MIN_SEC && sec <= ATTEMPT_AVG_MAX_SEC;
}

export function accuracyRate(correct: number, solvers: number) {
  if (solvers < STATS_MIN_N) return null;
  return Math.round((correct / solvers) * 100);
}

export function avgDurationSeconds(sum: number, n: number) {
  if (n < STATS_MIN_N) return null;
  return Math.round(sum / n);
}

/** Compact clock: 98 → 1:38 */
export function formatDurationClock(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return null;
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function observedDifficultyLabel(rate: number | null) {
  if (rate == null) return null;
  if (rate < 20) return "非常に難しい";
  if (rate < 40) return "難しい";
  if (rate < 70) return "標準";
  if (rate < 90) return "易しい";
  return "非常に易しい";
}

export function compactSolveStatsLine(input: {
  gradeCorrect?: number | null;
  gradeN?: number | null;
  durationSum?: number | null;
  durationN?: number | null;
}) {
  const solvers = Number(input.gradeN ?? 0);
  const correct = Number(input.gradeCorrect ?? 0);
  const durN = Number(input.durationN ?? 0);
  const durSum = Number(input.durationSum ?? 0);
  if (solvers <= 0 && durN <= 0) return "正答率 -- ・ 平均 --";
  if (solvers < STATS_MIN_N) {
    return `回答${solvers}件 ・ 集計中`;
  }
  const rate = accuracyRate(correct, solvers);
  const avg = avgDurationSeconds(durSum, durN);
  const avgLabel = formatDurationClock(avg) ?? "--";
  return `正答率 ${rate}% ・ 平均 ${avgLabel}`;
}

export const DISCOVER_STATS_SORTS = [
  "accuracy_asc",
  "accuracy_desc",
  "duration_asc",
  "duration_desc",
] as const;

export function isDiscoverStatsSort(
  sort: string,
): sort is (typeof DISCOVER_STATS_SORTS)[number] {
  return (DISCOVER_STATS_SORTS as readonly string[]).includes(sort);
}

export type SpoilerTimes = {
  answerRevealedAt?: string | null;
  explanationRevealedAt?: string | null;
};

/** Hint reveals are not spoilers for metrics. Missing timestamps stay eligible. */
export function spoilerBeforeSubmit(
  spoiler: SpoilerTimes | null | undefined,
  submittedAt: string,
): boolean {
  const submitMs = Date.parse(submittedAt);
  if (!Number.isFinite(submitMs)) return false;
  for (const raw of [spoiler?.answerRevealedAt, spoiler?.explanationRevealedAt]) {
    if (!raw) continue;
    const revealMs = Date.parse(raw);
    if (Number.isFinite(revealMs) && revealMs < submitMs) return true;
  }
  return false;
}

export function eligibleForMetricsAtSubmit(
  spoiler: SpoilerTimes | null | undefined,
  submittedAt: string,
) {
  return !spoilerBeforeSubmit(spoiler, submittedAt);
}

export type GradedAttemptRow = {
  userId: string;
  submittedAt: string;
  grade: "correct" | "incorrect" | "ungraded" | string;
  durationSeconds?: number | null;
  eligibleForMetrics?: boolean | null;
};

/** First graded eligible submit per user. Ineligible rows are dropped, not counted as wrong. */
export function firstEligibleGradedAttempts(rows: GradedAttemptRow[]) {
  const best = new Map<string, GradedAttemptRow>();
  const sorted = [...rows].sort(
    (a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt),
  );
  for (const row of sorted) {
    if (row.grade !== "correct" && row.grade !== "incorrect") continue;
    if (row.eligibleForMetrics === false) continue;
    if (!best.has(row.userId)) best.set(row.userId, row);
  }
  return [...best.values()];
}

export function accuracyFromEligible(rows: GradedAttemptRow[]) {
  const firsts = firstEligibleGradedAttempts(rows);
  const solvers = firsts.length;
  const correct = firsts.filter((r) => r.grade === "correct").length;
  return { solvers, correct, rate: accuracyRate(correct, solvers) };
}

export function durationFromEligible(rows: GradedAttemptRow[]) {
  const samples = firstEligibleGradedAttempts(rows)
    .map((r) => r.durationSeconds)
    .filter((s): s is number => isDurationSample(s));
  const n = samples.length;
  const sum = samples.reduce((a, b) => a + b, 0);
  return { n, sum, avg: avgDurationSeconds(sum, n) };
}
