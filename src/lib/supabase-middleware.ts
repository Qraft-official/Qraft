import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return { url, anon };
}

export function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  const env = supabaseEnv();
  const bag = { response };
  if (!env) {
    return { supabase: null, getResponse: () => bag.response };
  }
  const supabase = createServerClient(env.url, env.anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        bag.response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          bag.response.cookies.set(name, value, options);
        });
      },
    },
  });
  return { supabase, getResponse: () => bag.response };
}
