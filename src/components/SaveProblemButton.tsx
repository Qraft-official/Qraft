"use client";

import { SAVE_CATEGORIES, saveCategoryLabel, type SaveCategory } from "@/lib/learn";
import { isProblemUuid } from "@/lib/difficulty";
import { useApp } from "@/lib/store";
import { Bookmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SaveProblemButton({ problemId }: { problemId: string }) {
  const { saved, toggleSave, setSaveCategory } = useApp();
  const cat = saved[problemId];
  const on = Boolean(cat);
  const [sheet, setSheet] = useState(false);
  const hold = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hold.current) window.clearTimeout(hold.current);
    };
  }, []);

  if (!isProblemUuid(problemId)) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={on ? `保存済み（${saveCategoryLabel(cat)}）` : "保存する"}
        aria-pressed={on}
        title={on ? "保存済み" : "保存"}
        className={`flex min-h-11 min-w-11 items-center justify-center ${on ? "text-aha" : "text-muted hover:text-aha"}`}
        onClick={() => void toggleSave(problemId)}
        onContextMenu={(e) => {
          e.preventDefault();
          setSheet(true);
        }}
        onPointerDown={() => {
          hold.current = window.setTimeout(() => setSheet(true), 480);
        }}
        onPointerUp={() => {
          if (hold.current) window.clearTimeout(hold.current);
        }}
        onPointerLeave={() => {
          if (hold.current) window.clearTimeout(hold.current);
        }}
      >
        <Bookmark
          size={18}
          strokeWidth={on ? 2.4 : 2}
          fill={on ? "currentColor" : "none"}
          className={on ? "drop-shadow-[0_0_6px_rgba(204,255,0,0.45)]" : undefined}
        />
      </button>
      {sheet && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 sm:items-center"
          role="presentation"
          onClick={() => setSheet(false)}
        >
          <div
            role="dialog"
            aria-label="保存の分類"
            className="w-full max-w-sm rounded-t-3xl border border-gray-800 bg-[#15202b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-black">保存する分類</p>
            <div className="mt-3 grid gap-2">
              {SAVE_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`min-h-11 rounded-full text-sm font-bold ${
                    cat === c.id ? "bg-aha text-black" : "border border-gray-700 text-white"
                  }`}
                  onClick={() => {
                    void setSaveCategory(problemId, c.id as SaveCategory);
                    setSheet(false);
                  }}
                >
                  {c.label}
                </button>
              ))}
              {on && (
                <button
                  type="button"
                  className="min-h-11 text-sm font-bold text-muted"
                  onClick={() => {
                    void toggleSave(problemId);
                    setSheet(false);
                  }}
                >
                  保存を解除
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
