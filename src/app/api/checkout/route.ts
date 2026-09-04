import { adminSupabase } from "@/lib/admin-supabase";
import { bearerTokenFromRequest, userFromRequest } from "@/lib/api-auth";
import { PREMIUM_PRICE_JPY, PREMIUM_THANKS_MESSAGE, PREMIUM_THANKS_TITLE } from "@/lib/constants";
import { isComplimentaryPremiumAccount } from "@/lib/premium";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

async function resolvePriceId(stripe: Stripe, priceOrProductId: string) {
  if (priceOrProductId.startsWith("price_")) return priceOrProductId;
  if (priceOrProductId.startsWith("prod_")) {
    const prices = await stripe.prices.list({
      product: priceOrProductId,
      active: true,
      limit: 1,
    });
    const price = prices.data[0];
    if (!price) {
      throw new Error("このプロダクトに有効な Price がありません。STRIPE_PRICE_ID に price_ から始まる ID を設定してください。");
    }
    return price.id;
  }
  return priceOrProductId;
}

export async function POST(request: Request) {
  const origin =
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  try {
    const user = await userFromRequest(request);
    let handle =
      typeof user?.user_metadata?.handle === "string" ? user.user_metadata.handle : undefined;
    let name =
      typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : undefined;
    let couponId = "";
    const admin = adminSupabase();
    if (user && admin) {
      const { data } = await admin
        .from("profiles")
        .select("handle, name, stripe_referral_coupon_id, is_half_discount_eligible")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.handle) handle = String(data.handle);
      if (data?.name) name = String(data.name);
      const stored = data?.stripe_referral_coupon_id ? String(data.stripe_referral_coupon_id) : "";
      if (stored.startsWith("c_")) couponId = stored;
    } else if (user) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && anon) {
        const token = bearerTokenFromRequest(request);
        const sb = createClient(url, anon, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        });
        const { data } = await sb
          .from("profiles")
          .select("handle, name, stripe_referral_coupon_id")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.handle) handle = String(data.handle);
        if (data?.name) name = String(data.name);
        const stored = data?.stripe_referral_coupon_id ? String(data.stripe_referral_coupon_id) : "";
        if (stored.startsWith("c_")) couponId = stored;
      }
    }

    if (
      isComplimentaryPremiumAccount({
        id: user?.id,
        email: user?.email,
        handle,
        name,
      })
    ) {
      if (user && admin) {
        const { error } = await admin.from("notifications").insert({
          user_id: user.id,
          title: PREMIUM_THANKS_TITLE,
          message: PREMIUM_THANKS_MESSAGE,
        });
        if (error && !/duplicate|unique/i.test(error.message)) {
          console.warn("premium thanks insert failed:", error.message);
        }
      }
      return NextResponse.json({
        url: `${origin}/premium?success=true`,
        alreadyPremium: true,
      });
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
    const price = await resolvePriceId(stripe, priceEnv);
    let lineItem: Stripe.Checkout.SessionCreateParams.LineItem = { price, quantity: 1 };
    try {
      const retrieved = await stripe.prices.retrieve(price);
      if (retrieved.unit_amount !== PREMIUM_PRICE_JPY) {
        const productId = typeof retrieved.product === "string" ? retrieved.product : undefined;
        lineItem = {
          quantity: 1,
          price_data: productId
            ? {
                currency: "jpy",
                unit_amount: PREMIUM_PRICE_JPY,
                recurring: { interval: "month" },
                product: productId,
              }
            : {
                currency: "jpy",
                unit_amount: PREMIUM_PRICE_JPY,
                recurring: { interval: "month" },
                product_data: { name: "Qraft Premium" },
              },
        };
      }
    } catch {
      lineItem = {
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: PREMIUM_PRICE_JPY,
          recurring: { interval: "month" },
          product_data: { name: "Qraft Premium" },
        },
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [lineItem],
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
      client_reference_id: user?.id,
      metadata: user ? { user_id: user.id } : undefined,
      ...(user
        ? {
            subscription_data: {
              metadata: { user_id: user.id },
            },
          }
        : {}),
      ...(user?.email ? { customer_email: user.email } : {}),
      ...(couponId.startsWith("c_") ? { discounts: [{ coupon: couponId }] } : {}),
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout URL を発行できませんでした。" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout セッションの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
