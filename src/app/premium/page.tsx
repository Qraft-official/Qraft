"use client";

import { GuardianConsentCheckbox } from "@/components/GuardianConsentCheckbox";
import { PremiumCheckoutResult } from "@/components/PremiumCheckoutResult";
import { PremiumDevMessage } from "@/components/PremiumDevMessage";
import { PremiumEmbeddedCheckout } from "@/components/PremiumEmbeddedCheckout";
import { AppBootSkeleton } from "@/components/UiStates";
import { PREMIUM_PERKS, PREMIUM_PRICE_JPY } from "@/lib/constants";
import { needsGuardianConsent } from "@/lib/guardian-consent";
import { goBackFromPremium } from "@/lib/premium-navigation";
import { useApp } from "@/lib/store";
import { ArrowLeft, Crown, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useId, useState } from "react";

function PremiumPageInner() {
  const router = useRouter();
  const { hasPremium, isDeveloper, me, refreshPremiumStatus } = useApp();
  const [consent, setConsent] = useState(false);
  const consentId = useId();
  const requireConsent = needsGuardianConsent(me.age);
  const canCheckout = !hasPremium && !isDeveloper && (!requireConsent || consent);

  useEffect(() => {
    void refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-hidden">
      <header className="relative z-30 shrink-0 border-b border-gray-900 bg-black px-4 py-4">
        <button
          type="button"
          aria-label="戻る"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            goBackFromPremium(router);
          }}
          className="pointer-events-auto relative z-30 -ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted"
        >
          <ArrowLeft size={20} />
        </button>
      </header>

      <main className="relative z-0 min-w-0 flex-1 overflow-x-hidden px-4 py-6">
        <p className="flex items-center gap-2 text-2xl font-black">
          <Crown className="text-amber-400" size={22} />
          Qraft Premium
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          学習をもっと続けやすくする月額プランです。決済はこのページ内で完了できます。
        </p>

        <div className="mt-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-purple-600/20 to-aha/10 p-4">
          <p className="text-3xl font-black tracking-tight">
            ¥{PREMIUM_PRICE_JPY}
            <span className="ml-1 text-sm font-medium text-muted">/ 月</span>
          </p>
          <p className="mt-1 text-xs text-muted">継続課金 · いつでも解約できます</p>
        </div>

        <div className="mt-4">
          <PremiumDevMessage />
        </div>
        <div className="mt-4">
          <PremiumCheckoutResult />
        </div>
        {isDeveloper && (
          <p className="mt-3 text-xs font-bold text-aha">開発者アカウントは全機能無料です。決済は不要です。</p>
        )}

        <p className="mt-6 text-xs font-bold tracking-wide text-muted">特典</p>
        <div className="mt-2 space-y-2">
          {PREMIUM_PERKS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-gray-800 bg-panel px-3 py-2">
              <p className="text-sm font-bold">
                {p.icon} {p.title}
              </p>
              <p className="text-[11px] text-muted">{p.desc}</p>
            </div>
          ))}
        </div>

        {!hasPremium && !isDeveloper && (
          <section id="premium-checkout" className="relative z-0 mt-6 min-w-0" aria-label="決済">
            {requireConsent && (
              <div className="mb-3">
                <GuardianConsentCheckbox id={consentId} checked={consent} onChange={setConsent} />
              </div>
            )}
            {canCheckout ? (
              <div className="rounded-2xl border border-gray-800 bg-panel p-3">
                <p className="mb-3 text-sm font-bold text-white">お支払い</p>
                <PremiumEmbeddedCheckout onComplete={() => void refreshPremiumStatus()} />
              </div>
            ) : (
              <p className="rounded-2xl border border-gray-800 bg-panel px-3 py-3 text-xs text-muted">
                決済フォームを表示するには、保護者の同意が必要です。
              </p>
            )}
            <div className="mt-4 flex gap-2 rounded-2xl border border-gray-800 px-3 py-3 text-[11px] leading-relaxed text-muted">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-aha" />
              <p>
                カード情報は Qraft のサーバーを経由せず、Stripe の安全な決済画面で処理されます。Apple Pay / Google Pay
                は対応端末・ブラウザで Stripe が表示します。
              </p>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              解約は Stripe のカスタマーポータル、または設定のプラン画面から手続きできます。解約後も、現在の請求期間の終わりまでは
              Premium を利用できます。
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<AppBootSkeleton />}>
      <PremiumPageInner />
    </Suspense>
  );
}
