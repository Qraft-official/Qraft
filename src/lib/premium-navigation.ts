"use client";

const RETURN_KEY = "qraft.premiumReturnPath";

function referrerIsStripeCheckout() {
  if (typeof window === "undefined") return false;
  const ref = document.referrer;
  return /stripe\.com|checkout\.stripe/i.test(ref);
}

function safeAppPath() {
  if (typeof window === "undefined") return "/";
  try {
    const stored = sessionStorage.getItem(RETURN_KEY);
    if (stored && stored.startsWith("/") && !stored.startsWith("/premium")) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "/";
}

export function rememberPremiumReturnPath(path: string) {
  if (typeof window === "undefined") return;
  if (!path.startsWith("/") || path.startsWith("/premium")) return;
  try {
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

function leavingStripeCheckout() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("canceled") === "true" ||
    params.get("success") === "true" ||
    referrerIsStripeCheckout()
  );
}

/** Never `history.back()` into Stripe Checkout. Prefer the last in-app screen. */
export function goBackFromPremium(router: { back: () => void; push: (href: string) => void }) {
  if (typeof window === "undefined") {
    router.push("/");
    return;
  }
  if (leavingStripeCheckout()) {
    router.push(safeAppPath());
    return;
  }
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.push(safeAppPath());
}
