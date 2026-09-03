import { supabase } from "./supabase";

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const expMs = session?.expires_at ? session.expires_at * 1000 : 0;
  const fresh = !!session?.access_token && expMs > Date.now() + 30_000;
  if (fresh) return session.access_token;

  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.data.session?.access_token) return refreshed.data.session.access_token;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return "";
  const again = await supabase.auth.getSession();
  return again.data.session?.access_token ?? "";
}

export async function referralFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) {
    return { error: "ログインしてください。", data: null as null };
  }
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!res.ok) {
    return { error: json.error || "リクエストに失敗しました。", data: null as null };
  }
  return { error: undefined as string | undefined, data: json };
}
