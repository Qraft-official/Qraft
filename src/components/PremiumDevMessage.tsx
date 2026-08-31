"use client";

import { PREMIUM_DEV_MESSAGE } from "@/lib/constants";

export function PremiumDevMessage() {
  return (
    <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 px-3 py-3">
      <p className="mb-1.5 text-[10px] font-black tracking-wide text-amber-300">開発者からのメッセージ</p>
      {PREMIUM_DEV_MESSAGE.map((p) => (
        <p key={p.slice(0, 24)} className="mt-1.5 text-[12px] leading-relaxed text-[#e7e9ea]">
          {p}
        </p>
      ))}
    </div>
  );
}
