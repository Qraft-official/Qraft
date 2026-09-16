import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SprintAnswerType } from "../src/lib/sprint-grade";

export const OCTOBER_2026_JSON = "qraft_21_questions_2026_10.json";
export const DIAGRAM_DIR_PUBLIC = "public/sprint";
export const SEED_KEY_PREFIX = "pulse:2026-10:";
export const OCTOBER_JSON_ENV = "QRAFT_SPRINT_OCT_2026_JSON";

type DiagramSpec = {
  canvas_ratio?: unknown;
  shapes?: unknown;
  points?: unknown;
  lines?: unknown;
  shaded_region?: unknown;
  labels_on_figure?: unknown;
  notes_for_generator?: unknown;
};

export type OctoberQuestion = {
  date: string;
  publish_at: string;
  sprint_day: string;
  title: string;
  problem: string;
  answer: string;
  explanation: string;
  aha_point: string;
  difficulty: number;
  category: string;
  estimated_seconds?: number;
  hint: string;
  requires_diagram: boolean;
  diagram_spec: DiagramSpec | null;
  verification: string;
};

export type ValidationIssue = {
  index: number;
  sprintDay?: string;
  field?: string;
  message: string;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PUBLISH_RE = /^(\d{4}-\d{2}-\d{2})T21:00:00\+09:00$/;

export function october2026Days(): string[] {
  const out: string[] = [];
  for (let d = 1; d <= 31; d += 1) {
    out.push(`2026-10-${String(d).padStart(2, "0")}`);
  }
  return out;
}

export function diagramFileName(sprintDay: string) {
  return `sprint-${sprintDay}.svg`;
}

export function diagramAssetStatus(root: string, sprintDay: string) {
  const svgName = `sprint-${sprintDay}.svg`;
  const pngName = `sprint-${sprintDay}.png`;
  const svgAbs = join(root, DIAGRAM_DIR_PUBLIC, svgName);
  const pngAbs = join(root, DIAGRAM_DIR_PUBLIC, pngName);
  if (existsSync(svgAbs)) {
    return { file: svgName, abs: svgAbs, exists: true, publicPath: `/sprint/${svgName}` };
  }
  if (existsSync(pngAbs)) {
    return { file: pngName, abs: pngAbs, exists: true, publicPath: `/sprint/${pngName}` };
  }
  return { file: svgName, abs: svgAbs, exists: false, publicPath: `/sprint/${svgName}` };
}

export function seedKeyForDay(sprintDay: string) {
  return `${SEED_KEY_PREFIX}${sprintDay}`;
}

export function jsonPathFromRepoRoot(root: string) {
  const override = process.env[OCTOBER_JSON_ENV]?.trim();
  const candidates = [
    override || "",
    join(root, ".local", "sprint", OCTOBER_2026_JSON),
    join(root, "data", "sprint", "private", OCTOBER_2026_JSON),
    join(root, "data", "sprint", OCTOBER_2026_JSON),
  ].filter(Boolean);
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) {
    throw new Error(
      [
        "秘密JSONが見つかりません。Git管理対象外のローカルファイルを置いてください。",
        `  ${OCTOBER_JSON_ENV}=/absolute/path/${OCTOBER_2026_JSON}`,
        `  ${join(root, ".local", "sprint", OCTOBER_2026_JSON)}`,
        "このファイルは answer / explanation を含むためリポジトリに入れないでください。",
      ].join("\n"),
    );
  }
  return hit;
}

export function loadOctoberQuestions(root: string): OctoberQuestion[] {
  const path = jsonPathFromRepoRoot(root);
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("JSON root must be an array");
  return parsed as OctoberQuestion[];
}

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateOctoberQuestions(rows: OctoberQuestion[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expected = october2026Days();
  const seen = new Map<string, number>();

  if (rows.length !== 31) {
    issues.push({ index: 0, message: `件数は31であるべきです（実際 ${rows.length}）` });
  }

  rows.forEach((row, i) => {
    const index = i + 1;
    const day = String(row?.sprint_day ?? "");
    if (!DAY_RE.test(String(row?.date ?? ""))) {
      issues.push({ index, field: "date", message: "YYYY-MM-DD ではありません" });
    }
    if (!DAY_RE.test(day)) {
      issues.push({ index, field: "sprint_day", message: "YYYY-MM-DD ではありません" });
    }
    if (row.date !== row.sprint_day) {
      issues.push({
        index,
        sprintDay: day,
        field: "date",
        message: `date(${row.date}) と sprint_day(${row.sprint_day}) が不一致`,
      });
    }
    const pub = String(row?.publish_at ?? "");
    const m = PUBLISH_RE.exec(pub);
    if (!m || m[1] !== day) {
      issues.push({
        index,
        sprintDay: day,
        field: "publish_at",
        message: `各日 21:00 JST (+09:00) であるべきです（実際 ${pub}）`,
      });
    } else {
      const utc = Date.parse(pub);
      const expectedUtc = Date.parse(`${day}T12:00:00.000Z`);
      if (utc !== expectedUtc) {
        issues.push({
          index,
          sprintDay: day,
          field: "publish_at",
          message: "JST 21:00 が UTC 12:00 になっていません",
        });
      }
    }
    for (const field of ["title", "problem", "answer", "explanation", "hint", "aha_point", "verification", "category"] as const) {
      if (!nonEmpty(row[field])) {
        issues.push({ index, sprintDay: day, field, message: "空です" });
      }
    }
    if (![1, 2, 3, 4, 5].includes(Number(row.difficulty))) {
      issues.push({ index, sprintDay: day, field: "difficulty", message: "1〜5 の整数であるべきです" });
    }
    if (typeof row.requires_diagram !== "boolean") {
      issues.push({ index, sprintDay: day, field: "requires_diagram", message: "boolean であるべきです" });
    }
    if (row.requires_diagram === true && (!row.diagram_spec || typeof row.diagram_spec !== "object")) {
      issues.push({ index, sprintDay: day, field: "diagram_spec", message: "requires_diagram=true なのに diagram_spec がありません" });
    }
    if (seen.has(day)) {
      issues.push({ index, sprintDay: day, message: `sprint_day が重複（先に #${seen.get(day)}）` });
    } else if (day) {
      seen.set(day, index);
    }
  });

  for (const day of expected) {
    if (!seen.has(day)) issues.push({ index: 0, sprintDay: day, message: "この日の問題がありません" });
  }
  for (const day of seen.keys()) {
    if (!expected.includes(day)) {
      issues.push({ index: seen.get(day) ?? 0, sprintDay: day, message: "2026-10 の範囲外です" });
    }
  }

  return issues;
}

export function inferAnswerType(answer: string): SprintAnswerType {
  const s = answer.trim();
  if (/[①②]/.test(s) || /位C|中点のとき|理由も含めて/.test(s) || s.length > 28) {
    return "text";
  }
  if (/[√]/.test(s)) return "text";
  if (/奇数|偶数/.test(s) && !/\d/.test(s)) return "text";
  if (/\d/.test(s)) return "number";
  return "text";
}

export function acceptedAnswersFor(answer: string): string[] {
  const out = new Set<string>();
  const trimmed = answer.trim();
  out.add(trimmed);
  const noSpace = trimmed.replace(/\s+/g, "");
  if (noSpace !== trimmed) out.add(noSpace);
  const num = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (num) out.add(num[0]);
  const sqrt = trimmed.match(/(\d+)\s*√\s*(\d+)/);
  if (sqrt) {
    out.add(`${sqrt[1]}√${sqrt[2]}`);
    out.add(`${sqrt[1]}sqrt(${sqrt[2]})`);
  }
  return [...out].filter(Boolean).slice(0, 12);
}

export function publicExplanation(explanation: string, ahaPoint: string) {
  const body = explanation.trim();
  const aha = ahaPoint.trim();
  if (!aha) return body;
  return `${body}\n\n【Aha】${aha}`;
}

export function repoRootFromThisFile(metaUrl: string) {
  return dirname(dirname(fileURLToPath(metaUrl)));
}
