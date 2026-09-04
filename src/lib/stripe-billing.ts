/** Server-only Stripe billing helpers. Do not import from client components. */
import { adminSupabase } from "@/lib/admin-supabase";
import type Stripe from "stripe";

export type BillingStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "inactive";

export function asBillingStatus(status?: string | null): BillingStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return status;
    default:
      return "inactive";
  }
}

export function subscriptionPeriodEndIso(sub: Stripe.Subscription) {
  const unix =
    sub.items?.data?.[0]?.current_period_end ??
    (typeof (sub as { current_period_end?: number }).current_period_end === "number"
      ? (sub as { current_period_end?: number }).current_period_end
      : undefined);
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

export function customerIdOf(sub: Stripe.Subscription | Stripe.Checkout.Session) {
  const raw = sub.customer;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.id;
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const direct = (invoice as { subscription?: string | Stripe.Subscription | null }).subscription;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object" && "id" in direct) return direct.id;
  const parent = (
    invoice as {
      parent?: { subscription_details?: { subscription?: string | Stripe.Subscription | null } } | null;
    }
  ).parent?.subscription_details?.subscription;
  if (typeof parent === "string") return parent;
  if (parent && typeof parent === "object" && "id" in parent) return parent.id;
  return null;
}

export function subscriptionIdOf(session: Stripe.Checkout.Session) {
  const raw = session.subscription;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.id;
}

export async function findProfileIdForStripe(input: {
  userId?: string | null;
  customerId?: string | null;
}) {
  const admin = adminSupabase();
  if (!admin) return null;
  if (input.userId) {
    const { data } = await admin.from("profiles").select("id").eq("id", input.userId).maybeSingle();
    if (data?.id) return String(data.id);
  }
  if (input.customerId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", input.customerId)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }
  return null;
}

export async function persistStripeSubscription(input: {
  userId: string;
  customerId?: string | null;
  subscription: Stripe.Subscription;
}) {
  const admin = adminSupabase();
  if (!admin) return;
  const status = asBillingStatus(input.subscription.status);
  const patch: Record<string, unknown> = {
    stripe_subscription_id: input.subscription.id,
    premium_status: status,
    premium_current_period_end: subscriptionPeriodEndIso(input.subscription),
  };
  const customerId = input.customerId || customerIdOf(input.subscription);
  if (customerId) patch.stripe_customer_id = customerId;
  const { error } = await admin.from("profiles").update(patch).eq("id", input.userId);
  if (error) console.warn("persistStripeSubscription:", error.message);
}

export async function resolveUserIdFromSubscription(
  stripe: Stripe,
  sub: Stripe.Subscription,
) {
  const fromMeta = sub.metadata?.user_id?.trim();
  if (fromMeta) {
    const id = await findProfileIdForStripe({ userId: fromMeta, customerId: customerIdOf(sub) });
    if (id) return id;
  }
  const customerId = customerIdOf(sub);
  if (customerId) {
    const byCustomer = await findProfileIdForStripe({ customerId });
    if (byCustomer) return byCustomer;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!("deleted" in customer && customer.deleted)) {
        const metaUser = customer.metadata?.user_id?.trim();
        if (metaUser) {
          const id = await findProfileIdForStripe({ userId: metaUser, customerId });
          if (id) return id;
        }
      }
    } catch (err) {
      console.warn("resolveUserIdFromSubscription customer lookup:", err);
    }
  }
  return null;
}
