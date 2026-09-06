"use client";

import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { supabase } from "@/lib/supabase";
import { useCallback, useMemo, useState } from "react";

function publishableKey() {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
}

export function PremiumEmbeddedCheckout({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [error, setError] = useState("");
  const stripePromise = useMemo(() => {
    const key = publishableKey();
    if (!key) return null;
    return loadStripe(key);
  }, []);

  const fetchClientSecret = useCallback(async () => {
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error("ログインしてください");
    }
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "same-origin",
    });
    const data = (await res.json()) as {
      clientSecret?: string;
      alreadyPremium?: boolean;
      error?: string;
    };
    if (data.alreadyPremium) {
      onComplete?.();
      throw new Error("すでに Premium です");
    }
    if (!res.ok || !data.clientSecret) {
      const message = data.error || "決済フォームを開けませんでした。";
      setError(message);
      throw new Error(message);
    }
    return data.clientSecret;
  }, [onComplete]);

  if (!stripePromise) {
    return (
      <p className="text-sm text-red-400">
        Stripe の公開鍵が未設定です（NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY）。
      </p>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden">
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{
          fetchClientSecret,
          onComplete: () => {
            onComplete?.();
          },
        }}
      >
        <div className="min-w-0 overflow-x-hidden rounded-2xl">
          <EmbeddedCheckout />
        </div>
      </EmbeddedCheckoutProvider>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
