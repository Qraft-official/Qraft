import assert from "node:assert/strict";
import { checkoutReturnOrigin, premiumReturnUrl } from "../src/lib/app-origin";

function req(headers: Record<string, string>) {
  return new Request("https://example.invalid/api/checkout", { headers });
}

const local = checkoutReturnOrigin(req({ origin: "http://localhost:3000" }));
assert.equal(local, "http://localhost:3000");
assert.equal(premiumReturnUrl(local), "http://localhost:3000/premium?session_id={CHECKOUT_SESSION_ID}");

assert.equal(checkoutReturnOrigin(req({ origin: "https://qrafters.jp" })), "https://qrafters.jp");
assert.equal(
  checkoutReturnOrigin(req({ origin: "https://qraft-git-foo.vercel.app" })),
  "https://qraft-git-foo.vercel.app",
);
assert.equal(checkoutReturnOrigin(req({ origin: "https://evil.example" })), "https://qrafters.jp");

const src = require("node:fs").readFileSync("src/app/api/checkout/route.ts", "utf8");
assert.match(src, /ui_mode:\s*"embedded_page"/);
assert.match(src, /mode:\s*"subscription"/);
assert.doesNotMatch(src, /payment_method_types/);
assert.doesNotMatch(src, /success_url/);
assert.doesNotMatch(src, /price_data/);
assert.match(src, /STRIPE_PRICE_ID/);
assert.match(src, /client_secret/);

console.log("ok checkout-embedded");
