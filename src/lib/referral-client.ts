import { supabase } from "./supabase";

export async function referralFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!res.ok) {
    return { error: json.error || "リクエストに失敗しました。", data: null as null };
  }
  return { error: undefined as string | undefined, data: json };
}
