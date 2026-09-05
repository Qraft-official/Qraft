import { DRAFT_MAX_CHARS } from "./learn";
import type { TextSizeId } from "./text-size";
import type { CanvasPage, ProblemMode, Subject, Tier } from "./types";

type TypedPage = { id: string; latex: string };

export type ComposerDraft = {
  v: 1;
  userId: string;
  kind: "problem" | "solution";
  quotePostId?: string;
  isSprint?: boolean;
  savedAt: number;
  title: string;
  subject: Subject;
  postMode: ProblemMode;
  difficultyLevel: Tier;
  correctAnswer: string;
  solutionDraft: string;
  hints: string[];
  inputMode: "hand" | "typed";
  typedPages: TypedPage[];
  pages?: CanvasPage[];
  photo?: string;
  text?: string;
  solverAnswer?: string;
  hadHandwriting?: boolean;
  notebookTextSize?: TextSizeId;
  step?: 1 | 2 | 3;
};

function keyFor(userId: string, kind: "problem" | "solution", quotePostId?: string) {
  if (kind === "solution") return `qraft.draft.v1.${userId}.solution.${quotePostId ?? "none"}`;
  return `qraft.draft.v1.${userId}.problem`;
}

function slimPages(pages: CanvasPage[]): { pages?: CanvasPage[]; hadHandwriting: boolean } {
  const hasInk = pages.some(
    (p) => p.strokes.length > 0 || (p.texts?.length ?? 0) > 0 || p.backgroundImage,
  );
  if (!hasInk) return { hadHandwriting: false };
  const json = JSON.stringify(pages);
  if (json.length <= DRAFT_MAX_CHARS) return { pages, hadHandwriting: true };
  return {
    hadHandwriting: true,
    pages: pages.map((p) => ({
      id: p.id,
      strokes: [],
      texts: [],
      backgroundImage: p.backgroundImage?.startsWith("http") ? p.backgroundImage : undefined,
      backgroundWidth: p.backgroundWidth,
      backgroundHeight: p.backgroundHeight,
    })),
  };
}

export function readComposerDraft(
  userId: string,
  kind: "problem" | "solution",
  quotePostId?: string,
): ComposerDraft | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId, kind, quotePostId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ComposerDraft;
    if (parsed.v !== 1 || parsed.userId !== userId || parsed.kind !== kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeComposerDraft(draft: ComposerDraft) {
  if (typeof window === "undefined") return;
  const slim = slimPages(draft.pages ?? []);
  const photo =
    draft.photo && draft.photo.startsWith("data:") && draft.photo.length > DRAFT_MAX_CHARS
      ? undefined
      : draft.photo;
  const payload: ComposerDraft = {
    ...draft,
    photo,
    pages: slim.pages,
    hadHandwriting: slim.hadHandwriting,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(keyFor(draft.userId, draft.kind, draft.quotePostId), JSON.stringify(payload));
  } catch {
    try {
      localStorage.setItem(
        keyFor(draft.userId, draft.kind, draft.quotePostId),
        JSON.stringify({ ...payload, pages: undefined, photo: undefined }),
      );
    } catch {
      /* quota */
    }
  }
}

export function clearComposerDraft(
  userId: string,
  kind: "problem" | "solution",
  quotePostId?: string,
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(keyFor(userId, kind, quotePostId));
  } catch {
    /* ignore */
  }
}

export function draftIsEmpty(d: ComposerDraft) {
  if (d.title.trim() || d.solutionDraft.trim() || d.correctAnswer.trim() || (d.text ?? "").trim()) {
    return false;
  }
  if (d.hints.some((h) => h.trim()) || d.typedPages.some((p) => p.latex.trim())) return false;
  if (d.photo || d.hadHandwriting) return false;
  if (d.pages?.some((p) => p.strokes.length || p.texts?.length || p.backgroundImage)) return false;
  return true;
}
