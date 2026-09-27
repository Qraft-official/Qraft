import { fetchPublicProblemPreview, type PublicProblemPreview } from "@/lib/public-catalog";
import { supabase } from "@/lib/supabase";

export type ProblemSetSummary = {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type ProblemSetEntry = {
  problemId: string;
  position: number;
  preview: PublicProblemPreview | null;
};

function mapSet(row: Record<string, unknown>, itemCount = 0): ProblemSetSummary {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    title: String(row.title ?? ""),
    description: typeof row.description === "string" ? row.description : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    itemCount,
  };
}

export async function fetchMyProblemSets(): Promise<ProblemSetSummary[]> {
  const { data, error } = await supabase
    .from("problem_sets")
    .select("id, owner_id, title, description, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("problem_sets:", error.message);
    return [];
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  const counts = new Map<string, number>();
  if (rows.length) {
    const { data: items } = await supabase
      .from("problem_set_items")
      .select("problem_set_id")
      .in("problem_set_id", rows.map((row) => String(row.id)));
    for (const item of items ?? []) {
      const id = String((item as { problem_set_id: string }).problem_set_id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return rows.map((row) => mapSet(row, counts.get(String(row.id)) ?? 0));
}

export async function fetchProblemSet(id: string) {
  const { data, error } = await supabase
    .from("problem_sets")
    .select("id, owner_id, title, description, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const set = mapSet(data as Record<string, unknown>);
  const { data: itemRows, error: itemsError } = await supabase
    .from("problem_set_items")
    .select("problem_id, position, created_at")
    .eq("problem_set_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (itemsError) return { set, items: [] as ProblemSetEntry[] };
  const items = await Promise.all((itemRows ?? []).map(async (raw) => {
    const row = raw as { problem_id: string; position: number };
    return {
      problemId: row.problem_id,
      position: row.position,
      preview: await fetchPublicProblemPreview(row.problem_id),
    };
  }));
  set.itemCount = items.length;
  return { set, items };
}

export async function createProblemSet(title: string, description: string) {
  const name = title.trim().slice(0, 100);
  if (!name) return { error: "問題集のタイトルを入力してください", set: null as ProblemSetSummary | null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインしてください", set: null as ProblemSetSummary | null };
  const { data, error } = await supabase
    .from("problem_sets")
    .insert({ owner_id: user.id, title: name, description: description.trim().slice(0, 1000) || null })
    .select("id, owner_id, title, description, created_at, updated_at")
    .single();
  if (error || !data) return { error: error?.message ?? "作成できませんでした", set: null };
  return { error: null, set: mapSet(data as Record<string, unknown>) };
}

export async function updateProblemSet(id: string, title: string, description: string) {
  const name = title.trim().slice(0, 100);
  if (!name) return { error: "問題集のタイトルを入力してください" };
  const { error } = await supabase
    .from("problem_sets")
    .update({ title: name, description: description.trim().slice(0, 1000) || null })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteProblemSet(id: string) {
  const { error } = await supabase.from("problem_sets").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function addProblemToSet(setId: string, problemId: string) {
  const { data: current, error: readError } = await supabase
    .from("problem_set_items")
    .select("problem_id, position")
    .eq("problem_set_id", setId)
    .order("position", { ascending: true });
  if (readError) return { error: readError.message, added: false };
  if ((current ?? []).some((row) => String((row as { problem_id: string }).problem_id) === problemId)) {
    return { error: null, added: false };
  }
  const nextPosition = (current ?? []).reduce(
    (max, row) => Math.max(max, Number((row as { position: number }).position) || 0),
    -1,
  ) + 1;
  const { error } = await supabase.from("problem_set_items").insert({
    problem_set_id: setId,
    problem_id: problemId,
    position: nextPosition,
  });
  if (error && /duplicate|unique/i.test(error.message)) return { error: null, added: false };
  return { error: error?.message ?? null, added: !error };
}

export async function removeProblemFromSet(setId: string, problemId: string) {
  const { error } = await supabase
    .from("problem_set_items")
    .delete()
    .eq("problem_set_id", setId)
    .eq("problem_id", problemId);
  return { error: error?.message ?? null };
}

export async function reorderProblemSet(setId: string, orderedIds: string[]) {
  const results = await Promise.all(orderedIds.map((problemId, position) =>
    supabase
      .from("problem_set_items")
      .update({ position })
      .eq("problem_set_id", setId)
      .eq("problem_id", problemId),
  ));
  const error = results.find((result) => result.error)?.error;
  return { error: error?.message ?? null };
}
