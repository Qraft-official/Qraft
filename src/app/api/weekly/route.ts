import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await supabase.rpc("weekly_highlights");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? { qrafter: null, question: null, by_problem: {}, by_author: {} });
}
