import { CANONICAL_ORIGIN } from "./constants";

function trimSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function configuredAppOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim() || "";
  if (fromEnv) {
    try {
      return trimSlash(new URL(fromEnv).origin);
    } catch {
      /* ignore */
    }
  }
  return CANONICAL_ORIGIN;
}

function isAllowedCheckoutOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host === "qrafters.jp" || host === "www.qrafters.jp") return true;
    if (host.endsWith(".vercel.app")) return true;
    const configured = new URL(configuredAppOrigin()).hostname;
    if (host === configured) return true;
    return false;
  } catch {
    return false;
  }
}

/** Safe public origin for Stripe return_url. Never trusts an arbitrary Origin header. */
export function checkoutReturnOrigin(request: Request) {
  const headerOrigin = request.headers.get("origin")?.trim() || "";
  if (headerOrigin && isAllowedCheckoutOrigin(headerOrigin)) {
    return trimSlash(new URL(headerOrigin).origin);
  }
  const headerHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (headerHost) {
    const candidate = `${proto === "http" ? "http" : "https"}://${headerHost.split(",")[0]!.trim()}`;
    if (isAllowedCheckoutOrigin(candidate)) return trimSlash(new URL(candidate).origin);
  }
  return configuredAppOrigin();
}

export function premiumReturnUrl(origin: string) {
  return `${trimSlash(origin)}/premium?session_id={CHECKOUT_SESSION_ID}`;
}
