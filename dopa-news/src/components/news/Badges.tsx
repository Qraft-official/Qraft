"use client";

import { Flame } from "lucide-react";
import { SOURCE_TRUST, categoryAccent } from "@/lib/categories";
import type { SourceType } from "@/types/database";

export function CategoryTag({ category }: { category: string }) {
  const accent = categoryAccent(category);
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-[3px] text-[10.5px] font-bold tracking-wide"
      style={{ color: accent, background: `${accent}1f`, border: `1px solid ${accent}33` }}
    >
      {category}
    </span>
  );
}

export function BreakingTag() {
  return (
    <span className="relative inline-flex items-center gap-1 rounded-md border border-[#ff5c7a]/50 bg-[#ff5c7a]/15 px-1.5 py-[3px] text-[10.5px] font-bold tracking-wide text-[#ff5c7a]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#ff5c7a] opacity-75 [animation:dopa-pulse-ring_1.8s_ease-out_infinite]" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ff5c7a]" />
      </span>
      速報
    </span>
  );
}

/** Talk-of-the-town meter. Purely a popularity signal, not a truth signal. */
export function HeatMeter({ heat }: { heat: number }) {
  const level = Math.max(0, Math.min(100, heat));
  const tone = level >= 75 ? "#ff5c7a" : level >= 45 ? "#ffc44d" : "#4ef5a3";
  return (
    <div className="flex items-center gap-1.5" title={`話題度 ${level}`}>
      <Flame size={13} style={{ color: tone }} />
      <span className="text-[11px] font-semibold text-fg-muted">話題度</span>
      <span className="h-1 w-12 overflow-hidden rounded-full bg-white/10">
        <span
          className="block h-full rounded-full transition-[width] duration-500"
          style={{ width: `${level}%`, background: tone }}
        />
      </span>
    </div>
  );
}

const TONE_CLASS: Record<string, string> = {
  good: "border-[#4ef5a3]/35 bg-[#4ef5a3]/10 text-[#4ef5a3]",
  ok: "border-[#35dcff]/35 bg-[#35dcff]/10 text-[#35dcff]",
  warn: "border-[#ffc44d]/40 bg-[#ffc44d]/10 text-[#ffc44d]",
};

export function SourceTrustTag({ type }: { type: SourceType }) {
  const trust = SOURCE_TRUST[type] ?? SOURCE_TRUST.unconfirmed;
  return (
    <span
      title={trust.help}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-[3px] text-[10.5px] font-bold ${TONE_CLASS[trust.tone]}`}
    >
      {trust.mark} {trust.label}
    </span>
  );
}
