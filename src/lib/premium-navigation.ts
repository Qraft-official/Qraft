"use client";

function referrerIsStripeCheckout() {
  if (typeof window === "undefined") return false;
  const ref = document.referrer;
  return /stripe\.com|checkout\.stripe/i.test(ref);
}

/** Leave the premium screen without starting Checkout. Skip Stripe in history. */
export function goBackFromPremium(router: { back: () => void; push: (href: string) => void }) {
  if (typeof window === "undefined") {
    router.push("/");
    return;
  }
  if (referrerIsStripeCheckout()) {
    router.push("/");
    return;
  }
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.push("/");
}
