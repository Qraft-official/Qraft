"use client";

import { GuardianConsentCheckbox } from "@/components/GuardianConsentCheckbox";
import { needsGuardianConsent } from "@/lib/guardian-consent";
import { useApp } from "@/lib/store";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState } from "react";

export function PremiumCheckoutButton({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { me } = useApp();
  const router = useRouter();
  const path = usePathname();
  const [consent, setConsent] = useState(false);
  const consentId = useId();
  const requireConsent = needsGuardianConsent(me.age);
  const onPremiumPage = path === "/premium";

  return (
    <div className="relative z-0 isolate">
      {requireConsent && (
        <div className="mb-3">
          <GuardianConsentCheckbox id={consentId} checked={consent} onChange={setConsent} />
        </div>
      )}
      <button
        type="button"
        disabled={requireConsent && !consent}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onPremiumPage) {
            document.getElementById("premium-checkout")?.scrollIntoView({ behavior: "smooth" });
            return;
          }
          router.push("/premium");
        }}
        className={
          className ??
          "w-full rounded-full bg-amber-400 py-3 text-sm font-black text-black disabled:opacity-50"
        }
      >
        {label ?? "プレミアムプランに登録する"}
      </button>
    </div>
  );
}
