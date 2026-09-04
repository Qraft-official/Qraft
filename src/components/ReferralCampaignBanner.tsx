"use client";

import Link from "next/link";
import { CAMPAIGN_INVITE_TARGET } from "@/lib/referral";
import { useApp } from "@/lib/store";

export function ReferralCampaignBanner({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { referralMe } = useApp();
  const invited = Math.min(referralMe?.inviteSuccessCount ?? 0, CAMPAIGN_INVITE_TARGET);
  const leftInvites = Math.max(0, CAMPAIGN_INVITE_TARGET - invited);
  const remain: string[] = [];
  if (leftInvites > 0) remain.push(`あと${leftInvites}人`);
  if (!referralMe?.xFollowTapped) remain.push("Xフォロー");
  if (!referralMe?.xPostTapped) remain.push("リポスト");
  const remainLabel = remain.length ? remain.join(" · ") : "条件達成済み";

  if (compact) {
    return (
      <Link
        href="/settings?tab=referral"
        className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border border-gray-800 px-3 py-2 ${className}`}
      >
        <span className="min-w-0">
          <span className="block text-sm text-muted">友達紹介キャンペーン</span>
          <span className="mt-0.5 block text-xs text-muted">{remainLabel}</span>
        </span>
        <span className="shrink-0 text-xs font-bold text-aha">詳細</span>
      </Link>
    );
  }
  return (
    <Link
      href="/settings?tab=referral"
      className={`flex items-center justify-between gap-3 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-400/20 via-aha/10 to-transparent px-4 py-3 ${className}`}
    >
      <span>
        <span className="block text-sm font-black text-amber-200">🎁 友達紹介で半額！</span>
        <span className="mt-0.5 block text-xs text-muted">
          条件達成でプレミアムが1か月 ¥200。詳細は設定へ
        </span>
      </span>
      <span className="shrink-0 text-xs font-bold text-aha">開く →</span>
    </Link>
  );
}
