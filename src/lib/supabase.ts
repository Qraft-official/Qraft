import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://orvfimwduohqojfirhsk.supabase.co";
const supabaseAnonKey = "sb_publishable_Dk7UY_2Vy23WfrhRY11CWQ_061vzuNv";

const memoryStorage = {
  getItem: (_key: string) => null as string | null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
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