/**
 * Server-side developer emails. Do not import from Client Components.
 * Access still requires a real Supabase Auth session whose verified email matches.
 * This list does not grant access by itself (no query params, cookies, or localStorage).
 */
export const TRUSTED_DEVELOPER_EMAILS = [
  "shougay1919@gmail.com",
  "sentaiyi590@gmail.com",
  "qraft.study@gmail.com",
  "njbk1rktdn@sute.jp",
] as const;

export function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export function isTrustedDeveloperEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  return TRUSTED_DEVELOPER_EMAILS.some((row) => row === normalized);
}
