import { isPulseOpenAt, jstDateString, shiftIsoDate } from "./jst";

export type PulseGrade = "correct" | "maybe_correct" | "incorrect" | null;

export type PulseAttempt = {
  problemId: string;
  sprintDay: string;
  grade: PulseGrade;
  submittedAt: string | null;
};

export type PublishedPulse = {
  id: string;
  sprintDay: string;
  title: string;
  subject: string;
  difficultyLevel: number;
  publishAt: string;
};

export type PulseDayVisual =
  | "correct"
  | "incorrect"
  | "pending"
  | "unattempted"
  | "none"
  | "future";

export function isJudgedGrade(grade: PulseGrade) {
  return grade === "correct" || grade === "incorrect";
}

export function attemptByDay(attempts: PulseAttempt[]) {
  const map = new Map<string, PulseAttempt>();
  for (const a of attempts) {
    if (!a.sprintDay) continue;
    const prev = map.get(a.sprintDay);
    if (!prev || (a.submittedAt && (!prev.submittedAt || a.submittedAt > prev.submittedAt))) {
      map.set(a.sprintDay, a);
    }
  }
  return map;
}

/** Published days that already count for streak (exclude unpublished today and future). */
export function streakEligibleDays(publishedDays: string[], now = new Date()) {
  const today = jstDateString(now);
  return publishedDays
    .filter((day) => day < today || (day === today && isPulseOpenAt(day, now)))
    .sort();
}

export function computePulseStreaks(publishedDays: string[], attempts: PulseAttempt[], now = new Date()) {
  const byDay = attemptByDay(attempts);
  const eligible = streakEligibleDays(publishedDays, now);
  let current = 0;
  for (let i = eligible.length - 1; i >= 0; i--) {
    if (byDay.has(eligible[i])) current += 1;
    else break;
  }
  let longest = 0;
  let run = 0;
  for (const day of eligible) {
    if (byDay.has(day)) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }
  return { current, longest };
}

export function computePulseTotals(attempts: PulseAttempt[]) {
  const attempted = attempts.length;
  const judged = attempts.filter((a) => isJudgedGrade(a.grade));
  const correct = attempts.filter((a) => a.grade === "correct").length;
  const accuracy = judged.length ? correct / judged.length : null;
  return { attempted, correct, judged: judged.length, accuracy };
}

export function visualForDay(
  day: string,
  published: Map<string, PublishedPulse>,
  attempts: Map<string, PulseAttempt>,
  now = new Date(),
): PulseDayVisual {
  const today = jstDateString(now);
  if (day > today) return "future";
  if (day === today && !isPulseOpenAt(day, now)) return "future";
  const pulse = published.get(day);
  if (!pulse) return "none";
  const attempt = attempts.get(day);
  if (!attempt) return "unattempted";
  if (attempt.grade === "correct") return "correct";
  if (attempt.grade === "incorrect") return "incorrect";
  return "pending";
}

export function labelForVisual(v: PulseDayVisual) {
  switch (v) {
    case "correct":
      return "正解";
    case "incorrect":
      return "不正解";
    case "pending":
      return "挑戦済み（未判定）";
    case "unattempted":
      return "未挑戦";
    case "none":
      return "PULSEなし";
    case "future":
      return "未来";
  }
}

export function monthFromDay(day: string) {
  return day.slice(0, 7);
}

export function addMonth(yearMonth: string, delta: number) {
  const [y, m] = yearMonth.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function firstOfMonth(yearMonth: string) {
  return `${yearMonth}-01`;
}

export function nextDay(day: string) {
  return shiftIsoDate(day, 1);
}
