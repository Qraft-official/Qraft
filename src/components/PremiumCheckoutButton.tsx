"use client";

import { GuardianConsentCheckbox } from "@/components/GuardianConsentCheckbox";
import { startStripeCheckout } from "@/lib/stripe-checkout";
import { useId, useState } from "react";

export function PremiumCheckoutButton({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const consentId = useId();

  return (
    <div className="relative z-0" onClick={(e) => e.stopPropagation()}>
      <div className="mb-3">
        <GuardianConsentCheckbox
          id={consentId}
          checked={consent}
          onChange={setConsent}
        />
      </div>
      <button
        type="button"
        disabled={busy || !consent}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError("");
          setBusy(true);
          void startStripeCheckout().catch((err) => {
            setBusy(false);
            setError(err instanceof Error ? err.message : "決済を開始できませんでした。");
          });
        }}
        className={
          className ??
          "w-full rounded-full bg-amber-400 py-3 text-sm font-black text-black disabled:opacity-50"
        }
      >
        {busy ? "決済ページへ移動中…" : (label ?? "プレミアムプランに登録する")}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
