"use client";

import { PREMIUM_PERKS, PREMIUM_PRICE_JPY } from "@/lib/constants";
import { useApp } from "@/lib/store";
import { ArrowLeft, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PremiumPage() {
  const router = useRouter();
  const { openPremium, hasPremium, isDeveloper, subscribe } = useApp();

  useEffect(() => {
    openPremium();
  }, [openPremium]);

  return (
    <div className="px-4 py-6">
      <button onClick={() => router.back()} className="mb-6 text-muted">
        <ArrowLeft size={20} />
      </button>
      <p className="flex items-center gap-2 text-2xl font-black">
        <Crown className="text-amber-400" size={22} />
        Aha! Premium
      </p>
      <p className="mt-1 text-sm text-muted">月額 ¥{PREMIUM_PRICE_JPY}</p>
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
      {!hasPremium && (
        <button
          onClick={subscribe}
          className="mt-6 w-full rounded-full bg-amber-400 py-3 text-sm font-black text-black"
        >
          ¥{PREMIUM_PRICE_JPY}/月で加入
        </button>
      )}
    </div>
  );
}
