import type { Tier, Tiers } from "./types";
import type { User } from "@supabase/supabase-js";
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
  if (handle.trim()) return handle.trim().replace(/^@/, "");
  const email = asText(user.email);
  const fromEmail = email.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "") ?? "";
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
    const row = {
      id: user.id,
      name: displayNameFromUser(user),
      handle: handleFromUser(user) ?? null,
    };
    const first = await supabase.from("profiles").upsert(row);
    if (!first.error) return;
    await supabase.from("profiles").upsert({ id: user.id, name: row.name, handle: null });
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

export function sessionUserFields(user: User) {
  return {
    name: displayNameFromUser(user),
    handle: handleFromUser(user),
    email: user.email ?? null,
  };
}
