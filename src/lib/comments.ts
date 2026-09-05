import { isProblemUuid } from "./difficulty";
import { fallbackUser } from "./problems";
import { supabase } from "./supabase";
import type { Post, Subject, User } from "./types";

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

function asSubject(value: string | undefined): Subject {
  if (value === "physics" || value === "chemistry" || value === "math") return value;
  return "math";
}

export function commentToPost(row: CommentRow, subject: Subject = "math"): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    kind: "reply",
    subject,
    text: row.body,
    replyToId: row.post_id,
    createdAt: row.created_at,
    replyCount: 0,
    repostCount: 0,
    likeCount: 0,
    ahaSum: 0,
    ahaCount: 0,
    eleganceSum: 0,
    eleganceCount: 0,
  };
}

export async function fetchComments(parentSubjectById: Record<string, Subject> = {}): Promise<{
  posts: Post[];
  profiles: Record<string, User>;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("comments")
    .select("id, post_id, author_id, body, created_at")
    .order("created_at", { ascending: true });
  if (error) return { posts: [], profiles: {}, error: error.message };

  const rows = (data ?? []) as CommentRow[];
  const posts = rows.map((row) => commentToPost(row, asSubject(parentSubjectById[row.post_id])));
  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  const profiles: Record<string, User> = {};
  if (authorIds.length) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, name, handle")
      .in("id", authorIds);
    for (const p of profileRows ?? []) {
      const row = p as { id: string; name?: string | null; handle?: string | null };
      profiles[row.id] = fallbackUser(row.id, {
        id: row.id,
        name: row.name ?? "",
        handle: row.handle ?? null,
      });
    }
  }
  return { posts, profiles, error: null };
}

export async function insertComment(input: {
  postId: string;
  text: string;
  subject?: Subject;
}): Promise<{ post: Post | null; error: string | null }> {
  if (!isProblemUuid(input.postId)) {
    return { post: null, error: null };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const authorId = session?.user?.id;
  if (!authorId) return { post: null, error: "ログインしてください" };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: input.postId,
      author_id: authorId,
      body: input.text,
    })
    .select("id, post_id, author_id, body, created_at")
    .single();
  if (error) return { post: null, error: error.message };
  return { post: commentToPost(data as CommentRow, input.subject ?? "math"), error: null };
}

export async function deleteComment(id: string): Promise<{ error: string | null }> {
  if (!isProblemUuid(id)) return { error: null };
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) return { error: userError.message };
  if (!user?.id) return { error: "ログインしてください" };
  const { data, error } = await supabase.from("comments").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) {
    return { error: "このコメントは削除できません。" };
  }
  return { error: null };
}
