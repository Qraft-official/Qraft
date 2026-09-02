import type { Tier, Tiers } from "./types";
import type { User } from "@supabase/supabase-js";
import { isReservedHandle, isValidHandle, RESERVED_HANDLE_ERROR, sanitizeHandleInput } from "./handle";
import { supabase } from "./supabase";

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function formatAuthError(message: string | null | undefined) {
  const raw = (message ?? "").trim();
  if (!raw) return "認証に失敗しました";
  if (/unsupported provider/i.test(raw) || /provider is not enabled/i.test(raw)) {
    return "メールアドレスとパスワードでログインしてください。";
  }
  return raw;
}

export function emailRedirectTo() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/auth/callback`;
}

export function displayNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const meta = user.user_metadata ?? {};
  const name = asText(meta.name) || asText(meta.full_name);
  if (name.trim()) return name.trim();
  const email = asText(user.email);
  return email.split("@")[0] || "Qraft ユーザー";
}

export function handleFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const meta = user.user_metadata ?? {};
  const handle = asText(meta.handle);
  if (handle.trim()) {
    const cleaned = sanitizeHandleInput(handle.trim());
    if (!cleaned || isReservedHandle(cleaned)) return undefined;
    return cleaned;
  }
  const email = asText(user.email);
  const fromEmail = email.split("@")[0]?.replace(/[^a-zA-Z0-9_.-]/g, "") ?? "";
  if (fromEmail && isReservedHandle(fromEmail)) return undefined;
  return fromEmail || undefined;
}

export async function checkIsAdmin() {
  try {
    const { data, error } = await supabase.rpc("is_admin");
    if (error) {
      console.warn("is_admin rpc failed:", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.warn("is_admin rpc failed:", err);
    return false;
  }
}

export async function ensureProfile(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  try {
    const incoming = {
      name: displayNameFromUser(user),
      handle: handleFromUser(user) ?? null,
    };
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, name, handle")
      .eq("id", user.id)
      .maybeSingle();
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (!existing.name) patch.name = incoming.name;
      if (!existing.handle && incoming.handle && !isReservedHandle(incoming.handle)) {
        patch.handle = incoming.handle;
      }
      if (Object.keys(patch).length) {
        await supabase.from("profiles").update(patch).eq("id", user.id);
      }
      return;
    }
    const first = await supabase.from("profiles").upsert({
      id: user.id,
      name: incoming.name,
      handle: incoming.handle && !isReservedHandle(incoming.handle) ? incoming.handle : null,
    });
    if (!first.error) return;
    await supabase.from("profiles").upsert({ id: user.id, name: incoming.name, handle: null });
  } catch (err) {
    console.warn("ensureProfile failed:", err);
  }
}

export type LearningProfile = {
  id: string;
  name: string;
  handle: string | null;
  age: number | null;
  onboarded: boolean;
  math_tier: number;
  physics_tier: number;
  chemistry_tier: number;
};

export function asTier(value: unknown): Tier {
  const n = Number(value);
  if (n >= 1 && n <= 5) return n as Tier;
  return 1;
}

export function tiersFromProfile(row: Pick<LearningProfile, "math_tier" | "physics_tier" | "chemistry_tier">): Tiers {
  return {
    math: asTier(row.math_tier),
    physics: asTier(row.physics_tier),
    chemistry: asTier(row.chemistry_tier),
  };
}

export async function fetchLearningProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,handle,age,onboarded,math_tier,physics_tier,chemistry_tier")
    .eq("id", userId)
    .maybeSingle();
  return { data: data as LearningProfile | null, error };
}

export async function saveLearningProfile(
  userId: string,
  input: { age: number; tiers: Tiers; onboarded?: boolean },
) {
  const patch: Record<string, unknown> = {
    age: input.age,
    math_tier: input.tiers.math,
    physics_tier: input.tiers.physics,
    chemistry_tier: input.tiers.chemistry,
  };
  if (input.onboarded !== undefined) patch.onboarded = input.onboarded;
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  return { error: error?.message };
}

export const HANDLE_CHANGE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
export const HANDLE_CHANGE_MAX = 2;

export type HandleChangeStatus = {
  used: number;
  remaining: number;
  nextAt: string | null;
};

export function formatHandleNextDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export async function fetchHandleChangeStatus(userId: string): Promise<HandleChangeStatus> {
  const since = new Date(Date.now() - HANDLE_CHANGE_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("handle_changes")
    .select("changed_at")
    .eq("user_id", userId)
    .gte("changed_at", since)
    .order("changed_at", { ascending: true });
  if (error) {
    console.warn("fetchHandleChangeStatus:", error.message);
    return { used: 0, remaining: HANDLE_CHANGE_MAX, nextAt: null };
  }
  const rows = data ?? [];
  const used = rows.length;
  const remaining = Math.max(0, HANDLE_CHANGE_MAX - used);
  const nextAt =
    used >= HANDLE_CHANGE_MAX && rows[0]?.changed_at
      ? new Date(new Date(rows[0].changed_at).getTime() + HANDLE_CHANGE_WINDOW_MS).toISOString()
      : null;
  return { used, remaining, nextAt };
}

export async function savePublicProfile(
  userId: string,
  input: { name: string; handle: string },
): Promise<{ error?: string; handleLocked?: boolean; nextAt?: string | null }> {
  const nextHandle = sanitizeHandleInput(input.handle.trim());
  if (!nextHandle || !isValidHandle(nextHandle)) {
    return { error: "アカウントIDは半角英数字と - _ . のみ使えます" };
  }
  if (isReservedHandle(nextHandle)) {
    return { error: RESERVED_HANDLE_ERROR };
  }

  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("handle, name")
    .eq("id", userId)
    .maybeSingle();
  if (readError) return { error: readError.message };

  const prevHandle = typeof current?.handle === "string" ? current.handle : "";
  const handleChanged = prevHandle !== nextHandle;

  if (handleChanged) {
    const status = await fetchHandleChangeStatus(userId);
    if (status.remaining <= 0) {
      return {
        error: status.nextAt
          ? `アカウントIDの変更は2週間に2回までです。次回は ${formatHandleNextDate(status.nextAt)} 以降に変更できます`
          : "アカウントIDの変更は2週間に2回までです",
        handleLocked: true,
        nextAt: status.nextAt,
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ name: input.name.trim() || current?.name || "Qraft ユーザー", handle: nextHandle })
    .eq("id", userId);

  if (error) {
    if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
      return { error: "このアカウントIDは既に使われています。別のIDを指定してください" };
    }
    if (/RESERVED_HANDLE/i.test(error.message)) {
      return { error: RESERVED_HANDLE_ERROR };
    }
    if (/HANDLE_CHANGE_LIMIT/i.test(error.message)) {
      const status = await fetchHandleChangeStatus(userId);
      return {
        error: status.nextAt
          ? `アカウントIDの変更は2週間に2回までです。次回は ${formatHandleNextDate(status.nextAt)} 以降に変更できます`
          : "アカウントIDの変更は2週間に2回までです",
        handleLocked: true,
        nextAt: status.nextAt,
      };
    }
    return { error: error.message };
  }

  await supabase.auth.updateUser({ data: { name: input.name.trim(), handle: nextHandle } });

  return {};
}

export async function searchProfiles(query: string) {
  const q = query.trim().replace(/[%_,]/g, "").slice(0, 40);
  if (!q) return { profiles: [] as { id: string; name: string; handle: string | null }[], error: null as string | null };
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, handle")
    .or(`name.ilike.%${q}%,handle.ilike.%${q}%`)
    .limit(24);
  if (error) return { profiles: [], error: error.message };
  return { profiles: data ?? [], error: null };
}

export function sessionUserFields(user: User) {
  return {
    name: displayNameFromUser(user),
    handle: handleFromUser(user),
    email: user.email ?? null,
  };
}
