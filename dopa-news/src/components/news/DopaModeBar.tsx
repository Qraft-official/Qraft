"use client";

import Link from "next/link";
import { ChevronRight, Zap } from "lucide-react";

/** Entry point into the full-screen swipe reader. */
export default function DopaModeBar() {
  return (
    <Link
      href="/dopa"
      className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[#35dcff]/25 bg-[linear-gradient(100deg,rgba(53,220,255,0.13),rgba(169,139,255,0.13))] px-3.5 py-2.5 active:opacity-90"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#35dcff]/18 text-[#35dcff]">
        <Zap size={16} strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold text-fg">ドパモード</span>
        <span className="block text-[11px] text-fg-muted">
          1画面1ニュース。スワイプで一気に理解する
        </span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-fg-faint" />
    </Link>
  );
}
