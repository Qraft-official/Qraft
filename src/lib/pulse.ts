import { isPulseOpenAt, jstDateString } from "./jst";
import { asDifficulty } from "./difficulty";
import { asSubject } from "./problems";
import type { PulseAttempt, PublishedPulse } from "./pulse-stats";
import { supabase } from "./supabase";

const PULSE_LIST_COLUMNS =
  "id, author_id, title, problem_text, subject, photo, is_sprint, sprint_day, publish_at, topic, pages, problem_format, created_at, mode, difficulty_level";

function asDay(value: unknown) {
  const raw = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : "";
}

function mapPulse(row: Record<string, unknown>): PublishedPulse | null {
  const sprintDay = asDay(row.sprint_day);
  if (!sprintDay || !row.id) return null;
  return {
    id: String(row.id),
    sprintDay,
    title: typeof row.title === "string" ? row.title : "",
    subject: asSubject(String(row.subject ?? "math")),
    difficultyLevel: asDifficulty(row.difficulty_level),
    publishAt: typeof row.publish_at === "string" ? row.publish_at : "",
  };
}

export async function fetchPublishedPulses(limit = 80, before?: string) {
  let q = supabase
    .from("problems")
    .select(PULSE_LIST_COLUMNS)
    .eq("is_sprint", true)
    .not("sprint_day", "is", null)
    .lte("publish_at", new Date().toISOString())
    .order("sprint_day", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 80)));
  if (before && /^\d{4}-\d{2}-\d{2}$/.test(before)) {
    q = q.lt("sprint_day", before);
  }
  const { data, error } = await q;
  if (error) return { pulses: [] as PublishedPulse[], rows: [] as Record<string, unknown>[], error: error.message };
  const rows = (data ?? []) as Record<string, unknown>[];
  const pulses = rows.map(mapPulse).filter((p): p is PublishedPulse => !!p && isPulseOpenAt(p.sprintDay));
  return { pulses, rows, error: null as string | null };
}

export async function fetchMyPulseAttempts() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return { attempts: [] as PulseAttempt[], error: null as string | null };

  const { data, error } = await supabase
    .from("sprint_attempts")
    .select("problem_id, grade, submitted_at, problems!inner(sprint_day, is_sprint, publish_at)")
    .eq("user_id", uid);
  if (error) {
    const fallback = await supabase
      .from("sprint_attempts")
      .select("problem_id, grade, submitted_at")
      .eq("user_id", uid);
    if (fallback.error) return { attempts: [] as PulseAttempt[], error: fallback.error.message };
    const ids = (fallback.data ?? []).map((r) => String((r as { problem_id: string }).problem_id));
    const dayById = new Map<string, string>();
    if (ids.length) {
      const { data: problems } = await supabase
        .from("problems")
        .select("id, sprint_day, publish_at, is_sprint")
        .in("id", ids)
        .eq("is_sprint", true)
        .lte("publish_at", new Date().toISOString());
      for (const p of problems ?? []) {
        const row = p as { id: string; sprint_day?: string };
        const day = asDay(row.sprint_day);
        if (day) dayById.set(row.id, day);
      }
    }
    const attempts: PulseAttempt[] = [];
    for (const raw of fallback.data ?? []) {
      const row = raw as { problem_id: string; grade?: string | null; submitted_at?: string | null };
      const sprintDay = dayById.get(row.problem_id);
      if (!sprintDay) continue;
      attempts.push({
        problemId: row.problem_id,
        sprintDay,
        grade: (row.grade as PulseAttempt["grade"]) ?? null,
        submittedAt: row.submitted_at ?? null,
      });
    }
    return { attempts, error: null as string | null };
  }

  const attempts: PulseAttempt[] = [];
  for (const raw of data ?? []) {
    const row = raw as {
      problem_id: string;
      grade?: string | null;
      submitted_at?: string | null;
      problems?: { sprint_day?: string; is_sprint?: boolean; publish_at?: string } | { sprint_day?: string }[];
    };
    const rel = Array.isArray(row.problems) ? row.problems[0] : row.problems;
    const sprintDay = asDay(rel?.sprint_day);
    if (!sprintDay) continue;
    attempts.push({
      problemId: row.problem_id,
      sprintDay,
      grade: (row.grade as PulseAttempt["grade"]) ?? null,
      submittedAt: row.submitted_at ?? null,
    });
  }
  return { attempts, error: null as string | null };
}

export function livePulseDay(now = new Date()) {
  const today = jstDateString(now);
  return isPulseOpenAt(today, now) ? today : null;
}
