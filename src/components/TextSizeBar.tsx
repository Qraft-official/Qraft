"use client";

import { TEXT_SIZES, type TextSizeId } from "@/lib/text-size";
import { useEffect, useRef, useState } from "react";

export function TextSizeBar({
  onPick,
  active,
  compact = false,
}: {
  onPick: (size: TextSizeId) => void;
  active?: TextSizeId;
  compact?: boolean;
}) {
  const current = TEXT_SIZES.find((s) => s.id === (active ?? "md")) ?? TEXT_SIZES[1];
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const t = window.setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("click", onDoc);
    };
  }, [open]);

  if (!compact) {
    return (
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label="文字サイズ">
        {TEXT_SIZES.map((s) => {
          const on = (active ?? "md") === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => onPick(s.id)}
              aria-pressed={on}
              aria-label={`文字サイズ ${s.label}${on ? "（選択中）" : ""}`}
              className={`min-h-11 min-w-11 rounded-lg border px-1.5 text-[10px] font-bold ${
                on ? "border-aha bg-aha/15 text-aha" : "border-gray-700 bg-white/5 text-white hover:border-aha"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-700 bg-white/5 text-white hover:border-aha"
        aria-label={`文字サイズ ${current.label}。選択中の文字、またはこれから入力する文字に適用`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`文字サイズ: ${current.label}（選択範囲→その文字 / 未選択→以降の入力）`}
      >
        <span className="text-[13px] font-black leading-none">Aa</span>
        <span className="sr-only">現在 {current.label}</span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="文字サイズ"
          className="absolute left-0 top-full z-30 mt-1 w-36 overflow-hidden rounded-xl border border-gray-700 bg-[#15202b] shadow-xl"
        >
          {TEXT_SIZES.map((s) => {
            const on = (active ?? "md") === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={on}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(s.id);
                  setOpen(false);
                }}
                className={`flex min-h-11 w-full items-center justify-between px-3 text-left text-xs font-bold ${
                  on ? "bg-aha/15 text-aha" : "text-white hover:bg-white/5"
                }`}
              >
                <span>Aa {s.label}</span>
                {on ? <span className="text-[10px]">選択中</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
