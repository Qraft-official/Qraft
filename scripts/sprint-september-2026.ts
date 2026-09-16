import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  acceptedAnswersFor,
  diagramAssetStatus,
  inferAnswerType,
  publicExplanation,
  repoRootFromThisFile,
  type ValidationIssue,
} from "./sprint-october-2026";
import type { OctoberQuestion } from "./sprint-october-2026";

export const SEPTEMBER_2026_JSON = "qraft_21_questions_2026_09.json";
export const SEPTEMBER_JSON_ENV = "QRAFT_SPRINT_SEP_2026_JSON";
export const SEPTEMBER_SEED_KEY_PREFIX = "pulse:2026-09:";

export type SeptemberQuestion = OctoberQuestion;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const PUBLISH_RE = /^(\d{4}-\d{2}-\d{2})T21:00:00\+09:00$/;

export function september2026Days(): string[] {
  const out: string[] = [];
  for (let d = 16; d <= 30; d += 1) {
    out.push(`2026-09-${String(d).padStart(2, "0")}`);
  }
  return out;
}

export function seedKeyForSeptemberDay(sprintDay: string) {
  return `${SEPTEMBER_SEED_KEY_PREFIX}${sprintDay}`;
}

export {
  acceptedAnswersFor,
  diagramAssetStatus,
  inferAnswerType,
  publicExplanation,
  repoRootFromThisFile,
};

export function septemberJsonPathFromRepoRoot(root: string) {
  const override = process.env[SEPTEMBER_JSON_ENV]?.trim();
  const candidates = [
    override || "",
    join(root, ".local", "sprint", SEPTEMBER_2026_JSON),
    join(root, "data", "sprint", "private", SEPTEMBER_2026_JSON),
    join(root, "data", "sprint", SEPTEMBER_2026_JSON),
  ].filter(Boolean);
  const hit = candidates.find((p) => existsSync(p));
  if (!hit) {
    throw new Error(
      [
        "秘密JSONが見つかりません。Git管理対象外のローカルファイルを置いてください。",
        `  ${SEPTEMBER_JSON_ENV}=/absolute/path/${SEPTEMBER_2026_JSON}`,
        `  ${join(root, ".local", "sprint", SEPTEMBER_2026_JSON)}`,
        "このファイルは answer / explanation を含むためリポジトリに入れないでください。",
      ].join("\n"),
    );
  }
  return hit;
}

export function loadSeptemberQuestions(root: string): SeptemberQuestion[] {
  const path = septemberJsonPathFromRepoRoot(root);
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("JSON root must be an array");
  return parsed as SeptemberQuestion[];
}

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateSeptemberQuestions(rows: SeptemberQuestion[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const expected = september2026Days();
  const seen = new Map<string, number>();

  if (rows.length !== 15) {
    issues.push({ index: 0, message: `件数は15であるべきです（実際 ${rows.length}）` });
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
    if (day === "2026-09-12") {
      issues.push({ index, sprintDay: day, message: "既存の 2026-09-12 PULSE はこのJSONに含めてはいけません" });
    }
  });

  for (const day of expected) {
    if (!seen.has(day)) issues.push({ index: 0, sprintDay: day, message: "この日の問題がありません" });
  }
  for (const day of seen.keys()) {
    if (!expected.includes(day)) {
      issues.push({ index: seen.get(day) ?? 0, sprintDay: day, message: "2026-09-16〜09-30 の範囲外です" });
    }
  }

  return issues;
}
