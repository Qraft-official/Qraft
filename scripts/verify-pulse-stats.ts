import { computePulseStreaks, computePulseTotals, type PulseAttempt } from "../src/lib/pulse-stats";

const published = [
  "2026-09-16",
  "2026-09-17",
  "2026-09-18",
  "2026-09-19",
  "2026-09-20",
  "2026-09-21",
];
const attempts: PulseAttempt[] = [
  { problemId: "a", sprintDay: "2026-09-16", grade: "correct", submittedAt: "t" },
  { problemId: "b", sprintDay: "2026-09-17", grade: "incorrect", submittedAt: "t" },
  { problemId: "c", sprintDay: "2026-09-19", grade: "correct", submittedAt: "t" },
  { problemId: "d", sprintDay: "2026-09-20", grade: "correct", submittedAt: "t" },
];
const now = new Date("2026-09-21T05:00:00+09:00");
const streaks = computePulseStreaks(published, attempts, now);
const totals = computePulseTotals(attempts);
if (streaks.current !== 2) throw new Error(`current streak ${streaks.current}`);
if (streaks.longest !== 2) throw new Error(`longest ${streaks.longest}`);
if (totals.attempted !== 4 || totals.correct !== 3) throw new Error("totals");
if (totals.accuracy !== 0.75) throw new Error(`accuracy ${totals.accuracy}`);
console.log("pulse-stats ok", streaks, totals);
