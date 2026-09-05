import { adminSupabase } from "./admin-supabase";
import {
  PREMIUM_REFERRAL_HALF_JPY,
  REFERRAL_APPLY_HOURS,
  REFERRAL_TRIAL_HOURS,
  WELCOME_LOGIN_TARGET,
  WELCOME_MISSION_HOURS,
  WELCOME_POSTS_TARGET,
  WELCOME_SOLVES_TARGET,
  type ReferralClaimStatus,
  type ReferralClaimView,
  type ReferralMe,
} from "./referral";
import {
  calculateReferralRisk,
  gatherReferralRiskSignals,
  hashNetworkKey,
  recordNetworkSighting,
  recordReferralActivityEvent,
  referralFraudSecret,
} from "./referral-fraud";
import { loadCampaignFields, evaluateCluster } from "./campaign-server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export type ReferralClaimRow = {
  referee_id: string;
  referrer_id: string;
  device_id: string;
  device_fingerprint?: string | null;
  applied_at: string;
  mission_deadline: string;
  trial_until: string;
  solves: number;
  posts: number;
  login_streak: number;
  last_login_date: string | null;
  completed_at: string | null;
  expired_at: string | null;
  discount_awarded_at: string | null;
  status?: ReferralClaimStatus | null;
  network_hash?: string | null;
};

function tokyoDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

function yesterdayTokyo() {
  const [y, m, d] = tokyoDate().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

function asClaimView(row: ReferralClaimRow): ReferralClaimView {
  return {
    referrerId: row.referrer_id,
    appliedAt: row.applied_at,
    missionDeadline: row.mission_deadline,
    trialUntil: row.trial_until,
    solves: row.solves,
    posts: row.posts,
    loginStreak: row.login_streak,
    completedAt: row.completed_at,
    expiredAt: row.expired_at,
    discountAwardedAt: row.discount_awarded_at,
    status: (row.status as ReferralClaimStatus | null) || (row.discount_awarded_at ? "rewarded" : "pending"),
  };
}

async function profileIsSample(admin: NonNullable<ReturnType<typeof adminSupabase>>, userId: string) {
  const { data, error } = await admin.from("profiles").select("is_sample").eq("id", userId).maybeSingle();
  if (error) return false;
  return Boolean((data as { is_sample?: boolean } | null)?.is_sample);
}

export async function ensureReferralCode(userId: string) {
  const admin = adminSupabase();
  if (!admin) return "";
  if (await profileIsSample(admin, userId)) return "";
  const { data } = await admin.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
  if (data?.referral_code) return String(data.referral_code);
  const { data: rpc } = await admin.rpc("random_referral_code");
  const code = typeof rpc === "string" && rpc ? rpc : Math.random().toString(36).slice(2, 10).toUpperCase();
  await admin.from("profiles").update({ referral_code: code }).eq("id", userId);
  return code;
}

export async function getReferralMe(userId: string): Promise<ReferralMe | null> {
  const admin = adminSupabase();
  if (!admin) return null;
  const code = await ensureReferralCode(userId);
  const { data: profile } = await admin
    .from("profiles")
    .select("premium_trial_until, stripe_referral_coupon_id, created_at")
    .eq("id", userId)
    .maybeSingle();
  const { data: claim } = await admin
    .from("referral_claims")
    .select("*")
    .eq("referee_id", userId)
    .maybeSingle();
  const campaign = await loadCampaignFields(userId);
  return {
    code,
    trialUntil: profile?.premium_trial_until ? String(profile.premium_trial_until) : null,
    pendingDiscount: Boolean(profile?.stripe_referral_coupon_id) || campaign.isHalfDiscountEligible,
    claim: claim ? asClaimView(claim as ReferralClaimRow) : null,
    accountCreatedAt: profile?.created_at ? String(profile.created_at) : null,
    ...campaign,
  };
}

export async function getReferralMeWithToken(userId: string, accessToken: string): Promise<ReferralMe | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !accessToken) return getReferralMe(userId);
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("referral_code, premium_trial_until, stripe_referral_coupon_id, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return getReferralMe(userId);
  let code = profile?.referral_code ? String(profile.referral_code) : "";
  if (!code) {
    const { data: rpc } = await sb.rpc("random_referral_code");
    code = typeof rpc === "string" && rpc ? rpc : Math.random().toString(36).slice(2, 10).toUpperCase();
    await sb.from("profiles").update({ referral_code: code }).eq("id", userId);
  }
  const { data: claim } = await sb.from("referral_claims").select("*").eq("referee_id", userId).maybeSingle();
  const campaign = await loadCampaignFields(userId);
  return {
    code,
    trialUntil: profile?.premium_trial_until ? String(profile.premium_trial_until) : null,
    pendingDiscount: Boolean(profile?.stripe_referral_coupon_id) || campaign.isHalfDiscountEligible,
    claim: claim ? asClaimView(claim as ReferralClaimRow) : null,
    accountCreatedAt: profile?.created_at ? String(profile.created_at) : null,
    ...campaign,
  };
}

function normalizeDeviceToken(raw: string) {
  return raw.trim().slice(0, 128);
}

function duplicateApplyError(message: string) {
  if (/referral_claims_pkey|referee_id/i.test(message)) {
    return "紹介コードはすでに適用済みです。";
  }
  if (/device_id|device_fingerprint|duplicate|unique/i.test(message)) {
    return "この端末では既に紹介コードが適用されています";
  }
  return "";
}

export async function applyReferralCode(input: {
  refereeId: string;
  code: string;
  deviceId: string;
  deviceFingerprint?: string;
  cookieApplied?: boolean;
  networkHash?: string | null;
}): Promise<{ error?: string; me?: ReferralMe }> {
  const admin = adminSupabase();
  if (!admin) return { error: "紹介プログラムの設定がありません。" };
  const code = input.code.trim().toUpperCase();
  const deviceId = normalizeDeviceToken(input.deviceId);
  const deviceFingerprint = normalizeDeviceToken(input.deviceFingerprint ?? "");
  if (!code) return { error: "紹介コードを入力してください。" };
  if (deviceId.length < 8) return { error: "端末情報を確認できませんでした。別のブラウザでお試しください。" };
  if (input.cookieApplied) {
    return { error: "この端末では既に紹介コードが適用されています" };
  }

  const { data: existing } = await admin
    .from("referral_claims")
    .select("referee_id")
    .eq("referee_id", input.refereeId)
    .maybeSingle();
  if (existing) return { error: "紹介コードはすでに適用済みです。" };

  const { data: deviceHit } = await admin
    .from("referral_claims")
    .select("referee_id")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (deviceHit) {
    return { error: "この端末では既に紹介コードが適用されています" };
  }

  if (deviceFingerprint.length >= 16) {
    const { data: fpHit } = await admin
      .from("referral_claims")
      .select("referee_id")
      .eq("device_fingerprint", deviceFingerprint)
      .maybeSingle();
    if (fpHit) {
      return { error: "この端末では既に紹介コードが適用されています" };
    }
  }

  const { data: self } = await admin
    .from("profiles")
    .select("created_at, referral_code")
    .eq("id", input.refereeId)
    .maybeSingle();
  if (self?.referral_code && String(self.referral_code).trim().toUpperCase() === code) {
    return { error: "自分の紹介コードは使えません。" };
  }
  let createdRaw = self?.created_at ? String(self.created_at) : "";
  if (!createdRaw) {
    const { data: authUser } = await admin.auth.admin.getUserById(input.refereeId);
    createdRaw = authUser.user?.created_at ? String(authUser.user.created_at) : "";
  }
  const createdAt = createdRaw ? new Date(createdRaw).getTime() : NaN;
  if (!Number.isFinite(createdAt) || Date.now() - createdAt >= REFERRAL_APPLY_HOURS * 3600000) {
    return { error: "紹介コードの入力期限（登録から7日以内）を過ぎています。" };
  }

  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .ilike("referral_code", code)
    .maybeSingle();
  if (!referrer?.id) return { error: "紹介コードが見つかりません。" };
  if (referrer.id === input.refereeId) return { error: "自分の紹介コードは使えません。" };
  if ((await profileIsSample(admin, referrer.id)) || (await profileIsSample(admin, input.refereeId))) {
    return { error: "この紹介コードは利用できません。" };
  }

  const now = new Date();
  const trialUntil = new Date(now.getTime() + REFERRAL_TRIAL_HOURS * 3600000).toISOString();
  const missionDeadline = new Date(now.getTime() + WELCOME_MISSION_HOURS * 3600000).toISOString();

  const { error } = await admin.from("referral_claims").insert({
    referee_id: input.refereeId,
    referrer_id: referrer.id,
    device_id: deviceId,
    device_fingerprint: deviceFingerprint.length >= 16 ? deviceFingerprint : null,
    applied_at: now.toISOString(),
    mission_deadline: missionDeadline,
    trial_until: trialUntil,
    last_login_date: tokyoDate(),
    login_streak: 1,
    status: "pending",
    network_hash: input.networkHash || null,
  });
  if (error) {
    const dup = duplicateApplyError(error.message);
    if (dup) return { error: dup };
    if (/referral_claims_no_self|no_self/i.test(error.message)) {
      return { error: "自分の紹介コードは使えません。" };
    }
    return { error: error.message };
  }

  await admin.from("profiles").update({ premium_trial_until: trialUntil }).eq("id", input.refereeId);
  await admin.from("notifications").insert({
    user_id: input.refereeId,
    title: "🎁 Welcome Mission が始まりました",
    message: "紹介コードが適用されました。3日間プレミアム体験中です。4日以内に Welcome Mission を達成しましょう！",
  });

  if (input.networkHash) {
    try {
      await recordNetworkSighting(input.refereeId, input.networkHash);
    } catch {
      /* apply already succeeded; sighting is best-effort */
    }
  }

  void evaluateCluster(referrer.id);

  const me = await getReferralMe(input.refereeId);
  return { me: me ?? undefined };
}

async function awardReferrerDiscount(referrerId: string, refereeId: string) {
  const admin = adminSupabase();
  if (!admin) return;
  if (await profileIsSample(admin, referrerId) || await profileIsSample(admin, refereeId)) return;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    await admin.from("profiles").update({ stripe_referral_coupon_id: "pending-local" }).eq("id", referrerId);
    return;
  }
  const stripe = new Stripe(secret);
  const coupon = await stripe.coupons.create({
    amount_off: PREMIUM_REFERRAL_HALF_JPY,
    currency: "jpy",
    duration: "once",
    name: "紹介特典 1か月半額",
    metadata: { referrer_id: referrerId, referee_id: refereeId },
  });
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, stripe_referral_coupon_id")
    .eq("id", referrerId)
    .maybeSingle();
  await admin.from("profiles").update({ stripe_referral_coupon_id: coupon.id }).eq("id", referrerId);

  const customerId = profile?.stripe_customer_id;
  if (customerId) {
    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      const sub = subs.data[0];
      if (sub) {
        await stripe.subscriptions.update(sub.id, { discounts: [{ coupon: coupon.id }] });
      }
    } catch (err) {
      console.warn("failed to attach referral coupon to subscription:", err);
    }
  }

  await admin.from("notifications").insert({
    user_id: referrerId,
    title: "🎉 紹介特典が届きました",
    message: "友達が Welcome Mission を達成しました。プレミアムプランが1か月半額（￥200）になります。次回の購入時または次回の更新時に適用されます。",
  });
}

async function holdReferralClaim(
  refereeId: string,
  networkHash: string | null,
  reasons: string[],
  score = 50,
) {
  const admin = adminSupabase();
  if (!admin) return;
  await admin.rpc("try_finalize_referral_claim", {
    p_referee_id: refereeId,
    p_status: "held",
    p_risk_score: score,
    p_risk_reasons: reasons,
    p_network_hash: networkHash,
  });
}

async function finalizeCompletedReferral(row: ReferralClaimRow, networkHash: string | null) {
  const admin = adminSupabase();
  if (!admin) {
    return;
  }
  if (row.discount_awarded_at || row.status === "rewarded") return;
  if (row.status === "held" || row.status === "rejected") return;
  if (!row.completed_at) return;

  const secret = referralFraudSecret();
  if (!secret) {
    await holdReferralClaim(row.referee_id, networkHash, ["fraud_secret_missing"], 50);
    return;
  }

  let result;
  try {
    const signals = await gatherReferralRiskSignals({ row, networkHash });
    result = calculateReferralRisk(signals);
  } catch {
    await holdReferralClaim(row.referee_id, networkHash, ["fraud_check_error"], 50);
    return;
  }

  const status =
    result.decision === "allow" ? "rewarded" : result.decision === "reject" ? "rejected" : "held";

  const { data: claimed, error } = await admin.rpc("try_finalize_referral_claim", {
    p_referee_id: row.referee_id,
    p_status: status,
    p_risk_score: result.score,
    p_risk_reasons: result.reasons,
    p_network_hash: networkHash,
  });

  if (error) {
    await holdReferralClaim(row.referee_id, networkHash, ["fraud_finalize_error"], 50);
    return;
  }
  if (status !== "rewarded") return;
  if (claimed !== true && claimed !== "t") return;

  await awardReferrerDiscount(row.referrer_id, row.referee_id);
  await admin.from("notifications").insert({
    user_id: row.referee_id,
    title: "✅ Welcome Mission 達成",
    message: "3つのミッションを4日以内に達成しました。紹介者に半額特典が届きます。",
  });
}

export async function recordReferralEvent(
  userId: string,
  type: "login" | "solve" | "post",
  networkHash?: string | null,
): Promise<{ me?: ReferralMe; error?: string }> {
  const admin = adminSupabase();
  if (!admin) return {};
  const { data } = await admin.from("referral_claims").select("*").eq("referee_id", userId).maybeSingle();
  if (!data) return { me: (await getReferralMe(userId)) ?? undefined };
  const existing = data as ReferralClaimRow;

  if (networkHash) {
    try {
      await recordNetworkSighting(userId, networkHash);
    } catch {
      /* ignore sighting write; fraud will fail closed if needed later */
    }
  }

  try {
    await recordReferralActivityEvent(userId, type);
  } catch {
    /* activity log is additive; mission counters are source of truth */
  }

  if (existing.discount_awarded_at || existing.status === "rewarded") {
    return { me: (await getReferralMe(userId)) ?? undefined };
  }
  if (existing.status === "held" || existing.status === "rejected") {
    return { me: (await getReferralMe(userId)) ?? undefined };
  }

  if (existing.completed_at && existing.status === "pending") {
    await finalizeCompletedReferral(existing, networkHash ?? existing.network_hash ?? null);
    return { me: (await getReferralMe(userId)) ?? undefined };
  }

  const { data: rpcRow, error: rpcError } = await admin.rpc("apply_referral_mission_event", {
    p_referee_id: userId,
    p_event_type: type,
  });

  let row: ReferralClaimRow | null = null;
  if (!rpcError && rpcRow) {
    row = rpcRow as ReferralClaimRow;
  } else if (rpcError && /could not find|does not exist|schema cache/i.test(rpcError.message)) {
    const now = new Date();
    const deadline = new Date(existing.mission_deadline).getTime();
    const expired = now.getTime() > deadline;
    if (expired && !existing.expired_at) {
      await admin.from("referral_claims").update({ expired_at: now.toISOString() }).eq("referee_id", userId);
      return { me: (await getReferralMe(userId)) ?? undefined };
    }
    if (expired) return { me: (await getReferralMe(userId)) ?? undefined };

    const patch: Partial<ReferralClaimRow> = {};
    if (type === "solve") patch.solves = existing.solves + 1;
    if (type === "post") patch.posts = existing.posts + 1;
    if (type === "login") {
      const today = tokyoDate();
      if (existing.last_login_date !== today) {
        const yday = yesterdayTokyo();
        patch.login_streak = existing.last_login_date === yday ? existing.login_streak + 1 : 1;
        patch.last_login_date = today;
      }
    }
    if (Object.keys(patch).length) {
      await admin.from("referral_claims").update(patch).eq("referee_id", userId);
    }
    row = { ...existing, ...patch };
  } else {
    return { me: (await getReferralMe(userId)) ?? undefined };
  }

  if (!row || row.expired_at) {
    return { me: (await getReferralMe(userId)) ?? undefined };
  }

  const missionMet =
    row.solves >= WELCOME_SOLVES_TARGET &&
    row.posts >= WELCOME_POSTS_TARGET &&
    row.login_streak >= WELCOME_LOGIN_TARGET;

  if (!missionMet) {
    return { me: (await getReferralMe(userId)) ?? undefined };
  }

  const { data: completed, error: completeError } = await admin.rpc("try_complete_referral_mission", {
    p_referee_id: userId,
  });
  if (completeError) {
    await holdReferralClaim(userId, networkHash ?? row.network_hash ?? null, ["complete_rpc_error"]);
    return { me: (await getReferralMe(userId)) ?? undefined };
  }
  const completedRow = (completed as ReferralClaimRow | null) ?? row;
  if (!completedRow.completed_at) {
    return { me: (await getReferralMe(userId)) ?? undefined };
  }

  await finalizeCompletedReferral(
    completedRow,
    networkHash ?? completedRow.network_hash ?? row.network_hash ?? null,
  );

  return { me: (await getReferralMe(userId)) ?? undefined };
}
