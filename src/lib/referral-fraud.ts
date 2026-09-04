/** Server-only referral fraud scoring. Do not import from client components. */

import { createHmac } from "crypto";
import { adminSupabase } from "./admin-supabase";
import {
  WELCOME_LOGIN_TARGET,
  WELCOME_POSTS_TARGET,
  WELCOME_SOLVES_TARGET,
} from "./referral";

type ReferralClaimRow = {
  referee_id: string;
  referrer_id: string;
  device_id: string;
  device_fingerprint?: string | null;
  solves: number;
  posts: number;
  login_streak: number;
};

export const REFERRAL_FRAUD_ALLOW_MAX = 39;
export const REFERRAL_FRAUD_HOLD_MAX = 79;

export type ReferralFraudDecision = "allow" | "hold" | "reject";

export type ReferralRiskResult = {
  score: number;
  decision: ReferralFraudDecision;
  reasons: string[];
};

export type ReferralRiskSignals = {
  sameDeviceIdOtherClaim: boolean;
  sameDeviceIdOtherUserEvents: boolean;
  deviceUsedByReferrer: boolean;
  sameFingerprintOtherClaim: boolean;
  sameStripeCustomerOtherProfile: boolean;
  sameNetworkOtherClaim: boolean;
  networkAccounts24h: number;
  referrerAppliesLastHour: number;
  minMissionOnly: boolean;
  lowOrganicUse: boolean;
  concentratedHours: boolean;
  siblingCompletionsClose: number;
};

export function decisionFromRiskScore(score: number): ReferralFraudDecision {
  if (score >= REFERRAL_FRAUD_HOLD_MAX + 1) return "reject";
  if (score >= REFERRAL_FRAUD_ALLOW_MAX + 1) return "hold";
  return "allow";
}

export function calculateReferralRisk(signals: ReferralRiskSignals): ReferralRiskResult {
  let score = 0;
  const reasons: string[] = [];

  if (signals.sameDeviceIdOtherClaim) {
    score += 100;
    reasons.push("duplicate_device_id");
  }
  if (signals.deviceUsedByReferrer) {
    score += 90;
    reasons.push("same_device_as_referrer");
  } else if (signals.sameDeviceIdOtherUserEvents) {
    score += 70;
    reasons.push("same_device_other_account");
  }
  if (signals.sameFingerprintOtherClaim) {
    score += 80;
    reasons.push("duplicate_device_fingerprint");
  }
  if (signals.sameStripeCustomerOtherProfile) {
    score += 80;
    reasons.push("shared_stripe_customer");
  }
  if (signals.sameNetworkOtherClaim) {
    score += 5;
    reasons.push("shared_network");
  }
  if (signals.networkAccounts24h >= 5) {
    score += 40;
    reasons.push("network_burst_high");
  } else if (signals.networkAccounts24h >= 3) {
    score += 20;
    reasons.push("network_burst");
  }
  if (signals.referrerAppliesLastHour >= 10) {
    score += 40;
    reasons.push("referrer_velocity_high");
  } else if (signals.referrerAppliesLastHour >= 5) {
    score += 25;
    reasons.push("referrer_velocity");
  } else if (signals.referrerAppliesLastHour >= 3) {
    score += 10;
    reasons.push("referrer_velocity_mild");
  }
  if (signals.minMissionOnly) {
    score += 15;
    reasons.push("min_mission_only");
  }
  if (signals.lowOrganicUse) {
    score += 10;
    reasons.push("low_organic_use");
  }
  if (signals.concentratedHours) {
    score += 15;
    reasons.push("concentrated_hours");
  }
  if (signals.siblingCompletionsClose >= 2) {
    score += 20;
    reasons.push("sibling_completion_cluster");
  }

  score = Math.min(100, score);
  return { score, decision: decisionFromRiskScore(score), reasons };
}

export function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim() ?? "";
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "";
}

export function hashNetworkKey(ip: string, secret: string) {
  const value = ip.trim();
  if (!value || !secret.trim()) return null;
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function referralFraudSecret() {
  return (process.env.REFERRAL_FRAUD_SECRET ?? "").trim();
}

export async function gatherReferralRiskSignals(input: {
  row: ReferralClaimRow;
  networkHash: string | null;
}): Promise<ReferralRiskSignals> {
  const admin = adminSupabase();
  if (!admin) throw new Error("admin client unavailable");
  const row = input.row;
  const since24h = new Date(Date.now() - 24 * 3600000).toISOString();
  const since1h = new Date(Date.now() - 3600000).toISOString();
  const closeStart = new Date(Date.now() - 3600000).toISOString();

  const [
    otherDeviceClaims,
    otherFpClaims,
    campaignDeviceRows,
    referrerApplies,
    siblingCompleted,
    activityRows,
    problemRows,
    refereeProfile,
  ] = await Promise.all([
    admin
      .from("referral_claims")
      .select("referee_id")
      .eq("device_id", row.device_id)
      .neq("referee_id", row.referee_id),
    row.device_fingerprint
      ? admin
          .from("referral_claims")
          .select("referee_id")
          .eq("device_fingerprint", row.device_fingerprint)
          .neq("referee_id", row.referee_id)
      : Promise.resolve({ data: [] as { referee_id: string }[], error: null }),
    admin.from("campaign_events").select("user_id, referrer_id").eq("device_id", row.device_id),
    admin
      .from("referral_claims")
      .select("referee_id")
      .eq("referrer_id", row.referrer_id)
      .gte("applied_at", since1h),
    admin
      .from("referral_claims")
      .select("referee_id, completed_at")
      .eq("referrer_id", row.referrer_id)
      .neq("referee_id", row.referee_id)
      .not("completed_at", "is", null)
      .gte("completed_at", closeStart),
    admin
      .from("referral_activity_events")
      .select("event_type, created_at")
      .eq("referee_id", row.referee_id),
    admin.from("problems").select("id").eq("author_id", row.referee_id),
    admin.from("profiles").select("stripe_customer_id").eq("id", row.referee_id).maybeSingle(),
  ]);

  if (otherDeviceClaims.error) throw new Error(otherDeviceClaims.error.message);
  if (otherFpClaims.error) throw new Error(otherFpClaims.error.message);
  if (campaignDeviceRows.error) throw new Error(campaignDeviceRows.error.message);
  if (referrerApplies.error) throw new Error(referrerApplies.error.message);
  if (siblingCompleted.error) throw new Error(siblingCompleted.error.message);
  if (activityRows.error) throw new Error(activityRows.error.message);
  if (problemRows.error) throw new Error(problemRows.error.message);
  if (refereeProfile.error) throw new Error(refereeProfile.error.message);

  const otherUserIds = new Set(
    (campaignDeviceRows.data ?? [])
      .map((r) => (r.user_id ? String(r.user_id) : ""))
      .filter((id) => id && id !== row.referee_id),
  );
  const deviceUsedByReferrer = otherUserIds.has(row.referrer_id);

  let sameNetworkOtherClaim = false;
  let networkAccounts24h = 0;
  if (input.networkHash) {
    const [{ data: netClaims, error: netClaimErr }, { data: netUsers, error: netUserErr }] =
      await Promise.all([
        admin
          .from("referral_claims")
          .select("referee_id")
          .eq("network_hash", input.networkHash)
          .neq("referee_id", row.referee_id),
        admin
          .from("referral_network_sightings")
          .select("user_id")
          .eq("network_hash", input.networkHash)
          .gte("created_at", since24h),
      ]);
    if (netClaimErr) throw new Error(netClaimErr.message);
    if (netUserErr) throw new Error(netUserErr.message);
    sameNetworkOtherClaim = (netClaims ?? []).length > 0;
    networkAccounts24h = new Set((netUsers ?? []).map((r) => String(r.user_id))).size;
  }

  const stripeCustomer = refereeProfile.data?.stripe_customer_id
    ? String(refereeProfile.data.stripe_customer_id)
    : "";
  let sameStripeCustomerOtherProfile = false;
  if (stripeCustomer) {
    const { data: twins, error } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", stripeCustomer)
      .neq("id", row.referee_id);
    if (error) throw new Error(error.message);
    sameStripeCustomerOtherProfile = (twins ?? []).length > 0;
  }

  const minMissionOnly =
    row.solves === WELCOME_SOLVES_TARGET &&
    row.posts === WELCOME_POSTS_TARGET &&
    row.login_streak === WELCOME_LOGIN_TARGET;
  const problemCount = (problemRows.data ?? []).length;
  const lowOrganicUse = minMissionOnly && problemCount <= WELCOME_POSTS_TARGET;

  const hours = (activityRows.data ?? []).map((r) => {
    const t = new Date(String(r.created_at));
    return Number.isFinite(t.getTime()) ? t.getUTCHours() : -1;
  }).filter((h) => h >= 0);
  let concentratedHours = false;
  if (hours.length >= 3) {
    const counts = new Map<number, number>();
    for (const h of hours) counts.set(h, (counts.get(h) ?? 0) + 1);
    const top = Math.max(...counts.values());
    concentratedHours = top / hours.length >= 0.8 && minMissionOnly;
  }

  return {
    sameDeviceIdOtherClaim: (otherDeviceClaims.data ?? []).length > 0,
    sameDeviceIdOtherUserEvents: otherUserIds.size > 0,
    deviceUsedByReferrer,
    sameFingerprintOtherClaim: (otherFpClaims.data ?? []).length > 0,
    sameStripeCustomerOtherProfile,
    sameNetworkOtherClaim,
    networkAccounts24h,
    referrerAppliesLastHour: (referrerApplies.data ?? []).length,
    minMissionOnly,
    lowOrganicUse,
    concentratedHours,
    siblingCompletionsClose: (siblingCompleted.data ?? []).length,
  };
}

export async function recordNetworkSighting(userId: string, networkHash: string | null) {
  if (!networkHash) return;
  const admin = adminSupabase();
  if (!admin) return;
  const { error } = await admin.from("referral_network_sightings").insert({
    user_id: userId,
    network_hash: networkHash,
  });
  if (error && !/duplicate|unique/i.test(error.message)) {
    throw new Error(error.message);
  }
}

export async function recordReferralActivityEvent(
  refereeId: string,
  eventType: "login" | "solve" | "post",
) {
  const admin = adminSupabase();
  if (!admin) return;
  const { error } = await admin.from("referral_activity_events").insert({
    referee_id: refereeId,
    event_type: eventType,
  });
  if (error) throw new Error(error.message);
}
