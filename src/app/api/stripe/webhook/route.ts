import { PREMIUM_THANKS_MESSAGE, PREMIUM_THANKS_TITLE } from "@/lib/constants";
import { adminSupabase } from "@/lib/admin-supabase";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

async function insertPremiumThanks(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return;
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    title: PREMIUM_THANKS_TITLE,
    message: PREMIUM_THANKS_MESSAGE,
  });
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.warn("premium thanks insert failed:", error.message);
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: "Webhook が未設定です" }, { status: 500 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "signature missing" }, { status: 400 });
  }

  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription") {
      const userId = session.client_reference_id || session.metadata?.user_id;
      if (userId) await insertPremiumThanks(userId);
      const admin = adminSupabase();
      if (admin && userId) {
        const customer =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const patch: Record<string, unknown> = {};
        if (customer) patch.stripe_customer_id = customer;
        if (session.discounts?.length) patch.stripe_referral_coupon_id = null;
        if (Object.keys(patch).length) {
          await admin.from("profiles").update(patch).eq("id", userId);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
