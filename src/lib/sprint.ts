import { SPRINT_MS } from "./constants";
import { getNextPulseRelease, isPulseOpenAt, jstDateString } from "./jst";
import type { Post, Subject } from "./types";

/** JST calendar date of the live PULSE (empty before 21:00). */
export function getSprintDayId(now = new Date()): string {
  const today = jstDateString(now);
  return isPulseOpenAt(today, now) ? today : today;
}

export function getNextRelease(now = new Date()): Date {
  return getNextPulseRelease(now);
}

export function formatDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTimer(ms: number): string {
  const clamped = Math.max(0, ms);
  const total = Math.floor(clamped / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function remainingMs(startedAt: number, now = Date.now()): number {
  return startedAt + SPRINT_MS - now;
}

const PULSE_SAMPLE_BODY = [
  "整数・規則性",
  "",
  "黒板に $1, 2, 3, \\ldots, 100$ が書かれている。",
  "",
  "好きな2数 $a, b$ を消し、",
  "代わりに $a+b-1$ を書く。",
  "",
  "これを数が1つになるまで繰り返す。",
  "",
  "**問い：** 最後に残る数はいくつ？",
].join("\n");

const PULSE_SAMPLE_HINT =
  "「どの2つを選ぶか」ではなく、黒板に書かれている数の合計に注目。";

const PULSE_SAMPLE_SOLUTION = [
  "最初の合計は",
  "",
  "$1+2+\\cdots+100=5050$",
  "",
  "1回の操作で $a+b \\to a+b-1$ となるため、黒板上の数の合計は必ず $1$ 減る。",
  "",
  "$100$ 個の数を $1$ 個にするには $99$ 回操作するので、",
  "",
  "$5050-99=4951$",
  "",
  "したがって最後に残る数は $4951$。",
].join("\n");

/** Client-side PULSE sample (not a DB row). Rotating chemistry/physics mocks were ad/demo content. */
export const OFFICIAL_BANK: {
  subject: Subject;
  text: string;
  title: string;
  difficultyLevel: 3;
  correctAnswer: string;
  hints: string[];
  solution: string;
}[] = [
  {
    subject: "math",
    title: "最後に残る数",
    text: PULSE_SAMPLE_BODY,
    difficultyLevel: 3,
    correctAnswer: "4951",
    hints: [PULSE_SAMPLE_HINT],
    solution: PULSE_SAMPLE_SOLUTION,
  },
];

export function officialForDay(_dayId: string): (typeof OFFICIAL_BANK)[number] {
  return OFFICIAL_BANK[0];
}

export function makeOfficialPost(dayId: string): Post {
  const bank = officialForDay(dayId);
  return {
    id: `sprint-${dayId}`,
    authorId: "u-official",
    kind: "sprint",
    subject: bank.subject,
    title: bank.title,
    text: bank.text,
    createdAt: `${dayId}T21:00:00`,
    replyCount: 0,
    repostCount: 0,
    likeCount: 0,
    ahaSum: 0,
    ahaCount: 0,
    eleganceSum: 0,
    eleganceCount: 0,
    sprintDay: dayId,
    isSprint: true,
    problemMode: "aha",
    difficultyLevel: bank.difficultyLevel,
    correctAnswer: undefined,
    hints: [],
    solution: undefined,
  };
}

/** Today's live PULSE only. Never returns unpublished or a sample fallback. */
export function pickAhaPulsePost(posts: Post[], dayId: string, fallback: Post, now = Date.now()): Post {
  const today = jstDateString(new Date(now));
  if (!isPulseOpenAt(today, new Date(now))) {
    return { ...fallback, text: "", title: "", correctAnswer: undefined, hints: [], solution: undefined };
  }
  const live = posts.filter((p) => {
    if (!(p.isSprint || p.kind === "sprint")) return false;
    if (p.sprintDay !== today) return false;
    if (p.publishAt) {
      const at = Date.parse(p.publishAt);
      if (!Number.isFinite(at) || at > now) return false;
    } else {
      return false;
    }
    return true;
  });
  const picked = live[0];
  if (!picked) {
    return { ...fallback, text: "", title: "", correctAnswer: undefined, hints: [], solution: undefined, sprintDay: today };
  }
  return { ...picked, kind: "sprint", problemMode: picked.problemMode ?? "aha", correctAnswer: undefined };
}
