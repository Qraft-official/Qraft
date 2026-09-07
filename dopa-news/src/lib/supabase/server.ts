import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

/**
 * Anonymous server client used for public reads during server rendering.
 * It carries no user session, so it only ever sees rows that RLS exposes
 * to unauthenticated visitors.
 */
export function getServerSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return cached;
}

/**
 * Server client bound to a caller's access token, so RLS evaluates as that
 * user. Used by route handlers that act on behalf of the signed-in user.
 */
export function getSupabaseForToken(accessToken: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
