import { createSupabaseRouteClient } from "@/lib/supabase-route";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
  } | null;
  const access_token = body?.access_token?.trim() ?? "";
  const refresh_token = body?.refresh_token?.trim() ?? "";
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "session tokens required" }, { status: 400 });
  }

  const supabase = await createSupabaseRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "auth is not configured" }, { status: 500 });
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return NextResponse.json(
      { error: userError?.message || "session was not established" },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true, userId: data.user.id });
}
