import {
  type ReleasePhase,
  type ReleaseSchedule,
  scheduleMillis,
} from "./release-config";

export function releasePhaseAt(nowMs: number, schedule: ReleaseSchedule): ReleasePhase {
  const { startMs, publicMs } = scheduleMillis(schedule);
  if (!Number.isFinite(startMs) || !Number.isFinite(publicMs)) return "prelaunch";
  if (nowMs < startMs) return "prelaunch";
  if (nowMs < publicMs) return "early";
  return "public";
}

/** Developer is always first. Never treat authenticated-only as allow. */
export function canAccessApp(input: {
  phase: ReleasePhase;
  isDeveloper: boolean;
  isMember: boolean;
}) {
  if (input.isDeveloper) return true;
  if (input.phase === "public") return true;
  if (input.phase === "early" && input.isMember) return true;
  return false;
}

export function publicSignupAllowed(phase: ReleasePhase) {
  return phase === "public";
}

export function earlyAccessJoinOpen(phase: ReleasePhase) {
  return phase === "early";
}

export type JoinDecision =
  | { ok: true; reason: "enrolled" | "already" | "public" | "developer" }
  | { ok: false; reason: "prelaunch" | "full" | "invalid" | "not_open" };

export function decideEarlyAccessJoin(input: {
  phase: ReleasePhase;
  memberCount: number;
  cap: number;
  alreadyMember: boolean;
  validCode: boolean;
  isTrustedDeveloper?: boolean;
}): JoinDecision {
  if (input.isTrustedDeveloper) return { ok: true, reason: "developer" };
  if (input.phase === "public") return { ok: true, reason: "public" };
  if (input.phase !== "early") return { ok: false, reason: "prelaunch" };
  if (input.alreadyMember) return { ok: true, reason: "already" };
  if (!input.validCode) return { ok: false, reason: "invalid" };
  if (input.memberCount >= input.cap) return { ok: false, reason: "full" };
  return { ok: true, reason: "enrolled" };
}

export function remainingEarlyAccessSlots(memberCount: number, cap: number) {
  return Math.max(0, cap - memberCount);
}

export function isPublicReleasePath(pathname: string) {
  if (pathname === "/terms" || pathname === "/privacy") return true;
  if (pathname === "/early-access" || pathname.startsWith("/early-access/")) return true;
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/p/")) return true;
  if (pathname.startsWith("/u/")) return true;
  if (pathname.startsWith("/i/")) return true;
  if (pathname.startsWith("/api/")) return true;
  return false;
}
