import assert from "node:assert/strict";
import {
  accuracyRate,
  compactSolveStatsLine,
  formatDurationClock,
  isDiscoverStatsSort,
  isDurationSample,
  observedDifficultyLabel,
  STATS_MIN_N,
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
console.log("ok problem-stats discover sorts");
