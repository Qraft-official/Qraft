"use client";

import Link from "next/link";

export function ReferralCampaignBanner({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/settings?tab=referral"
      className={`flex items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-400/20 via-aha/10 to-transparent px-4 py-3 ${className}`}
    >
      <span>
        <span className="block text-sm font-black text-amber-200">🎁 友達紹介で半額！</span>
        <span className="mt-0.5 block text-[11px] text-muted">
          条件達成でプレミアムが1か月 ¥200。詳細は設定へ
        </span>
      </span>
      <span className="shrink-0 text-xs font-bold text-aha">開く →</span>
    </Link>
  );
}
