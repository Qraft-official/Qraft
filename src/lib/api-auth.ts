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

export function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0]?.trim();
  if (first) return first.slice(0, 64);
  const real = request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "";
  return real.trim().slice(0, 64) || "unknown";
}

export function cookieHasReferralApplied(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return /(?:^|;\s*)qraft_referral_applied=1(?:;|$)/.test(cookie);
}
