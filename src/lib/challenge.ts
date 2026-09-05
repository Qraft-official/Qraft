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

const FULLWIDTH_DIGIT = /[０-９]/g;

/** Compare challenge answers: trim, NFKC, collapse spaces, ignore case. */
export function normalizeChallengeAnswer(raw: string) {
  return raw
    .normalize("NFKC")
    .replace(FULLWIDTH_DIGIT, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function answersMatch(expected: string | null | undefined, given: string | null | undefined) {
  const a = normalizeChallengeAnswer(expected ?? "");
  const b = normalizeChallengeAnswer(given ?? "");
  return a.length > 0 && a === b;
}
