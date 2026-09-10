import { createClient } from "@supabase/supabase-js";

export function bearerTokenFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return "";
  return header.slice(7).trim();
}

export async function userFromRequest(request: Request) {
  const token = bearerTokenFromRequest(request);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  const prefix = `${name}=`;
  for (const part of cookie.split(";")) {
    const row = part.trim();
    if (row.startsWith(prefix)) {
      try {
        return decodeURIComponent(row.slice(prefix.length));
      } catch {
        return row.slice(prefix.length);
      }
    }
  }
  return "";
}

export function deviceIdFromRequest(request: Request, bodyDeviceId?: string) {
  const fromBody = clip(bodyDeviceId, 128).trim();
  if (fromBody.length >= 8) return fromBody;
  const fromCookie = clip(cookieValue(request, "qraft_did"), 128).trim();
  return fromCookie;
}

export function cookieHasReferralApplied(request: Request) {
  return cookieValue(request, "qraft_referral_applied") === "1";
}

export async function requireAdminFromRequest(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return { user: null as null, error: "ログインしてください", status: 401 as const };
  }
  const token = bearerTokenFromRequest(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !token) {
    return { user: null as null, error: "認証できません", status: 401 as const };
  }
  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.rpc("is_admin");
  if (error || data !== true) {
    return { user: null as null, error: "管理者のみ利用できます", status: 403 as const };
  }
  return { user, error: null as null, status: 200 as const };
}
