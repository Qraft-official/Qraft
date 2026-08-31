"use client";

import { IOS_NOTICE } from "@/lib/constants";

export function IosNotice() {
  return (
    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-3 py-3">
      <p className="text-[11px] leading-relaxed text-sky-100">{IOS_NOTICE}</p>
    </div>
  );
}
