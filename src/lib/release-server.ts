import { adminSupabase } from "./admin-supabase";
import { userFromRequest, bearerTokenFromRequest } from "./api-auth";
import { createClient } from "@supabase/supabase-js";
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

export async function isAdminRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = bearerTokenFromRequest(request);
  if (!url || !anon || !token) return false;
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await sb.rpc("is_admin");
  return data === true;
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
  const user = await userFromRequest(request);
  const isAdmin = user ? await isAdminRequest(request) : false;
  const isMember = user ? await isEarlyAccessMember(user.id) : false;
  const memberCount = await countEarlyAccessMembers();
  const canAccess = canAccessApp({ phase, isAdmin, isMember });
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
    isAdmin,
    isMember,
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
