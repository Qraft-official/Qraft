import { answersMatch as matchNormalized, normalizeAnswerLiteral } from "./answer-normalize";

export { ANSWER_UNIT_MAX, sanitizeAnswerUnit } from "./answer-normalize";

export const PROBLEM_MODES = ["question", "challenge", "aha"] as const;
export type ProblemMode = (typeof PROBLEM_MODES)[number];
export type ChallengeGrade = "correct" | "incorrect";

export function asProblemMode(value: unknown): ProblemMode {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "challenge" || raw === "challenger") return "challenge";
  if (raw === "aha" || raw === "aha!") return "aha";
  if (raw === "question") return "question";
  return "question";
}

export function modeStoresAnswer(mode: ProblemMode) {
  return mode === "challenge" || mode === "aha";
}

export function normalizeChallengeAnswer(raw: string) {
  return normalizeAnswerLiteral(raw);
}

export function answersMatch(
  expected: string | null | undefined,
  given: string | null | undefined,
  unit?: string | null,
) {
  return matchNormalized(expected, given, unit);
}
