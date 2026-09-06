import { getAccessSnapshot } from "@/lib/release-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await getAccessSnapshot(request);
    return NextResponse.json(access, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[access]", err);
    const message = err instanceof Error ? err.message : "公開状態の確認に失敗しました";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
