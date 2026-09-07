"use client";

import { useEffect, useRef } from "react";
import { FEED_TABS } from "@/lib/categories";

export default function CategoryChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = trackRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [value]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label="ニュースカテゴリ"
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5"
    >
      {FEED_TABS.map((tab) => {
        const active = tab === value;
        const breaking = tab === "速報";
        return (
          <button
            key={tab}
            role="tab"
            type="button"
            data-active={active}
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`shrink-0 rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
              active
                ? breaking
                  ? "border-[#ff5c7a]/60 bg-[#ff5c7a]/15 text-[#ff5c7a] shadow-[0_0_16px_-4px_rgba(255,92,122,0.7)]"
                  : "border-[#4ef5a3]/55 bg-[#4ef5a3]/12 text-[#4ef5a3] shadow-[0_0_16px_-4px_rgba(78,245,163,0.7)]"
                : "border-line bg-ink-800 text-fg-muted active:bg-ink-700"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
