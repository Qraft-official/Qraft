"use client";

import { TEXT_SIZES, type TextSizeId } from "@/lib/text-size";

export function TextSizeBar({
  onPick,
}: {
  onPick: (size: TextSizeId) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label="文字サイズ">
      {TEXT_SIZES.map((s) => (
        <button
          key={s.id}
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onPick(s.id)}
          className="min-h-11 min-w-11 rounded-lg border border-gray-700 bg-white/5 px-1.5 text-[10px] font-bold text-white hover:border-aha"
          aria-label={`文字サイズ ${s.label}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
