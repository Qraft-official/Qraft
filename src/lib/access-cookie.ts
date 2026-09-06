import { createHmac, timingSafeEqual } from "node:crypto";

export const ACCESS_COOKIE_NAME = "qraft_app_access";
const MAX_AGE_SEC = 60 * 60 * 12;

function gateSecret() {
  return (
    process.env.ACCESS_GATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAccessCookieValue(userId: string, nowMs = Date.now()) {
  const secret = gateSecret();
  if (!secret || !userId) return null;
  const exp = Math.floor(nowMs / 1000) + MAX_AGE_SEC;
  const payload = `${userId}:${exp}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function parseAccessCookie(raw: string | undefined | null, nowMs = Date.now()) {
  const secret = gateSecret();
  if (!secret || !raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userId, expRaw] = payload.split(":");
  const exp = Number(expRaw);
  if (!userId || !Number.isFinite(exp) || exp * 1000 <= nowMs) return null;
  return { userId, exp };
}

export function accessCookieHeader(value: string, maxAge = MAX_AGE_SEC) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ACCESS_COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function clearAccessCookieHeader() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ACCESS_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function hasValidAccessCookie(request: Request, nowMs = Date.now()) {
  const cookie = request.headers.get("cookie") || "";
  const prefix = `${ACCESS_COOKIE_NAME}=`;
  for (const part of cookie.split(";")) {
    const row = part.trim();
    if (row.startsWith(prefix)) {
      return Boolean(parseAccessCookie(row.slice(prefix.length), nowMs));
    }
  }
  return false;
}
