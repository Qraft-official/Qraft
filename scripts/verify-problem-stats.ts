import assert from "node:assert/strict";
import {
  accuracyRate,
  compactSolveStatsLine,
  formatDurationClock,
  isDiscoverStatsSort,
  isDurationSample,
  observedDifficultyLabel,
  STATS_MIN_N,
  accuracyFromEligible,
  durationFromEligible,
  eligibleForMetricsAtSubmit,
  firstEligibleGradedAttempts,
} from "../src/lib/problem-stats";
import { asDiscoverSort, coerceDiscoverSort, sortUnavailableForKind } from "../src/lib/discover-feed";
import { ATTEMPT_AVG_MAX_SEC, ATTEMPT_AVG_MIN_SEC } from "../src/lib/learn";

assert.equal(STATS_MIN_N, 3);
assert.equal(accuracyRate(1, 2), null);
assert.equal(accuracyRate(2, 3), 67);
assert.equal(accuracyRate(0, 3), 0);
assert.equal(formatDurationClock(98), "1:38");
assert.equal(formatDurationClock(0), "0:00");
assert.equal(formatDurationClock(null), null);
assert.equal(observedDifficultyLabel(19), "非常に難しい");
assert.equal(observedDifficultyLabel(40), "標準");
assert.equal(observedDifficultyLabel(90), "非常に易しい");
assert.equal(isDurationSample(10), false);
assert.equal(isDurationSample(ATTEMPT_AVG_MIN_SEC), true);
assert.equal(isDurationSample(ATTEMPT_AVG_MAX_SEC), true);
assert.equal(isDurationSample(ATTEMPT_AVG_MAX_SEC + 1), false);
assert.equal(compactSolveStatsLine({ gradeN: 0, durationN: 0 }), "正答率 -- ・ 平均 --");
assert.match(compactSolveStatsLine({ gradeN: 2, gradeCorrect: 2 }), /回答2件/);
assert.match(compactSolveStatsLine({ gradeN: 3, gradeCorrect: 1, durationN: 3, durationSum: 294 }), /正答率 33%/);
assert.equal(isDiscoverStatsSort("accuracy_asc"), true);
assert.equal(isDiscoverStatsSort("newest"), false);
assert.equal(asDiscoverSort("duration_desc"), "duration_desc");
assert.ok(sortUnavailableForKind("accuracy_asc", "solution"));
assert.equal(coerceDiscoverSort("accuracy_asc", "solution"), "newest");
assert.equal(sortUnavailableForKind("accuracy_asc", "problem"), null);
assert.equal(sortUnavailableForKind("accuracy_asc", "all"), null);
assert.ok(sortUnavailableForKind("top_rated", "problem"));

const t0 = "2026-09-12T00:00:00.000Z";
const t1 = "2026-09-12T00:01:00.000Z";
const t2 = "2026-09-12T00:02:00.000Z";

assert.equal(eligibleForMetricsAtSubmit(undefined, t1), true);
assert.equal(eligibleForMetricsAtSubmit({}, t1), true);
assert.equal(eligibleForMetricsAtSubmit({ answerRevealedAt: t0 }, t1), false);
assert.equal(eligibleForMetricsAtSubmit({ explanationRevealedAt: t0 }, t1), false);
assert.equal(eligibleForMetricsAtSubmit({ answerRevealedAt: t2 }, t1), true);

const mixed = [
  { userId: "a", submittedAt: t1, grade: "correct" as const, durationSeconds: 60, eligibleForMetrics: true },
  { userId: "b", submittedAt: t1, grade: "incorrect" as const, durationSeconds: 90, eligibleForMetrics: false },
  { userId: "b", submittedAt: t2, grade: "correct" as const, durationSeconds: 40, eligibleForMetrics: false },
  { userId: "c", submittedAt: t1, grade: "correct" as const, durationSeconds: 30, eligibleForMetrics: true },
  { userId: "d", submittedAt: t1, grade: "ungraded" as const, durationSeconds: 20, eligibleForMetrics: true },
];
const acc = accuracyFromEligible(mixed);
assert.equal(acc.solvers, 2);
assert.equal(acc.correct, 2);
assert.equal(firstEligibleGradedAttempts(mixed).length, 2);
const dur = durationFromEligible(mixed);
assert.equal(dur.n, 2);
assert.equal(dur.sum, 90);

console.log("ok problem-stats discover sorts");
