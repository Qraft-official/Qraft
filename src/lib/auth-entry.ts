export const AUTH_ENTRY_PATHS = ["/auth", "/login", "/signup"] as const;

export function isAuthEntryPath(path: string | null | undefined) {
  if (!path) return false;
  const normalized = path.replace(/\/+$/, "") || "/";
  return AUTH_ENTRY_PATHS.some((p) => normalized === p);
}

export function isPublicReleasePath(path: string) {
  if (isAuthEntryPath(path)) return true;
  if (path.startsWith("/auth/callback")) return true;
  if (path === "/terms" || path === "/privacy") return true;
  if (path.startsWith("/i/")) return true;
  if (path.startsWith("/early-access")) return true;
  return false;
}

export function isPublicApiPath(path: string) {
  if (path === "/api/access" || path.startsWith("/api/access/")) return true;
  if (path === "/api/early-access/join") return true;
  if (path === "/api/stripe/webhook") return true;
  return false;
}
