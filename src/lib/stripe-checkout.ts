export async function startStripeCheckout() {
  const res = await fetch("/api/checkout", { method: "POST" });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || "決済ページを開けませんでした。");
  }
  window.location.assign(data.url);
}
