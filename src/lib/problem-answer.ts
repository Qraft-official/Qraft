export const PROBLEM_ANSWER_TYPES = ["answer", "choice", "written"] as const;
export type ProblemAnswerType = (typeof PROBLEM_ANSWER_TYPES)[number];

export type AnswerOption = {
  id: string;
  text: string;
};

export function asProblemAnswerType(value: unknown): ProblemAnswerType {
  return PROBLEM_ANSWER_TYPES.includes(value as ProblemAnswerType)
    ? (value as ProblemAnswerType)
    : "answer";
}

export function sanitizeAnswerOptions(value: unknown): AnswerOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 6)
    .flatMap((raw) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as Record<string, unknown>;
      const id = typeof item.id === "string" ? item.id.trim().slice(0, 80) : "";
      const text = typeof item.text === "string" ? item.text.trim().slice(0, 500) : "";
      return id && text ? [{ id, text }] : [];
    });
}

export function validChoiceAnswer(options: AnswerOption[], correctId: string) {
  const ids = new Set(options.map((option) => option.id));
  return options.length >= 2 && options.length <= 6 &&
    ids.size === options.length && ids.has(correctId) &&
    options.every((option) => option.text.trim());
}

export function createAnswerOptionId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `option-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}