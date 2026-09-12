import { userFromRequest } from "@/lib/api-auth";
import { resolvePremiumForRequest } from "@/lib/premium-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json(
      {
        premium: false,
        complimentary: false,
        subscribed: false,
        developer: false,
        trial: false,
        status: null,
      },
      { status: 401 },
    );
  }
  const { payload } = await resolvePremiumForRequest(request);
  return NextResponse.json(payload);
}
