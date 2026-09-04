"use client";

import { PREMIUM_PERKS, PREMIUM_PRICE_JPY } from "@/lib/constants";
import { goBackFromPremium } from "@/lib/premium-navigation";
import { useApp } from "@/lib/store";
import { ArrowLeft, Crown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppBootSkeleton } from "@/components/UiStates";
import { PremiumCheckoutButton } from "@/components/PremiumCheckoutButton";
import { PremiumDevMessage } from "@/components/PremiumDevMessage";

function PremiumCheckoutResult() {
  const params = useSearchParams();
  const { hasPremium, refreshPremiumStatus, refreshNotifications } = useApp();
  const success = params.get("success") === "true";
  const canceled = params.get("canceled") === "true";
  const [checking, setChecking] = useState(success);

  useEffect(() => {
    if (!success) return;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
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
  }, [success, refreshPremiumStatus, refreshNotifications]);

  if (canceled) {
    return (
      <div className="mb-4 rounded-2xl border border-gray-700 bg-panel px-4 py-3">
        <p className="text-sm font-bold text-white">決済はキャンセルされました</p>
        <p className="mt-1 text-xs text-muted">いつでも下のボタンから再登録できます。</p>
      </div>
    );
  }

  if (!success) return null;

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
      <p className="text-sm font-black text-amber-200">決済情報を確認しています…</p>
      <p className="mt-1 text-xs text-muted">
        {checking
          ? "Stripe の反映を待っています。このまま少しお待ちください。"
          : "まだ Premium が確認できていません。しばらくしてからこのページを再読み込みしてください。"}
      </p>
    </div>
  );
}

function PremiumPageInner() {
  const router = useRouter();
  const { hasPremium, isDeveloper, refreshPremiumStatus } = useApp();

  useEffect(() => {
    void refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  return (
    <div className="flex min-h-dvh flex-col">
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

      <main className="relative z-0 flex-1 px-4 py-6">
        <p className="flex items-center gap-2 text-2xl font-black">
          <Crown className="text-amber-400" size={22} />
          Qraft Premium
        </p>
        <p className="mt-1 text-sm text-muted">月額 ¥{PREMIUM_PRICE_JPY}</p>
        <div className="mt-4">
          <PremiumDevMessage />
        </div>
        <div className="mt-4">
          <PremiumCheckoutResult />
        </div>
        {isDeveloper && (
          <p className="mt-3 text-xs font-bold text-aha">開発者アカウントは全機能無料です。</p>
        )}
        <div className="mt-4 space-y-2">
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
          <section className="relative z-0 mt-6" aria-label="決済">
            <PremiumCheckoutButton />
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
