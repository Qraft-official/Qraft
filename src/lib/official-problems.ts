import officialProblems from "@/content/official-problems.json";
import type { PublicProblemPreview } from "@/lib/public-catalog";

type OfficialProblemRecord = (typeof officialProblems)[number];

function toPreview(problem: OfficialProblemRecord, detail = false): PublicProblemPreview {
  return {
    id: problem.id,
    title: problem.title,
    body: problem.body,
    subject: "math",
    topic: problem.category,
    difficultyLevel: problem.difficultyLevel,
    mode: "aha",
    answerType: "answer",
    answerOptions: [],
    answerAvailable: true,
    answerUnit: problem.answerUnit ?? undefined,
    createdAt: problem.createdAt,
    photo: problem.image ?? undefined,
    imageAlt: problem.imageAlt ?? undefined,
    isSprint: false,
    isOfficial: true,
    officialSourceId: problem.sourceId,
    hints: detail ? [problem.hint] : undefined,
    explanation: detail ? problem.explanation : undefined,
  };
}

export function getOfficialProblemPreviews() {
  return officialProblems.map((problem) => toPreview(problem));
}

export function getOfficialProblemPreview(id: string) {
  const problem = officialProblems.find((item) => item.id === id);
  return problem ? toPreview(problem, true) : null;
}

export function getOfficialProblemCount() {
  return officialProblems.length;
}
