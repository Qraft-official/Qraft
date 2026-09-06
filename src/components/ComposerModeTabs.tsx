"use client";

import { Keyboard, PenLine } from "lucide-react";

export function ComposerModeTabs({
  value,
  onChange,
}: {
  value: "hand" | "typed";
  onChange: (next: "hand" | "typed") => void;
}) {
  return (
    <div
      className="mx-3 flex h-9 shrink-0 overflow-hidden rounded-full border border-gray-800 md:mx-4 md:h-10"
      role="tablist"
      aria-label="入力方式"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "hand"}
        onClick={() => onChange("hand")}
        className={`flex min-w-0 flex-1 items-center justify-center gap-1 text-[13px] font-bold md:gap-1.5 md:text-sm ${
          value === "hand" ? "bg-aha text-black" : "bg-transparent text-muted"
        }`}
      >
        <PenLine size={14} />
        手書き
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "typed"}
        onClick={() => onChange("typed")}
        className={`flex min-w-0 flex-1 items-center justify-center gap-1 border-l border-gray-800 text-[13px] font-bold md:gap-1.5 md:text-sm ${
          value === "typed" ? "bg-aha text-black" : "bg-transparent text-muted"
        }`}
      >
        <Keyboard size={14} />
        打ち込み
      </button>
    </div>
  );
}
