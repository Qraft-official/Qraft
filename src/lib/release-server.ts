import { adminSupabase } from "./admin-supabase";
import { bearerTokenFromRequest, userFromRequest } from "./api-auth";
import { createSupabaseRouteClient } from "./supabase-route";
import {
  defaultReleaseSchedule,
  type ReleaseSchedule,
} from "./release-config";
import {
  canAccessApp,
  earlyAccessJoinOpen,
  publicSignupAllowed,
  releasePhaseAt,
  remainingEarlyAccessSlots,
} from "./release-gate";
import { supabaseForAccessToken } from "./supabase-user-client";
import type { ClientAccess } from "./release-client";

export type AccessSnapshot = ClientAccess;

export async function loadReleaseSchedule(): Promise<ReleaseSchedule> {
  const fallback = defaultReleaseSchedule();
  const admin = adminSupabase();
  if (!admin) return fallback;
  const { data, error } = await admin
    .from("release_schedule")
    .select("early_access_start, public_release_at, early_access_cap")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return fallback;
  const start = data.early_access_start ? String(data.early_access_start) : fallback.earlyAccessStart;
  const pub = data.public_release_at ? String(data.public_release_at) : fallback.publicReleaseAt;
  const cap = Number(data.early_access_cap);
  return {
    earlyAccessStart: start,
    publicReleaseAt: pub,
    earlyAccessCap: Number.isFinite(cap) && cap > 0 ? cap : fallback.earlyAccessCap,
  };
}

/**
 * Trusted developer = authenticated Auth user id matched to admin_allowlist in the DB.
 * Never trusts a client-supplied email body. JWT is only used to identify the user.
 */
export async function resolveTrustedDeveloper(
  request: Request,
  user: { id: string } | null,
): Promise<{ isDeveloper: boolean; error: string | null }> {
  if (!user) return { isDeveloper: false, error: null };

  const token = bearerTokenFromRequest(request);
  let userClient = token ? supabaseForAccessToken(token) : null;
  if (!userClient) {
    userClient = await createSupabaseRouteClient();
  }
  let rpcError: string | null = null;

  if (userClient) {
    const { data, error } = await userClient.rpc("is_admin");
    if (error) {
      rpcError = error.message;
    } else if (data === true) {
      return { isDeveloper: true, error: null };
    }
  }

  const admin = adminSupabase();
  if (admin) {
    const { data, error } = await admin.rpc("user_is_trusted_developer", {
      p_user_id: user.id,
    });
    if (error) {
      console.error("[user_is_trusted_developer]", error.message);
      return { isDeveloper: false, error: error.message };
    }
    return { isDeveloper: data === true, error: null };
  }

  if (rpcError) {
    return { isDeveloper: false, error: rpcError };
  }
  return { isDeveloper: false, error: null };
}

export async function userFromCookieSession() {
  const sb = await createSupabaseRouteClient();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export async function isEarlyAccessMember(userId: string) {
  const admin = adminSupabase();
  if (!admin) return false;
  const { data, error } = await admin
    .from("early_access_members")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.user_id);
}

export async function countEarlyAccessMembers() {
  const admin = adminSupabase();
  if (!admin) return 0;
  const { data, error } = await admin.rpc("early_access_seat_count");
  if (!error && typeof data === "number") return data;
  const { count } = await admin
    .from("early_access_members")
    .select("user_id", { count: "exact", head: true });
  return count ?? 0;
}

export async function getAccessSnapshot(request: Request, nowMs = Date.now()): Promise<AccessSnapshot> {
  const schedule = await loadReleaseSchedule();
  const phase = releasePhaseAt(nowMs, schedule);
  const user = (await userFromRequest(request)) ?? (await userFromCookieSession());
  const developerResult = await resolveTrustedDeveloper(request, user);
  const isDeveloper = developerResult.isDeveloper;
  const isMember = user ? await isEarlyAccessMember(user.id) : false;
  const memberCount = await countEarlyAccessMembers();
  const canAccess = canAccessApp({
    phase,
    isDeveloper: developerResult.error ? false : isDeveloper,
    isMember,
  });

  return {
    phase,
    earlyAccessStart: schedule.earlyAccessStart,
    publicReleaseAt: schedule.publicReleaseAt,
    cap: schedule.earlyAccessCap,
    memberCount,
    remaining: remainingEarlyAccessSlots(memberCount, schedule.earlyAccessCap),
    canAccess,
    signupOpen: publicSignupAllowed(phase),
    joinOpen: earlyAccessJoinOpen(phase),
    isAdmin: isDeveloper,
    isDeveloper,
    isMember,
    authenticated: Boolean(user),
    developerCheckError: developerResult.error,
  };
}

export async function requireAppAccess(request: Request) {
  const access = await getAccessSnapshot(request);
  if (access.canAccess) return { access, error: null as string | null };
  const error =
    access.developerCheckError ||
    (access.phase === "prelaunch"
      ? "Qraftは9月12日から30名限定で先行公開します"
      : access.remaining <= 0
        ? "先行公開の30名枠は満員になりました。正式公開は9月19日です。"
        : "先行公開期間は招待コードで参加したメンバーのみ利用できます");
  return { access, error };
}
