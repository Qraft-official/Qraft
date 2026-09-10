import { referralFetch } from "./referral-client";
import { supabase } from "./supabase";

export type SprintTeaser = {
  scheduled: boolean;
  published?: boolean;
  day: string;
  opensAt: string;
  closesAt: string;
};

export type SprintReveal = {
  hint?: string | null;
  explanation?: string | null;
  correctAnswer?: string | null;
};

export async function fetchSprintTeaser(): Promise<SprintTeaser | null> {
  const { data, error } = await supabase.rpc("sprint_teaser");
  if (error) {
    console.warn("sprint_teaser:", error.message);
    return null;
  }
  const row = (data ?? {}) as Record<string, unknown>;
  const day = typeof row.day === "string" ? row.day : "";
  const opensAt = typeof row.opensAt === "string" ? row.opensAt : "";
  const closesAt = typeof row.closesAt === "string" ? row.closesAt : "";
  if (!day || !opensAt) return null;
  return {
    scheduled: row.scheduled === true,
    published: row.published === true,
    day,
    opensAt,
    closesAt,
  };
}

export async function fetchMySprintUnlocks(): Promise<string[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase.from("sprint_attempts").select("problem_id").eq("user_id", uid);
  if (error) {
    console.warn("sprint_attempts:", error.message);
    return [];
  }
  return (data ?? []).map((r) => String((r as { problem_id: string }).problem_id));
}

export async function submitSprintAttempt(problemId: string, answer?: string) {
  const { data, error } = await supabase.rpc("submit_sprint_attempt", {
    p_problem_id: problemId,
    p_answer: answer ?? null,
  });
  if (error) {
    const msg = error.message || "";
    if (/TIME_OVER/i.test(msg)) return { error: "制限時間を過ぎています" };
    if (/NOT_OPEN/i.test(msg)) return { error: "まだ公開されていません" };
    if (/NOT_AVAILABLE/i.test(msg)) return { error: "この問題は提出できません" };
    return { error: msg || "提出に失敗しました" };
  }
  return { error: null as string | null, data };
}

export async function fetchSprintReveal(problemId: string): Promise<SprintReveal | null> {
  const { data, error } = await supabase.rpc("sprint_reveal", { p_problem_id: problemId });
  if (error) return null;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    hint: typeof row.hint === "string" ? row.hint : null,
    explanation: typeof row.explanation === "string" ? row.explanation : null,
    correctAnswer: typeof row.correctAnswer === "string" ? row.correctAnswer : null,
  };
}

export type AdminSprintRow = {
  id: string;
  sprintDay: string;
  publishAt: string;
  title: string;
  text: string;
  subject: string;
  topic: string;
  difficultyLevel: number;
  correctAnswer: string;
  explanation: string;
  hint: string;
};

export async function adminListSprints() {
  return referralFetch("/api/admin/sprint");
}

export async function adminSaveSprint(body: Record<string, unknown>, id?: string) {
  if (id) {
    return referralFetch(`/api/admin/sprint/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  }
  return referralFetch("/api/admin/sprint", { method: "POST", body: JSON.stringify(body) });
}

export async function adminDeleteSprint(id: string) {
  return referralFetch(`/api/admin/sprint/${id}`, { method: "DELETE" });
}
