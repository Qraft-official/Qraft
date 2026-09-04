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
    <div className="flex shrink-0 gap-1 px-4 py-2" role="tablist" aria-label="入力方式">
      <button
        type="button"
        role="tab"
        aria-selected={value === "hand"}
        onClick={() => onChange("hand")}
        className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold ${
          value === "hand" ? "bg-aha text-black" : "border border-gray-800 text-muted"
        }`}
      >
        <PenLine size={16} />
        手書き
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "typed"}
        onClick={() => onChange("typed")}
        className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold ${
          value === "typed" ? "bg-aha text-black" : "border border-gray-800 text-muted"
        }`}
      >
        <Keyboard size={16} />
        打ち込み
      </button>
    </div>
  );
}
