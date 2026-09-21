import { asDifficulty } from "./difficulty";
import type { ProblemMode } from "./challenge";
import type { Subject } from "./types";

export type RelatedProblemCard = {
  id: string;
  title: string;
  subject: Subject;
  topic?: string;
  difficultyLevel: number;
  mode: ProblemMode;
  isSprint: boolean;
};

export function relatedScore(
  current: RelatedProblemCard,
  candidate: RelatedProblemCard,
): number {
  if (candidate.id === current.id) return 0;
  let score = 0;
  if (candidate.subject === current.subject) score += 4;
  const a = (current.topic ?? "").trim();
  const b = (candidate.topic ?? "").trim();
  if (a && b && a === b) score += 5;
  else if (a && b && (a.includes(b) || b.includes(a))) score += 2;
  const delta = Math.abs(asDifficulty(candidate.difficultyLevel) - asDifficulty(current.difficultyLevel));
  score += Math.max(0, 3 - delta);
  if (candidate.mode === current.mode) score += 1;
  if (current.isSprint && candidate.isSprint) score += 1;
  return score;
}

export function rankRelatedProblems(
  current: RelatedProblemCard,
  candidates: RelatedProblemCard[],
  limit = 5,
): RelatedProblemCard[] {
  return candidates
    .filter((row) => row.id !== current.id)
    .map((row) => ({ row, score: relatedScore(current, row) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.row.title.localeCompare(b.row.title, "ja"))
    .slice(0, Math.max(1, Math.min(limit, 5)))
    .map((item) => item.row);
}
