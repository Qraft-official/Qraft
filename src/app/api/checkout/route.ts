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
  const secret = process.env.STRIPE_SECRET_KEY;
  const priceEnv = process.env.STRIPE_PRICE_ID;
  if (!secret || !priceEnv) {
    return NextResponse.json(
      { error: "Stripe の環境変数が未設定です（STRIPE_SECRET_KEY / STRIPE_PRICE_ID）。" },
      { status: 500 },
    );
  }

  try {
    const stripe = new Stripe(secret);
    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const price = await resolvePriceId(stripe, priceEnv);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?canceled=true`,
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
