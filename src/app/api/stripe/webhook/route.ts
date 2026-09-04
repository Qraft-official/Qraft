import { PREMIUM_THANKS_MESSAGE, PREMIUM_THANKS_TITLE } from "@/lib/constants";
import { adminSupabase } from "@/lib/admin-supabase";
import { createClient } from "@supabase/supabase-js";
import {
  customerIdOf,
  invoiceSubscriptionId,
  persistStripeSubscription,
  resolveUserIdFromSubscription,
  subscriptionIdOf,
} from "@/lib/stripe-billing";
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

async function attachUserMetadata(stripe: Stripe, sub: Stripe.Subscription, userId: string) {
  const customerId = customerIdOf(sub);
  try {
    if (!sub.metadata?.user_id) {
      await stripe.subscriptions.update(sub.id, { metadata: { user_id: userId } });
    }
  } catch (err) {
    console.warn("subscription metadata update failed:", err);
  }
  if (customerId) {
    try {
      await stripe.customers.update(customerId, { metadata: { user_id: userId } });
    } catch (err) {
      console.warn("customer metadata update failed:", err);
    }
  }
}

async function syncSubscription(stripe: Stripe, sub: Stripe.Subscription, knownUserId?: string | null) {
  const userId = knownUserId || (await resolveUserIdFromSubscription(stripe, sub));
  if (!userId) {
    console.warn("stripe webhook: could not resolve user for subscription", sub.id);
    return;
  }
  await persistStripeSubscription({
    userId,
    customerId: customerIdOf(sub),
    subscription: sub,
  });
  await attachUserMetadata(stripe, sub, userId);
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

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        const userId = session.client_reference_id || session.metadata?.user_id || null;
        if (userId) await insertPremiumThanks(userId);
        const admin = adminSupabase();
        if (admin && userId) {
          const customer = customerIdOf(session);
          const patch: Record<string, unknown> = {};
          if (customer) patch.stripe_customer_id = customer;
          if (session.discounts?.length) patch.stripe_referral_coupon_id = null;
          if (Object.keys(patch).length) {
            await admin.from("profiles").update(patch).eq("id", userId);
          }
        }
        const rawSub = session.subscription;
        if (rawSub && typeof rawSub === "object" && "status" in rawSub) {
          await syncSubscription(stripe, rawSub as Stripe.Subscription, userId);
        } else {
          const subscriptionId = subscriptionIdOf(session);
          if (subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            await syncSubscription(stripe, sub, userId);
          }
        }
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(stripe, sub);
    } else if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscription(stripe, sub);
      }
    }
  } catch (err) {
    console.warn("stripe webhook handler failed:", err);
    return NextResponse.json({ error: "webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
