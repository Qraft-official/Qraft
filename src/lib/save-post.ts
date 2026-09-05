import { STORAGE_KEYS } from "./constants";
import { isProblemUuid } from "./difficulty";
import { asSaveCategory, type SaveCategory } from "./learn";
import type { Post } from "./types";

/** Problem-like posts the user can bookmark (own or others). */
export function canSavePost(post: Pick<Post, "kind">) {
  return post.kind === "problem" || post.kind === "sprint";
}

export function saveTargetId(post: Pick<Post, "id" | "kind" | "problemId">) {
  if (!canSavePost(post)) return null;
  return post.id;
}

export function saveStateKey(problemId: string) {
  return isProblemUuid(problemId) ? problemId.toLowerCase() : problemId;
}

export function loadLocalSavedMap(): Record<string, SaveCategory> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.savedLocal);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, SaveCategory> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (!k || isProblemUuid(k)) continue;
      if (v === true) out[k] = "later";
      else if (v === "later" || v === "exam" || v === "hard") out[k] = asSaveCategory(v);
    }
    return out;
  } catch {
    return {};
  }
}

export function persistLocalSavedMap(saved: Record<string, SaveCategory>) {
  if (typeof window === "undefined") return;
  const local: Record<string, SaveCategory> = {};
  for (const [k, v] of Object.entries(saved)) {
    if (k && v && !isProblemUuid(k)) local[k] = v;
  }
  localStorage.setItem(STORAGE_KEYS.savedLocal, JSON.stringify(local));
}

export function overlaySavedMap(
  incoming: Record<string, SaveCategory>,
  prev: Record<string, SaveCategory>,
  pending: Set<string>,
  sticky: Record<string, boolean>,
) {
  const next: Record<string, SaveCategory> = {};
  for (const [k, v] of Object.entries(incoming)) next[k.toLowerCase()] = v;
  for (const [k, v] of Object.entries(prev)) {
    if (!isProblemUuid(k)) next[k] = v;
  }
  for (const raw of pending) {
    const id = saveStateKey(raw);
    if (prev[id]) next[id] = prev[id];
    else delete next[id];
  }
  for (const raw of Object.keys(sticky)) {
    const id = saveStateKey(raw);
    const want = sticky[raw];
    const serverOn = Boolean(next[id]);
    if (serverOn === want) {
      delete sticky[raw];
      delete sticky[id];
      continue;
    }
    if (want) next[id] = prev[id] ?? "later";
    else delete next[id];
  }
  return next;
}
