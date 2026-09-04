export const REVENGE_DELAY_DAYS = 3;
export const ATTEMPT_AVG_MIN_SEC = 15;
export const ATTEMPT_AVG_MAX_SEC = 7200;
export const HINT_MAX = 3;
export const HINT_MAX_LEN = 280;
export const DRAFT_MAX_CHARS = 80_000;

export const SAVE_CATEGORIES = [
  { id: "later", label: "あとで解く" },
  { id: "exam", label: "テスト前" },
  { id: "hard", label: "難問" },
] as const;

export type SaveCategory = (typeof SAVE_CATEGORIES)[number]["id"];

export const FELT_VOTES = [
  { id: 1, label: "簡単" },
  { id: 2, label: "普通" },
  { id: 3, label: "難しい" },
] as const;

export type FeltVote = 1 | 2 | 3;

export type AttemptGrade = "correct" | "incorrect" | "ungraded";

export type AttemptSummary = {
  grade: AttemptGrade | null;
  durationSeconds: number | null;
  submittedAt: string | null;
  isRevenge: boolean;
  revengeAvailableAt: string | null;
  revengeCompletedAt: string | null;
};

export type RevengeItem = {
  problemId: string;
  submittedAt: string;
  revengeAvailableAt: string;
};

export type SeriesRef = {
  id: string;
  title: string;
  ord: number | null;
};

export type ProblemSeries = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  createdAt: string;
};

export type LearningCardState = {
  saved: Record<string, SaveCategory>;
  votes: Record<string, FeltVote>;
  attempts: Record<string, AttemptSummary>;
};

export type LearningBootstrap = {
  notifyAuthors: string[];
  revenge: RevengeItem[];
  calendarDays: string[];
  currentStreak: number;
  longestStreak: number;
};

export type HistoryAttempt = {
  id: string;
  problemId: string;
  grade: AttemptGrade | null;
  durationSeconds: number | null;
  submittedAt: string | null;
  isRevenge: boolean;
};

export function asSaveCategory(value: unknown): SaveCategory {
  if (value === "exam" || value === "hard" || value === "later") return value;
  return "later";
}

export function asFeltVote(value: unknown): FeltVote | null {
  if (value === 1 || value === 2 || value === 3) return value;
  const n = Number(value);
  if (n === 1 || n === 2 || n === 3) return n;
  return null;
}

export function sanitizeHints(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const t = raw.trim().slice(0, HINT_MAX_LEN);
    if (!t) continue;
    out.push(t);
    if (out.length >= HINT_MAX) break;
  }
  return out;
}

export function formatDuration(sec: number | null | undefined) {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return null;
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}秒`;
  if (m < 60) return `${m}分${String(r).padStart(2, "0")}秒`;
  const h = Math.floor(m / 60);
  return `${h}時間${m % 60}分`;
}

export function avgDurationSeconds(sum: number | undefined, n: number | undefined) {
  if (!n || n <= 0) return null;
  return Math.round((sum ?? 0) / n);
}

export function feltLabel(stats: { easy: number; normal: number; hard: number }) {
  const total = stats.easy + stats.normal + stats.hard;
  if (!total) return null;
  const winner =
    stats.hard >= stats.normal && stats.hard >= stats.easy
      ? "難しい"
      : stats.easy >= stats.normal
        ? "簡単"
        : "普通";
  return `${winner} ${Math.round((Math.max(stats.easy, stats.normal, stats.hard) / total) * 100)}%`;
}

export function saveCategoryLabel(id: SaveCategory) {
  return SAVE_CATEGORIES.find((c) => c.id === id)?.label ?? "あとで解く";
}
