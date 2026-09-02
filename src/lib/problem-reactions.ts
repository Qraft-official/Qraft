import { CONFUSED_EMOJI, HARD_SPOTLIGHT_MIN, isProblemUuid } from "./difficulty";
import { supabase } from "./supabase";

export async function fetchMyConfusedProblemIds(userId: string) {
  const { data, error } = await supabase
    .from("problem_reactions")
    .select("problem_id")
    .eq("user_id", userId)
    .eq("emoji", CONFUSED_EMOJI);
  if (error) {
    console.warn("fetchMyConfusedProblemIds:", error.message);
    return [] as string[];
  }
  return (data ?? []).map((r) => String((r as { problem_id: string }).problem_id));
}

export async function toggleConfusedReaction(problemId: string, currentlyOn: boolean) {
  if (!isProblemUuid(problemId)) {
    return { error: null as string | null, persisted: false };
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { error: "ログインしてください", persisted: false };

  if (currentlyOn) {
    const { error } = await supabase
      .from("problem_reactions")
      .delete()
      .eq("user_id", uid)
      .eq("problem_id", problemId)
      .eq("emoji", CONFUSED_EMOJI);
    if (error) return { error: error.message, persisted: true };
    return { error: null, persisted: true };
  }

  const { error } = await supabase.from("problem_reactions").insert({
    user_id: uid,
    problem_id: problemId,
    emoji: CONFUSED_EMOJI,
  });
  if (error) return { error: error.message, persisted: true };
  return { error: null, persisted: true };
}

export async function notifyConfusedReactors(problemId: string) {
  if (!isProblemUuid(problemId)) return { error: null as string | null, notified: 0 };
  const { data, error } = await supabase.rpc("notify_confused_reactors", {
    p_problem_id: problemId,
  });
  if (error) {
    console.warn("notify_confused_reactors:", error.message);
    return { error: error.message, notified: 0 };
  }
  return { error: null, notified: typeof data === "number" ? data : 0 };
}

export function spotlightFromCount(count: number) {
  return count >= HARD_SPOTLIGHT_MIN;
}
