import { getAccessSnapshot } from "@/lib/release-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await getAccessSnapshot(request);
  return NextResponse.json(access, {
    headers: { "Cache-Control": "no-store" },
  });
}
