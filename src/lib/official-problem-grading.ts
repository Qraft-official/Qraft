import "server-only";

import officialAnswers from "@/content/official-problem-answers.json";
import { gradeProblemAnswerRecord, type ProblemGradeResult } from "@/lib/problem-grading";

export function gradeOfficialProblem(id: string, answer: string): ProblemGradeResult | null {
  const problem = officialAnswers.find((item) => item.id === id);
  if (!problem) return null;
  return gradeProblemAnswerRecord(
    {
      mode: "aha",
      correct_answer: problem.correctAnswer,
      accepted_answers: problem.acceptedAnswers,
      answer_unit: problem.answerUnit,
      answer_type: "answer",
    },
    answer,
  );
}
