import { adminSupabase } from "@/lib/admin-supabase";
import { bearerTokenFromRequest, userFromRequest } from "@/lib/api-auth";
import { checkoutReturnOrigin, premiumReturnUrl } from "@/lib/app-origin";
import { PREMIUM_THANKS_MESSAGE, PREMIUM_THANKS_TITLE } from "@/lib/constants";
import { isComplimentaryPremiumAccount } from "@/lib/premium";
import { jsonIfNoAppAccess } from "@/lib/require-app-access";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveExistingPriceId(stripe: Stripe, priceOrProductId: string) {
  if (priceOrProductId.startsWith("price_")) return priceOrProductId;
  if (priceOrProductId.startsWith("prod_")) {
    const prices = await stripe.prices.list({
      product: priceOrProductId,
      active: true,
      type: "recurring",
      limit: 1,
    });
    const price = prices.data[0];
    if (!price) {
      throw new Error("このプロダクトに有効な定期課金 Price がありません。STRIPE_PRICE_ID を確認してください。");
    }
    return price.id;
  }
  throw new Error("STRIPE_PRICE_ID は既存の price_ または prod_ を指定してください。");
}

async function loadBillingProfile(request: Request, userId: string) {
  const admin = adminSupabase();
  const select =
    "handle, name, stripe_referral_coupon_id, is_half_discount_eligible, stripe_customer_id";
  if (admin) {
    const { data } = await admin.from("profiles").select(select).eq("id", userId).maybeSingle();
    return data;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = bearerTokenFromRequest(request);
  if (!url || !anon || !token) return null;
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data } = await sb.from("profiles").select(select).eq("id", userId).maybeSingle();
  return data;
}

export async function POST(request: Request) {
  const blocked = await jsonIfNoAppAccess(request);
  if (blocked) return blocked;

  try {
    const user = await userFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
    }

    const profile = await loadBillingProfile(request, user.id);
    const handle =
      (typeof profile?.handle === "string" && profile.handle) ||
      (typeof user.user_metadata?.handle === "string" ? user.user_metadata.handle : undefined);
    const name =
      (typeof profile?.name === "string" && profile.name) ||
      (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : undefined);
    const storedCoupon =
      typeof profile?.stripe_referral_coupon_id === "string" ? profile.stripe_referral_coupon_id : "";
    const couponId = storedCoupon.startsWith("c_") ? storedCoupon : "";
    const existingCustomer =
      typeof profile?.stripe_customer_id === "string" && profile.stripe_customer_id.startsWith("cus_")
        ? profile.stripe_customer_id
        : "";

    if (isComplimentaryPremiumAccount({ id: user.id, email: user.email, handle, name })) {
      const admin = adminSupabase();
      if (admin) {
        const { error } = await admin.from("notifications").insert({
          user_id: user.id,
          title: PREMIUM_THANKS_TITLE,
          message: PREMIUM_THANKS_MESSAGE,
        });
        if (error && !/duplicate|unique/i.test(error.message)) {
          console.warn("premium thanks insert failed:", error.message);
        }
      }
      return NextResponse.json({ alreadyPremium: true });
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    const priceEnv = process.env.STRIPE_PRICE_ID;
    if (!secret || !priceEnv) {
      return NextResponse.json(
        { error: "Stripe の環境変数が未設定です（STRIPE_SECRET_KEY / STRIPE_PRICE_ID）。" },
        { status: 500 },
      );
    }

    const stripe = new Stripe(secret);
    const price = await resolveExistingPriceId(stripe, priceEnv);
    const origin = checkoutReturnOrigin(request);

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      return_url: premiumReturnUrl(origin),
      redirect_on_completion: "always",
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      locale: "ja",
      branding_settings: {
        background_color: "#0b1220",
        button_color: "#fbbf24",
        border_style: "rounded",
        display_name: "Qraft Premium",
        font_family: "noto_sans_jp",
      },
      ...(existingCustomer
        ? { customer: existingCustomer }
        : user.email
          ? { customer_email: user.email }
          : {}),
      ...(couponId ? { discounts: [{ coupon: couponId }] } : {}),
    });

    if (!session.client_secret) {
      return NextResponse.json({ error: "Checkout を初期化できませんでした。" }, { status: 500 });
    }

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout セッションの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const blocked = await jsonIfNoAppAccess(request);
  if (blocked) return blocked;
  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "ログインしてください" }, { status: 401 });
  }
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "session_id が不正です" }, { status: 400 });
  }
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Stripe が未設定です" }, { status: 500 });
  }
  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const owner = session.client_reference_id || session.metadata?.user_id;
  if (owner !== user.id) {
    return NextResponse.json({ error: "この決済は確認できません" }, { status: 403 });
  }
  return NextResponse.json({
    status: session.status,
    paymentStatus: session.payment_status,
  });
}
