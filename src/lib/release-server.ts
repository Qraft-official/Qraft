import { adminSupabase } from "./admin-supabase";
import { bearerTokenFromRequest, userFromRequest } from "./api-auth";
import { createClient } from "@supabase/supabase-js";
import {
  clampReleaseSchedule,
  defaultReleaseSchedule,
  type ReleaseSchedule,
} from "./release-config";
import {
  earlyAccessJoinOpen,
  publicSignupAllowed,
  releasePhaseAt,
  remainingEarlyAccessSlots,
} from "./release-gate";

export type AccessSnapshot = {
  phase: "prelaunch" | "early" | "public";
  earlyAccessStart: string;
  publicReleaseAt: string;
  cap: number;
  memberCount: number;
  remaining: number;
  canAccess: boolean;
  signupOpen: boolean;
  joinOpen: boolean;
  isAdmin: boolean;
  isMember: boolean;
};

function blocked(schedule: ReleaseSchedule, phase: AccessSnapshot["phase"], extra?: Partial<AccessSnapshot>): AccessSnapshot {
  const memberCount = extra?.memberCount ?? schedule.earlyAccessCap;
  const remaining = extra?.remaining ?? 0;
  return {
    phase,
    earlyAccessStart: schedule.earlyAccessStart,
    publicReleaseAt: schedule.publicReleaseAt,
    cap: schedule.earlyAccessCap,
    memberCount,
    remaining,
    canAccess: false,
    signupOpen: publicSignupAllowed(phase),
    joinOpen: earlyAccessJoinOpen(phase),
    isAdmin: extra?.isAdmin ?? false,
    isMember: extra?.isMember ?? false,
  };
}

export async function loadReleaseSchedule(): Promise<ReleaseSchedule> {
  const fallback = defaultReleaseSchedule();
  const admin = adminSupabase();
  if (!admin) return fallback;
  try {
    const { data, error } = await admin
      .from("release_schedule")
      .select("early_access_start, public_release_at, early_access_cap")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) return fallback;
    return clampReleaseSchedule({
      earlyAccessStart: data.early_access_start ? String(data.early_access_start) : fallback.earlyAccessStart,
      publicReleaseAt: data.public_release_at ? String(data.public_release_at) : fallback.publicReleaseAt,
      earlyAccessCap: Number(data.early_access_cap),
    });
  } catch (err) {
    console.error("[loadReleaseSchedule]", err);
    return fallback;
  }
}

async function rpcTrue(
  request: Request,
  fn: "is_admin" | "user_is_trusted_developer",
  args?: Record<string, unknown>,
): Promise<boolean | "error"> {
  const token = bearerTokenFromRequest(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return false;
  try {
    const sb = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await sb.rpc(fn, args ?? {});
    if (error) {
      console.error(`[${fn}]`, error.message);
      return "error";
    }
    return data === true;
  } catch (err) {
    console.error(`[${fn}]`, err);
    return "error";
  }
}

export async function isAdminRequest(request: Request): Promise<boolean> {
  const user = await userFromRequest(request);
  if (!user) return false;

  const adminRpc = await rpcTrue(request, "is_admin");
  if (adminRpc === true) return true;

  const trustedRpc = await rpcTrue(request, "user_is_trusted_developer", { p_user_id: user.id });
  if (trustedRpc === true) return true;

  const admin = adminSupabase();
  if (!admin) return false;
  try {
    const { data, error } = await admin.rpc("user_is_trusted_developer", { p_user_id: user.id });
    if (error) {
      console.error("[user_is_trusted_developer admin]", error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.error("[user_is_trusted_developer admin]", err);
    return false;
  }
}

export async function isEarlyAccessMember(userId: string): Promise<boolean | "error"> {
  const admin = adminSupabase();
  if (!admin) return "error";
  try {
    const { data, error } = await admin
      .from("early_access_members")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[early_access_members]", error.message);
      return "error";
    }
    return Boolean(data?.user_id);
  } catch (err) {
    console.error("[early_access_members]", err);
    return "error";
  }
}

export async function countEarlyAccessMembers(): Promise<number | "error"> {
  const admin = adminSupabase();
  if (!admin) return "error";
  try {
    const rpc = await admin.rpc("early_access_seat_count");
    if (!rpc.error && typeof rpc.data === "number") return rpc.data;
    const { count, error } = await admin
      .from("early_access_members")
      .select("user_id", { count: "exact", head: true });
    if (error) {
      console.error("[countEarlyAccessMembers]", error.message);
      return "error";
    }
    return count ?? "error";
  } catch (err) {
    console.error("[countEarlyAccessMembers]", err);
    return "error";
  }
}

export async function getAccessSnapshot(request: Request, nowMs = Date.now()): Promise<AccessSnapshot> {
  const schedule = await loadReleaseSchedule();
  const phase = releasePhaseAt(nowMs, schedule);
  const user = await userFromRequest(request).catch((err) => {
    console.error("[getAccessSnapshot user]", err);
    return null;
  });

  if (phase === "public") {
    const memberCount = await countEarlyAccessMembers();
    const count = memberCount === "error" ? 0 : memberCount;
    return {
      phase,
      earlyAccessStart: schedule.earlyAccessStart,
      publicReleaseAt: schedule.publicReleaseAt,
      cap: schedule.earlyAccessCap,
      memberCount: count,
      remaining: remainingEarlyAccessSlots(count, schedule.earlyAccessCap),
      canAccess: true,
      signupOpen: true,
      joinOpen: false,
      isAdmin: user ? await isAdminRequest(request) : false,
      isMember: user ? (await isEarlyAccessMember(user.id)) === true : false,
    };
  }

  if (!user) {
    return blocked(schedule, phase, {
      memberCount: 0,
      remaining: remainingEarlyAccessSlots(0, schedule.earlyAccessCap),
    });
  }

  const isAdmin = await isAdminRequest(request);
  if (isAdmin) {
    const memberCount = await countEarlyAccessMembers();
    const count = memberCount === "error" ? schedule.earlyAccessCap : memberCount;
    return {
      phase,
      earlyAccessStart: schedule.earlyAccessStart,
      publicReleaseAt: schedule.publicReleaseAt,
      cap: schedule.earlyAccessCap,
      memberCount: count,
      remaining: remainingEarlyAccessSlots(count, schedule.earlyAccessCap),
      canAccess: true,
      signupOpen: publicSignupAllowed(phase),
      joinOpen: earlyAccessJoinOpen(phase),
      isAdmin: true,
      isMember: false,
    };
  }

  if (phase !== "early") {
    return blocked(schedule, phase);
  }

  const member = await isEarlyAccessMember(user.id);
  if (member === "error") {
    return blocked(schedule, phase);
  }
  const memberCount = await countEarlyAccessMembers();
  const count = memberCount === "error" ? schedule.earlyAccessCap : memberCount;
  return {
    phase,
    earlyAccessStart: schedule.earlyAccessStart,
    publicReleaseAt: schedule.publicReleaseAt,
    cap: schedule.earlyAccessCap,
    memberCount: count,
    remaining: remainingEarlyAccessSlots(count, schedule.earlyAccessCap),
    canAccess: member === true,
    signupOpen: false,
    joinOpen: true,
    isAdmin: false,
    isMember: member === true,
  };
}

export async function requireAppAccess(request: Request) {
  const access = await getAccessSnapshot(request);
  if (access.canAccess) return { access, error: null as string | null };
  const error =
    access.phase === "prelaunch"
      ? "Qraftは9月12日から30名限定で先行公開します"
      : access.remaining <= 0
        ? "先行公開の30名枠は満員になりました。正式公開は9月19日です。"
        : "先行公開期間は招待コードで参加したメンバーのみ利用できます";
  return { access, error };
}
