import { USER_MAP } from "./mock-data";
import { ME_ID } from "./constants";
import { ensureProfile } from "./auth";
import { supabase } from "./supabase";
import { getSprintDayId } from "./sprint";
import { isComplimentaryPremiumAccount } from "./premium";
import type { NotePage, Post, Subject, User } from "./types";

export type ProblemRow = {
  id: string;
  author_id: string;
  title: string;
  problem_text: string;
  solution: string | null;
  subject: string;
  photo: string | null;
  is_sprint: boolean;
  sprint_day: string | null;
  created_at: string;
  pages?: NotePage[] | null;
  problem_format?: string | null;
};

export type ProfileRow = {
  id: string;
  name: string;
  handle: string | null;
};

export type NewProblem = {
  subject: Subject;
  text: string;
  title?: string;
  solution?: string;
  photo?: string;
  isSprint?: boolean;
  pages?: NotePage[];
  format?: "handwriting" | "typed";
};

const SUBJECTS: Subject[] = ["math", "physics", "chemistry"];

export function asSubject(value: string): Subject {
  return SUBJECTS.includes(value as Subject) ? (value as Subject) : "math";
}

export function fallbackUser(id: string, profile?: ProfileRow | null): User {
  const base = USER_MAP[ME_ID];
  const rawHandle = profile?.handle;
  const handle =
    typeof rawHandle === "string" && rawHandle.replace(/^@/, "")
      ? rawHandle.replace(/^@/, "")
      : id.replace(/-/g, "").slice(0, 8);
  const user: User = {
    ...base,
    id,
    name: typeof profile?.name === "string" && profile.name.trim() ? profile.name.trim() : "Qraft ユーザー",
    handle,
    bio: "",
    school: "",
    titles: [],
    activeTitles: [],
    age: null,
    verified: false,
  };
  if (isComplimentaryPremiumAccount({ id, handle: user.handle, name: user.name })) {
    user.verified = true;
  }
  return user;
}

function asNotePages(value: unknown): NotePage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const pages: NotePage[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    if (typeof p.id !== "string") continue;
    pages.push({
      id: p.id,
      latex: typeof p.latex === "string" ? p.latex : "",
      doodle: typeof p.doodle === "number" ? p.doodle : 0,
      image: typeof p.image === "string" ? p.image : undefined,
    });
  }
  return pages.length ? pages : undefined;
}

export function problemToPost(row: ProblemRow): Post {
  const title = row.title?.trim() ?? "";
  const body = row.problem_text ?? "";
  const text = title ? `**${title}**\n\n${body}` : body;
  const format =
    row.problem_format === "handwriting" || row.problem_format === "typed"
      ? row.problem_format
      : undefined;
  return {
    id: row.id,
    authorId: row.author_id,
    kind: row.is_sprint ? "sprint" : "problem",
    subject: asSubject(row.subject),
    text,
    title,
    solution: row.solution ?? undefined,
    photo: row.photo ?? undefined,
    pages: asNotePages(row.pages),
    solutionFormat: format,
    isSprint: row.is_sprint,
    createdAt: row.created_at,
    replyCount: 0,
    repostCount: 0,
    likeCount: 0,
    ahaSum: 0,
    ahaCount: 0,
    eleganceSum: 0,
    eleganceCount: 0,
    sprintDay: row.is_sprint ? (row.sprint_day ?? undefined) : undefined,
  };
}

export async function fetchProblems(): Promise<{
  posts: Post[];
  profiles: Record<string, User>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { posts: [], profiles: {}, error: error.message };
  }

  const rows = (data ?? []) as ProblemRow[];
  const posts = rows.map(problemToPost);
  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const profiles: Record<string, User> = {};

  if (authorIds.length) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name, handle")
      .in("id", authorIds);
    for (const p of (profileRows ?? []) as ProfileRow[]) {
      profiles[p.id] = fallbackUser(p.id, p);
    }
  }

  return { posts, profiles, error: null };
}

export async function insertProblem(input: NewProblem): Promise<{
  post: Post | null;
  error: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { post: null, error: "投稿するにはログインしてください" };
  }

  await ensureProfile(user);

  const { data, error } = await supabase
    .from("problems")
    .insert({
      author_id: user.id,
      title: input.title?.trim() ?? "",
      problem_text: input.text,
      solution: input.solution?.trim() || null,
      subject: input.subject,
      photo: input.photo ?? null,
      is_sprint: !!input.isSprint,
      sprint_day: input.isSprint ? getSprintDayId() : null,
      pages: input.pages ?? null,
      problem_format: input.format ?? null,
    })
    .select("*")
    .single();

  if (error) return { post: null, error: error.message };
  return { post: problemToPost(data as ProblemRow), error: null };
}
