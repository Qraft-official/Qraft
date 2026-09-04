import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const memoryStorage = {
  getItem: (_key: string) => null as string | null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }
  if (!supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storage: typeof window === "undefined" ? memoryStorage : window.localStorage,
    },
  });
}

let client: SupabaseClient | undefined;

function getSupabase(): SupabaseClient {
  if (!client) client = createSupabaseClient();
  return client;
}

/** Lazy so missing env vars fail at first use with a clear error, not at import. */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getSupabase();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});
