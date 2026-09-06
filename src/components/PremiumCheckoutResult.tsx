"use client";

import { fetchCheckoutSessionStatus } from "@/lib/stripe-checkout";
import { useApp } from "@/lib/store";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function PremiumCheckoutResult() {
  const params = useSearchParams();
  const { hasPremium, refreshPremiumStatus, refreshNotifications } = useApp();
  const sessionId = params.get("session_id");
  const canceled = params.get("canceled") === "true";
  const returnedFromCheckout = Boolean(sessionId) || params.get("success") === "true";
  const [checking, setChecking] = useState(returnedFromCheckout);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  useEffect(() => {
    if (!returnedFromCheckout) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (sessionId?.startsWith("cs_")) {
        const session = await fetchCheckoutSessionStatus(sessionId);
        if (session?.status === "complete" || session?.paymentStatus === "paid") {
          setCheckoutComplete(true);
        }
      }
      const payload = await refreshPremiumStatus();
      await refreshNotifications();
      if (cancelled) return;
      if (payload?.premium) {
        setChecking(false);
        return;
      }
      attempts += 1;
      if (attempts >= 20) {
        setChecking(false);
        return;
      }
      window.setTimeout(() => {
        void poll();
      }, 1500);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [returnedFromCheckout, sessionId, refreshPremiumStatus, refreshNotifications]);

  if (canceled) {
    return (
      <div className="mb-4 rounded-2xl border border-gray-700 bg-panel px-4 py-3">
        <p className="text-sm font-bold text-white">決済はキャンセルされました</p>
        <p className="mt-1 text-xs text-muted">いつでも下のフォームから再登録できます。</p>
      </div>
    );
  }

  if (!returnedFromCheckout) return null;

  if (hasPremium) {
    return (
      <div className="mb-4 rounded-2xl border border-aha/40 bg-aha/10 px-4 py-3">
        <p className="text-sm font-black text-aha">プレミアムプランへの登録が完了しました</p>
        <p className="mt-1 text-xs text-muted">特典はすぐに利用できます。</p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <p className="text-sm font-black text-amber-200">
        {checkoutComplete ? "決済は受け付けました。Premium を確認しています…" : "決済情報を確認しています…"}
      </p>
      <p className="mt-1 text-xs text-muted">
        {checking
          ? "Stripe とサーバーの反映を待っています。このまま少しお待ちください。"
          : "まだ Premium が確認できていません。しばらくしてからこのページを再読み込みしてください。"}
      </p>
    </div>
  );
}
