import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const memoryStorage = {
  getItem: (_key: string) => null as string | null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storage: typeof window === "undefined" ? memoryStorage : window.localStorage,
    },
  },
);
