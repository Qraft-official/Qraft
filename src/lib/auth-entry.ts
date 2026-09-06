/** Existing Auth UI is `AuthScreen`. There is no `/login` route; this is the dedicated entry. */
export const AUTH_ENTRY_PATH = "/auth";

export function isAuthEntryPath(pathname: string | null | undefined) {
  return pathname === AUTH_ENTRY_PATH;
}
