import { bearerTokenFromRequest, userFromRequest } from "./api-auth";
import { adminSupabase } from "./admin-supabase";
import {
  evaluatePremiumAccess,
  isComplimentaryPremiumAccount,
  isDeveloperAccount,
  type PremiumStatusPayload,
} from "./premium";
import { createClient } from "@supabase/supabase-js";

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

export async function resolvePremiumForRequest(request: Request): Promise<{
  userId: string | null;
  payload: PremiumStatusPayload;
}> {
  const user = await userFromRequest(request);
  const empty: PremiumStatusPayload = {
    premium: false,
    complimentary: false,
    subscribed: false,
    developer: false,
    trial: false,
    status: null,
  };
  if (!user) return { userId: null, payload: empty };

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
  }

  const complimentary = isComplimentaryPremiumAccount({
    id: user.id,
    email: user.email,
    handle,
    name,
  });
  const developer =
    isDeveloperAccount(user.id, handle) || (await isAdminUser(request, user.email));
  return {
    userId: user.id,
    payload: evaluatePremiumAccess({
      complimentary,
      developer,
      stripeStatus,
      trialUntil,
    }),
  };
}
