import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const memoryStorage = {
  getItem: (_key: string) => null as string | null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

function requirePublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is not configured`);
  }
  return value.trim();
}

function createSupabaseClient(): SupabaseClient {
  return createClient(requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"), requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
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
