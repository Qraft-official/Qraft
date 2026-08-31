import { bearerTokenFromRequest, userFromRequest } from "@/lib/api-auth";
import { isComplimentaryPremiumAccount } from "@/lib/premium";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ premium: false }, { status: 401 });
  }

  let handle =
    typeof user.user_metadata?.handle === "string" ? user.user_metadata.handle : undefined;
  let name =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = bearerTokenFromRequest(request);
  if (url && anon) {
    const sb = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    });
    const { data } = await sb.from("profiles").select("handle, name").eq("id", user.id).maybeSingle();
    if (data?.handle) handle = String(data.handle);
    if (data?.name) name = String(data.name);
  }

  const complimentary = isComplimentaryPremiumAccount({
    id: user.id,
    email: user.email,
    handle,
    name,
  });

  return NextResponse.json({
    premium: complimentary,
    complimentary,
  });
}
