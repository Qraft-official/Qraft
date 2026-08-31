import { SPRINT_HOUR, SPRINT_MS } from "./constants";
import type { Post, Subject } from "./types";

export function getSprintDayId(now = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < SPRINT_HOUR) d.setDate(d.getDate() - 1);
  return formatDay(d);
}

export function getNextRelease(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(SPRINT_HOUR, 0, 0, 0);
  if (now.getTime() >= d.getTime()) d.setDate(d.getDate() + 1);
  return d;
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

export const OFFICIAL_BANK: {
  subject: Subject;
  text: string;
  title: string;
}[] = [
  {
    subject: "math",
    title: "内接四角形の一撃",
    text: "円に内接する四角形 $ABCD$ で $AB=3, BC=4, CD=5, DA=6$ のとき、対角線 $AC$ の長さを求めよ。\n\n$$AC^{2}=\\frac{(ac+bd)(ad+bc)}{ab+cd}$$ を使わず、トレミーと余弦で攻めろ。",
  },
  {
    subject: "physics",
    title: "単振り子の脳汁",
    text: "長さ $\\ell$、質量 $m$ の単振り子を振幅 $\\theta_0$ で振る。微小角近似を捨て、周期 $T$ を楕円積分で書け。\n\nさらに $\\theta_0\\to 0$ で $T\\to 2\\pi\\sqrt{\\ell/g}$ に戻ることを示せ。",
  },
  {
    subject: "chemistry",
    title: "平衡のQraft",
    text: "反応 $2\\mathrm{SO}_2 + \\mathrm{O}_2 \\rightleftharpoons 2\\mathrm{SO}_3$ で $K_p=4.0$ (圧力は atm)。\n\n初期が $\\mathrm{SO}_2:2.0,\\;\\mathrm{O}_2:1.0,\\;\\mathrm{SO}_3:0$ のとき平衡分圧を求めよ。温度一定、体積一定。",
  },
];

export function officialForDay(dayId: string): (typeof OFFICIAL_BANK)[number] {
  const n = dayId.split("-").reduce((a, b) => a + Number(b), 0);
  return OFFICIAL_BANK[n % OFFICIAL_BANK.length];
}

export function makeOfficialPost(dayId: string): Post {
  const bank = officialForDay(dayId);
  return {
    id: `sprint-${dayId}`,
    authorId: "u-official",
    kind: "sprint",
    subject: bank.subject,
    text: `🔥 **21:00全国戦** — ${bank.title}\n\n${bank.text}`,
    createdAt: `${dayId}T21:00:00`,
    replyCount: 128,
    repostCount: 64,
    likeCount: 890,
    ahaSum: 4.8 * 210,
    ahaCount: 210,
    eleganceSum: 0,
    eleganceCount: 0,
    sprintDay: dayId,
  };
}
