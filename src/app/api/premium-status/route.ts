import { bearerTokenFromRequest, userFromRequest } from "@/lib/api-auth";
import { adminSupabase } from "@/lib/admin-supabase";
import { isComplimentaryPremiumAccount, isDeveloperAccount, evaluatePremiumAccess } from "@/lib/premium";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function isAdminUser(request: Request, email?: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = bearerTokenFromRequest(request);
  if (url && anon && token) {
    const sb = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await sb.rpc("is_admin");
    if (data === true) return true;
  }
  const emails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (email && emails.includes(email.toLowerCase())) return true;
  return false;
}

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
  const { requireAppAccess } = await import("@/lib/release-server");
  const gate = await requireAppAccess(request);
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  let handle =
    typeof user.user_metadata?.handle === "string" ? user.user_metadata.handle : undefined;
  let name =
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined;
  let stripeStatus: string | null = null;
  let trialUntil: string | null = null;

  const admin = adminSupabase();
  if (admin) {
    const { data } = await admin
      .from("profiles")
      .select("handle, name, premium_status, premium_trial_until")
      .eq("id", user.id)
      .maybeSingle();
    if (data?.handle) handle = String(data.handle);
    if (data?.name) name = String(data.name);
    if (typeof data?.premium_status === "string") stripeStatus = data.premium_status;
    if (data?.premium_trial_until) trialUntil = String(data.premium_trial_until);
  } else {
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
  }

  const complimentary = isComplimentaryPremiumAccount({
    id: user.id,
    email: user.email,
    handle,
    name,
  });
  const developer =
    isDeveloperAccount(user.id, handle) || (await isAdminUser(request, user.email));

  const payload = evaluatePremiumAccess({
    complimentary,
    developer,
    stripeStatus,
    trialUntil,
  });

  return NextResponse.json(payload);
}
