import { answersMatch } from "@/lib/answer-normalize";
import { asProblemAnswerType } from "@/lib/problem-answer";

export type ProblemGradeRecord = {
  mode: string | null;
  correct_answer: string | null;
  accepted_answers?: unknown;
  answer_unit?: string | null;
  answer_type?: string | null;
  answer_options?: { id?: string }[] | null;
};

export type ProblemGradeResult = {
  graded: boolean;
  correct: boolean | null;
};

export function sanitizeAcceptedAnswers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, 20);
}

export function gradeProblemAnswerRecord(
  data: ProblemGradeRecord,
  given: string,
): ProblemGradeResult {
  const expected = String(data.correct_answer ?? "").trim();
  const answerType = asProblemAnswerType(data.answer_type);
  if (answerType === "written") return { graded: false, correct: null };
  if (!expected) return { graded: false, correct: null };

  if (answerType === "choice") {
    const isValidOption = (data.answer_options ?? []).some((option) => option.id === given);
    return { graded: true, correct: isValidOption && expected === given };
  }

  if (!data.answer_type && data.mode !== "challenge" && data.mode !== "aha") {
    return { graded: false, correct: null };
  }

  const targets = [expected, ...sanitizeAcceptedAnswers(data.accepted_answers)];
  return {
    graded: true,
    correct: targets.some((target) => answersMatch(target, given, data.answer_unit)),
  };
}