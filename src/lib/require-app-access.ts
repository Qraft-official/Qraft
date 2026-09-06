import { NextResponse } from "next/server";
import { requireAppAccess } from "./release-server";

export async function jsonIfNoAppAccess(request: Request) {
  const { access, error } = await requireAppAccess(request);
  if (!error) return null;
  return NextResponse.json(
    { error, phase: access.phase },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
