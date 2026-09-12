import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type LaunchSubject = "math" | "physics" | "chemistry";

export type LaunchQuest = {
  id: string;
  sourceFile: string;
  subject: string;
  field: string;
  level: number;
  mode: string;
  title: string;
  problem: string;
  answer: string;
  solution: string;
  hint: string;
  aha_point: string;
};

export type SampleUserSpec = {
  handle: string;
  name: string;
  subjects: LaunchSubject[];
  fields: string[];
};

export type PlannedPost = {
  seedKey: string;
  sourceId: string;
  sourceFile: string;
  title: string;
  subject: LaunchSubject;
  field: string;
  level: number;
  mode: "aha";
  problemText: string;
  solution: string;
  correctAnswer: string;
  authorHandle: string;
  authorName: string;
  authorId: string;
  problemId: string;
  publishAtIso: string;
  publishAtJst: string;
};

const UUID_NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

export const LAUNCH_START_JST = "2026-09-12T12:30:00+09:00";
export const LAUNCH_END_JST = "2026-09-12T20:30:00+09:00";
export const SAMPLE_EMAIL_DOMAIN = "qraft.invalid";
export const PROD_SUPABASE_REF = "orvfimwduohqojfirhsk";

export const SAMPLE_USERS: SampleUserSpec[] = [
  { handle: "math_kai", name: "Math Kai", subjects: ["math"], fields: ["整数", "数論"] },
  { handle: "suu_note", name: "Suu Note", subjects: ["math"], fields: ["代数"] },
  { handle: "geometry_lab", name: "Geometry Lab", subjects: ["math"], fields: ["幾何", "図形"] },
  { handle: "puzzle_n", name: "Puzzle N", subjects: ["math"], fields: ["パズル"] },
  { handle: "logic_room", name: "Logic Room", subjects: ["math"], fields: ["論理", "条件整理"] },
  { handle: "algebra_box", name: "Algebra Box", subjects: ["math"], fields: ["代数", "方程式"] },
  { handle: "integer_lab", name: "Integer Lab", subjects: ["math"], fields: ["整数"] },
  { handle: "series_q", name: "Series Q", subjects: ["math"], fields: ["数列"] },
  { handle: "vector_ink", name: "Vector Ink", subjects: ["math"], fields: ["ベクトル"] },
  { handle: "trig_wave", name: "Trig Wave", subjects: ["math"], fields: ["三角関数"] },
  { handle: "prob_dice", name: "Prob Dice", subjects: ["math"], fields: ["確率"] },
  { handle: "combo_tree", name: "Combo Tree", subjects: ["math"], fields: ["場合の数", "組合せ"] },
  { handle: "calc_flow", name: "Calc Flow", subjects: ["math"], fields: ["微積", "微分", "積分"] },
  { handle: "ineq_bound", name: "Ineq Bound", subjects: ["math"], fields: ["不等式"] },
  { handle: "complex_i", name: "Complex I", subjects: ["math"], fields: ["複素数"] },
  { handle: "number_th", name: "Number Th", subjects: ["math"], fields: ["数論"] },
  { handle: "eq_solver", name: "Eq Solver", subjects: ["math"], fields: ["方程式", "関数"] },
  { handle: "func_map", name: "Func Map", subjects: ["math"], fields: ["関数", "指数対数"] },
  { handle: "puzzle_box", name: "Puzzle Box", subjects: ["math"], fields: ["パズル", "逆転発想"] },
  { handle: "invariant_q", name: "Invariant Q", subjects: ["math"], fields: ["不変量", "鳩の巣原理", "情報量", "最適戦略"] },
  { handle: "phys_lab", name: "Phys Lab", subjects: ["physics"], fields: ["力学"] },
  { handle: "mech_note", name: "Mech Note", subjects: ["physics"], fields: ["力学", "運動量", "エネルギー"] },
  { handle: "wave_room", name: "Wave Room", subjects: ["physics"], fields: ["波動"] },
  { handle: "em_field", name: "Em Field", subjects: ["physics"], fields: ["電気", "磁気", "電磁誘導", "電磁気"] },
  { handle: "thermo_q", name: "Thermo Q", subjects: ["physics"], fields: ["熱", "エネルギー"] },
  { handle: "chem_lab", name: "Chem Lab", subjects: ["chemistry"], fields: ["物質"] },
  { handle: "acid_base", name: "Acid Base", subjects: ["chemistry"], fields: ["酸塩基"] },
  { handle: "redox_ink", name: "Redox Ink", subjects: ["chemistry"], fields: ["酸化還元", "電池"] },
  { handle: "org_mol", name: "Org Mol", subjects: ["chemistry"], fields: ["有機"] },
  { handle: "eq_chem", name: "Eq Chem", subjects: ["chemistry"], fields: ["化学平衡", "反応速度", "気体", "熱化学"] },
];

export function uuidV5(name: string, namespace = UUID_NS) {
  const ns = Buffer.from(namespace.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(name).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function sampleUserId(handle: string) {
  return uuidV5(`qraft-launch-user:${handle}`);
}

export function sampleProblemId(sourceId: string) {
  return uuidV5(`qraft-launch-problem:${sourceId}`);
}

export function sampleEmail(handle: string) {
  return `sample.${handle}@${SAMPLE_EMAIL_DOMAIN}`;
}

export function mapSubject(raw: string): LaunchSubject {
  if (raw === "物理") return "physics";
  if (raw === "化学") return "chemistry";
  return "math";
}

export function mapLevel(raw: unknown) {
  const n = Number(raw);
  if (n >= 1 && n <= 5) return n;
  return 3;
}

export function formatSolution(q: LaunchQuest) {
  const parts = [q.solution.trim()];
  if (q.hint.trim()) parts.push(`【ヒント】${q.hint.trim()}`);
  if (q.aha_point.trim()) parts.push(`【Aha】${q.aha_point.trim()}`);
  return parts.join("\n\n");
}

function dataDir() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "data", "launch");
}

export type SkippedQuest = { file: string; id: string; title: string; reason: string };

export function loadLaunchQuests(): {
  quests: LaunchQuest[];
  files: { name: string; count: number }[];
  skipped: SkippedQuest[];
} {
  const files = [
    { name: "ahaquest.json", path: join(dataDir(), "ahaquest.json") },
    { name: "ahaquesto.json", path: join(dataDir(), "ahaquesto.json") },
  ];
  const quests: LaunchQuest[] = [];
  const summary: { name: string; count: number }[] = [];
  const skipped: SkippedQuest[] = [];
  const seen = new Set<string>();
  const seenText = new Set<string>();
  for (const file of files) {
    const raw = JSON.parse(readFileSync(file.path, "utf8")) as unknown;
    if (!Array.isArray(raw)) throw new Error(`${file.name} is not a JSON array`);
    let n = 0;
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const q = item as Record<string, unknown>;
      const id = String(q.id ?? "").trim();
      if (!id) throw new Error(`${file.name} has a row without id`);
      if (seen.has(id)) throw new Error(`duplicate id ${id} in ${file.name}`);
      seen.add(id);
      const title = String(q.title ?? "");
      const problem = String(q.problem ?? "");
      const fp = `${title}\n${problem}`.replace(/\s+/g, " ").trim().toLowerCase();
      if (fp && seenText.has(fp)) {
        skipped.push({ file: file.name, id, title, reason: "duplicate_text" });
        continue;
      }
      if (fp) seenText.add(fp);
      quests.push({
        id,
        sourceFile: file.name,
        subject: String(q.subject ?? ""),
        field: String(q.field ?? ""),
        level: mapLevel(q.level),
        mode: String(q.mode ?? "aha"),
        title: String(q.title ?? ""),
        problem: String(q.problem ?? ""),
        answer: String(q.answer ?? ""),
        solution: String(q.solution ?? ""),
        hint: String(q.hint ?? ""),
        aha_point: String(q.aha_point ?? ""),
      });
      n += 1;
    }
    summary.push({ name: file.name, count: n });
  }
  return { quests, files: summary, skipped };
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function assignAuthors(quests: LaunchQuest[]) {
  const loads = new Map(SAMPLE_USERS.map((u) => [u.handle, 0]));
  const out = new Map<string, SampleUserSpec>();
  for (const q of quests) {
    const subject = mapSubject(q.subject);
    const scored = SAMPLE_USERS.map((u) => {
      const load = loads.get(u.handle) ?? 0;
      let score = load * 40;
      if (load >= 4) score += 1000;
      if (!u.subjects.includes(subject)) score += 80;
      if (!u.fields.includes(q.field)) score += 12;
      return { u, score, load };
    }).sort((a, b) => a.score - b.score || a.u.handle.localeCompare(b.u.handle));
    const pick = scored[0].u;
    loads.set(pick.handle, (loads.get(pick.handle) ?? 0) + 1);
    out.set(q.id, pick);
  }
  return out;
}

/** Spread times from max(now+5m, 12:30 JST) to 20:30 JST with uneven gaps. */
export function schedulePublishTimes(
  count: number,
  now = new Date(),
  end = new Date(LAUNCH_END_JST),
) {
  const floor = new Date(LAUNCH_START_JST);
  const start = new Date(Math.max(now.getTime() + 5 * 60_000, floor.getTime()));
  if (start.getTime() >= end.getTime()) {
    throw new Error(
      `公開窓がありません: start ${start.toISOString()} >= end ${end.toISOString()} (20:30 JST)`,
    );
  }
  const rand = mulberry32(20260912);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const span = endMs - startMs;
  const weights: number[] = [];
  for (let i = 0; i < count; i += 1) weights.push(0.35 + rand());
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const times: number[] = [];
  let acc = startMs;
  for (let i = 0; i < count; i += 1) {
    if (i === 0) {
      acc = startMs + Math.floor(rand() * 3 * 60_000);
    } else {
      acc += (weights[i] / weightSum) * span;
    }
    times.push(acc);
  }
  times.sort((a, b) => a - b);
  const minGap = 150_000;
  for (let i = 1; i < times.length; i += 1) {
    if (times[i] < times[i - 1] + minGap) times[i] = times[i - 1] + minGap;
  }
  const last = times[times.length - 1];
  if (last > endMs) {
    const scale = (endMs - times[0]) / (last - times[0]);
    for (let i = 1; i < times.length; i += 1) {
      times[i] = times[0] + (times[i] - times[0]) * scale;
    }
  }
  times[times.length - 1] = Math.min(times[times.length - 1], endMs);
  return times.map((ms) => new Date(ms));
}

export function formatJst(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} JST`;
}

export function planLaunchContent(now = new Date()): {
  files: { name: string; count: number }[];
  users: SampleUserSpec[];
  posts: PlannedPost[];
  skipped: SkippedQuest[];
} {
  const { quests, files, skipped } = loadLaunchQuests();
  const authors = assignAuthors(quests);
  const times = schedulePublishTimes(quests.length, now);
  const posts = quests.map((q, i) => {
    const author = authors.get(q.id)!;
    const at = times[i];
    return {
      seedKey: `launch:${q.id}`,
      sourceId: q.id,
      sourceFile: q.sourceFile,
      title: q.title,
      subject: mapSubject(q.subject),
      field: q.field,
      level: q.level,
      mode: "aha" as const,
      problemText: q.problem,
      solution: formatSolution(q),
      correctAnswer: q.answer,
      authorHandle: author.handle,
      authorName: author.name,
      authorId: sampleUserId(author.handle),
      problemId: sampleProblemId(q.id),
      publishAtIso: at.toISOString(),
      publishAtJst: formatJst(at),
    };
  });
  return { files, users: SAMPLE_USERS, posts, skipped };
}

export function randomPassword() {
  return randomBytes(32).toString("base64url");
}
