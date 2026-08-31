"use client";

import { PREMIUM_PERKS, PREMIUM_PRICE_JPY } from "@/lib/constants";
import { ensurePremiumThanksNotification } from "@/lib/notifications";
import { goBackFromPremium } from "@/lib/premium-navigation";
import { useApp } from "@/lib/store";
import { ArrowLeft, Crown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { PremiumCheckoutButton } from "@/components/PremiumCheckoutButton";
import { PremiumDevMessage } from "@/components/PremiumDevMessage";

function PremiumCheckoutResult() {
  const params = useSearchParams();
  const { subscribe, refreshNotifications } = useApp();
  const success = params.get("success") === "true";
  const canceled = params.get("canceled") === "true";

  useEffect(() => {
    if (!success) return;
    subscribe();
    void (async () => {
      await ensurePremiumThanksNotification();
      await refreshNotifications();
    })();
  }, [success, subscribe, refreshNotifications]);

  if (success) {
    return (
      <div className="mb-4 rounded-2xl border border-aha/40 bg-aha/10 px-4 py-3">
        <p className="text-sm font-black text-aha">プレミアムプランへの登録が完了しました</p>
        <p className="mt-1 text-xs text-muted">特典はすぐに利用できます。</p>
      </div>
    );
  }
  if (canceled) {
    return (
      <div className="mb-4 rounded-2xl border border-gray-700 bg-panel px-4 py-3">
        <p className="text-sm font-bold text-white">決済はキャンセルされました</p>
        <p className="mt-1 text-xs text-muted">いつでも下のボタンから再登録できます。</p>
      </div>
    );
  }
  return null;
}

function PremiumPageInner() {
  const router = useRouter();
  const { hasPremium, isDeveloper } = useApp();

  return (
    <div className="px-4 py-6">
      <button
        type="button"
        aria-label="戻る"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          goBackFromPremium(router);
        }}
        className="relative z-20 mb-6 text-muted"
      >
        <ArrowLeft size={20} />
      </button>
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
        <div className="mt-6">
          <PremiumCheckoutButton />
        </div>
      )}
    </div>
  );
}

export default function PremiumPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-10 text-sm text-muted">読み込み中…</div>
      }
    >
      <PremiumPageInner />
    </Suspense>
  );
}
