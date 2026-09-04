"use client";

import {
  WELCOME_LOGIN_TARGET,
  WELCOME_POSTS_TARGET,
  WELCOME_SOLVES_TARGET,
  formatMissionCountdown,
} from "@/lib/referral";
import { useApp } from "@/lib/store";
import Link from "next/link";
import { useMemo } from "react";

export function HomeNextStep() {
  const { referralMe, follows } = useApp();
  const claim = referralMe?.claim;

  const mission = useMemo(() => {
    if (!claim) return null;
    if (claim.status === "held") {
      return { kind: "held" as const };
    }
    if (claim.completedAt || claim.expiredAt) return null;
    const left = [
      claim.solves < WELCOME_SOLVES_TARGET ? `解く ${WELCOME_SOLVES_TARGET - claim.solves}` : null,
      claim.loginStreak < WELCOME_LOGIN_TARGET
        ? `連続ログイン ${WELCOME_LOGIN_TARGET - claim.loginStreak}`
        : null,
      claim.posts < WELCOME_POSTS_TARGET ? `投稿 ${WELCOME_POSTS_TARGET - claim.posts}` : null,
    ].filter(Boolean);
    if (!left.length) return null;
    const clock = formatMissionCountdown(claim.missionDeadline);
    return { kind: "progress" as const, left: left.join(" · "), remainingLabel: clock.remainingLabel };
  }, [claim]);

  if (mission?.kind === "held") {
    return (
      <p className="px-4 py-2 text-sm text-muted">
        Welcome Mission は達成済みです。紹介を確認しています。
      </p>
    );
  }

  if (mission?.kind === "progress") {
    return (
      <Link
        href="/welcome-mission"
        className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-panel px-3 py-2"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-white">次は Welcome Mission</span>
          <span className="mt-0.5 block text-xs text-muted">
            あと{mission.left}
            {mission.remainingLabel ? ` · ${mission.remainingLabel}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-sm font-bold text-aha">開く</span>
      </Link>
    );
  }

  if (follows.length === 0) {
    return (
      <div className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-panel px-3 py-2">
        <p className="text-sm text-muted">まずは問題に Aha。気になった人は Discover で探せます。</p>
        <Link href="/discover" className="flex min-h-11 shrink-0 items-center text-sm font-bold text-aha">
          探す
        </Link>
      </div>
    );
  }

  return null;
}
