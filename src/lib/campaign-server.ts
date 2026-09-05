import { adminSupabase } from "./admin-supabase";
import {
  CAMPAIGN_INVITE_TARGET,
  PREMIUM_REFERRAL_HALF_JPY,
} from "./referral";
import Stripe from "stripe";

export type CampaignFields = {
  inviteSuccessCount: number;
  xFollowTapped: boolean;
  xPostTapped: boolean;
  isHalfDiscountEligible: boolean;
};

const emptyCampaign: CampaignFields = {
  inviteSuccessCount: 0,
  xFollowTapped: false,
  xPostTapped: false,
  isHalfDiscountEligible: false,
};

export async function countInviteSuccess(referrerId: string) {
  const admin = adminSupabase();
  if (!admin) return 0;
  const [{ data: opens }, { data: claims }] = await Promise.all([
    admin
      .from("campaign_events")
      .select("device_id")
      .eq("referrer_id", referrerId)
      .eq("event_type", "invite_open"),
    admin.from("referral_claims").select("device_id, referee_id").eq("referrer_id", referrerId),
  ]);
  const keys = new Set<string>();
  for (const row of opens ?? []) {
    if (row.device_id) keys.add(`d:${row.device_id}`);
  }
  for (const row of claims ?? []) {
    if (row.device_id) keys.add(`d:${row.device_id}`);
    else if (row.referee_id) keys.add(`u:${row.referee_id}`);
  }
  return keys.size;
}

async function clusterReferrerId(userId: string) {
  const admin = adminSupabase();
  if (!admin) return userId;
  const own = await countInviteSuccess(userId);
  const { data: claim } = await admin
    .from("referral_claims")
    .select("referrer_id")
    .eq("referee_id", userId)
    .maybeSingle();
  const parentId = claim?.referrer_id ? String(claim.referrer_id) : "";
  const parentCount = parentId ? await countInviteSuccess(parentId) : 0;
  if (parentCount >= CAMPAIGN_INVITE_TARGET && own < CAMPAIGN_INVITE_TARGET) return parentId;
  if (own >= parentCount) return userId;
  return parentId || userId;
}

export async function loadCampaignFields(userId: string): Promise<CampaignFields> {
  const admin = adminSupabase();
  if (!admin) return emptyCampaign;
  const { data: profile } = await admin
    .from("profiles")
    .select("is_half_discount_eligible, campaign_x_follow_tapped_at, campaign_x_post_tapped_at")
    .eq("id", userId)
    .maybeSingle();
  const clusterId = await clusterReferrerId(userId);
  const inviteSuccessCount = await countInviteSuccess(clusterId);
  return {
    inviteSuccessCount,
    xFollowTapped: Boolean(profile?.campaign_x_follow_tapped_at),
    xPostTapped: Boolean(profile?.campaign_x_post_tapped_at),
    isHalfDiscountEligible: Boolean(profile?.is_half_discount_eligible),
  };
}

async function awardHalfPriceCoupon(userId: string) {
  const admin = adminSupabase();
  if (!admin) return;
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, stripe_referral_coupon_id, is_half_discount_eligible")
    .eq("id", userId)
    .maybeSingle();

  const alreadyFlagged = Boolean(profile?.is_half_discount_eligible);
  const existingCoupon = profile?.stripe_referral_coupon_id
    ? String(profile.stripe_referral_coupon_id)
    : "";

  if (!alreadyFlagged) {
    await admin.from("profiles").update({ is_half_discount_eligible: true }).eq("id", userId);
    await admin.from("notifications").insert({
      user_id: userId,
      title: "🎉 半額キャンペーン達成",
      message:
        "友達紹介キャンペーンの条件を満たしました。プレミアムプランが1か月半額（￥200）になります。次回の購入時または次回の更新時に適用されます。",
    });
  }

  if (existingCoupon.startsWith("c_")) return;

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    if (!existingCoupon) {
      await admin.from("profiles").update({ stripe_referral_coupon_id: "pending-local" }).eq("id", userId);
    }
    return;
  }

  const stripe = new Stripe(secret);
  const coupon = await stripe.coupons.create({
    amount_off: PREMIUM_REFERRAL_HALF_JPY,
    currency: "jpy",
    duration: "once",
    name: "紹介キャンペーン 1か月半額",
    metadata: { user_id: userId, campaign: "half_price_invite" },
  });
  await admin.from("profiles").update({ stripe_referral_coupon_id: coupon.id }).eq("id", userId);

  const customerId = profile?.stripe_customer_id;
  if (customerId) {
    try {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      const sub = subs.data[0];
      if (sub) await stripe.subscriptions.update(sub.id, { discounts: [{ coupon: coupon.id }] });
    } catch (err) {
      console.warn("failed to attach campaign coupon:", err);
    }
  }
}

export async function evaluateHalfPriceCampaign(userId: string) {
  const admin = adminSupabase();
  if (!admin) return;
  const { data: sampleRow } = await admin.from("profiles").select("is_sample").eq("id", userId).maybeSingle();
  if (sampleRow && (sampleRow as { is_sample?: boolean }).is_sample) return;
  const fields = await loadCampaignFields(userId);
  if (fields.inviteSuccessCount < CAMPAIGN_INVITE_TARGET) return;
  if (!fields.xFollowTapped || !fields.xPostTapped) return;
  await awardHalfPriceCoupon(userId);
}

export async function evaluateCluster(referrerId: string) {
  const admin = adminSupabase();
  if (!admin) return;
  await evaluateHalfPriceCampaign(referrerId);
  const { data: claims } = await admin
    .from("referral_claims")
    .select("referee_id")
    .eq("referrer_id", referrerId);
  for (const row of claims ?? []) {
    await evaluateHalfPriceCampaign(String(row.referee_id));
  }
}

export async function recordInviteOpen(input: {
  code: string;
  deviceId: string;
  userId?: string | null;
}): Promise<{ error?: string }> {
  const admin = adminSupabase();
  if (!admin) return { error: "キャンペーンの設定がありません。" };
  const code = input.code.trim().toUpperCase();
  const deviceId = input.deviceId.trim();
  if (!code) return { error: "招待コードがありません。" };
  if (deviceId.length < 8) return { error: "端末情報を確認できませんでした。" };

  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .ilike("referral_code", code)
    .maybeSingle();
  if (!referrer?.id) return { error: "招待リンクが無効です。" };
  const { data: sampleRow } = await admin.from("profiles").select("is_sample").eq("id", referrer.id).maybeSingle();
  if (sampleRow && (sampleRow as { is_sample?: boolean }).is_sample) {
    return { error: "招待リンクが無効です。" };
  }
  if (input.userId && referrer.id === input.userId) return {};

  const { error } = await admin.from("campaign_events").insert({
    event_type: "invite_open",
    referrer_id: referrer.id,
    user_id: input.userId || null,
    device_id: deviceId,
  });
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { error: error.message };
  }
  await evaluateCluster(String(referrer.id));
  return {};
}

export async function recordXCampaignTap(
  userId: string,
  type: "x_follow" | "x_post",
  deviceId: string,
): Promise<{ error?: string }> {
  const admin = adminSupabase();
  if (!admin) return { error: "キャンペーンの設定がありません。" };
  const now = new Date().toISOString();
  const patch =
    type === "x_follow"
      ? { campaign_x_follow_tapped_at: now }
      : { campaign_x_post_tapped_at: now };
  await admin.from("profiles").update(patch).eq("id", userId);

  const safeDevice = deviceId.trim().length >= 8 ? deviceId.trim() : `${userId.replace(/-/g, "").slice(0, 12)}device`;
  const { error } = await admin.from("campaign_events").insert({
    event_type: type,
    user_id: userId,
    device_id: safeDevice,
  });
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { error: error.message };
  }

  const clusterId = await clusterReferrerId(userId);
  await evaluateCluster(clusterId);
  return {};
}
