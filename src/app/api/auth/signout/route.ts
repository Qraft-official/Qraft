import { createSupabaseRouteClient } from "@/lib/supabase-route";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseRouteClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  return NextResponse.json({ ok: true });
}
