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
  return email.split("@")[0] || "Aha! ユーザー";
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

export function sessionUserFields(user: User) {
  return {
    name: displayNameFromUser(user),
    handle: handleFromUser(user),
    email: user.email ?? null,
  };
}
