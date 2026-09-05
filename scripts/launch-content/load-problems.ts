import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Subject } from "../../src/lib/types";
import type { SampleTrack } from "./sample-users";

export type RawAhaItem = {
  id?: unknown;
  subject?: unknown;
  field?: unknown;
  level?: unknown;
  mode?: unknown;
  title?: unknown;
  problem?: unknown;
  answer?: unknown;
  solution?: unknown;
  hint?: unknown;
  aha_point?: unknown;
};

export type LaunchProblem = {
  seedKey: string;
  subject: Subject;
  track: SampleTrack;
  field: string;
  level: number;
  mode: "aha";
  title: string;
  problem: string;
  answer: string;
  solution: string;
  hint: string;
};

const JP_SUBJECT: Record<string, { subject: Subject; track: SampleTrack }> = {
  数学: { subject: "math", track: "math" },
  物理: { subject: "physics", track: "physics" },
  化学: { subject: "chemistry", track: "chemistry" },
  論理: { subject: "math", track: "logic" },
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseAhaItem(raw: RawAhaItem): { ok: LaunchProblem } | { error: string } {
  const seedKey = asText(raw.id);
  if (!seedKey) return { error: "missing id" };
  const subjectLabel = asText(raw.subject);
  const mapped = JP_SUBJECT[subjectLabel];
  if (!mapped) return { error: `${seedKey}: unknown subject ${subjectLabel}` };
  const title = asText(raw.title);
  const problem = asText(raw.problem);
  const answer = asText(raw.answer);
  const solution = asText(raw.solution);
  const hint = asText(raw.hint);
  const level = Number(raw.level);
  if (!title) return { error: `${seedKey}: missing title` };
  if (!problem) return { error: `${seedKey}: missing problem` };
  if (!answer) return { error: `${seedKey}: missing answer` };
  if (!Number.isInteger(level) || level < 1 || level > 5) {
    return { error: `${seedKey}: invalid level` };
  }
  const mode = asText(raw.mode).toLowerCase();
  if (mode && mode !== "aha") return { error: `${seedKey}: expected mode aha` };
  return {
    ok: {
      seedKey,
      subject: mapped.subject,
      track: mapped.track,
      field: asText(raw.field),
      level,
      mode: "aha",
      title,
      problem,
      answer,
      solution,
      hint,
    },
  };
}

export function launchContentDir() {
  return dirname(fileURLToPath(import.meta.url));
}

export function loadLaunchProblems(dir = launchContentDir()) {
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const loaded: RawAhaItem[] = [];
  const valid: LaunchProblem[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown;
    if (!Array.isArray(parsed)) {
      invalid.push(`${file}: root is not an array`);
      continue;
    }
    for (const row of parsed) {
      loaded.push(row as RawAhaItem);
      const result = parseAhaItem(row as RawAhaItem);
      if ("error" in result) {
        invalid.push(`${file}: ${result.error}`);
        continue;
      }
      if (seen.has(result.ok.seedKey)) {
        invalid.push(`${file}: duplicate id ${result.ok.seedKey}`);
        continue;
      }
      seen.add(result.ok.seedKey);
      valid.push(result.ok);
    }
  }

  valid.sort((a, b) => a.seedKey.localeCompare(b.seedKey));
  return { files, loadedCount: loaded.length, valid, invalid };
}
