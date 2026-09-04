"use client";

import type { ProblemMode } from "@/lib/types";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

const MODE_HELP: Record<
  ProblemMode,
  { title: string; body: string; selected: string; helpPos: string }
> = {
  question: {
    title: "教えてQrafter!",
    body: "解き方やアドバイスを求めたい時に選ぶモードです。",
    selected: "border-aha bg-aha/10 text-aha",
    helpPos: "left-0",
  },
  challenge: {
    title: "Challenger",
    body: "自分で作成した問題にみんなで挑戦してもらうモードです。",
    selected: "border-orange-400 bg-orange-500/10 text-orange-300",
    helpPos: "left-1/2 -translate-x-1/2",
  },
  aha: {
    title: "Aha!",
    body: "小学校6年生までの知識で解けるひらめき・パズル要素のある問題モードです。",
    selected: "border-lime-400 text-lime-400 bg-lime-400/10",
    helpPos: "right-0",
  },
};

const MODE_ORDER: ProblemMode[] = ["question", "challenge", "aha"];

export function ProblemModePicker({
  value,
  onChange,
  correctAnswer,
  onCorrectAnswer,
}: {
  value: ProblemMode;
  onChange: (mode: ProblemMode) => void;
  correctAnswer: string;
  onCorrectAnswer: (value: string) => void;
}) {
  const [modeHelp, setModeHelp] = useState<ProblemMode | null>(null);

  return (
    <div className="relative border-b border-gray-800 px-3 py-1 md:px-4">
      {modeHelp && (
        <button
          type="button"
          className="absolute inset-0 z-20 cursor-default"
          aria-label="説明を閉じる"
          onClick={() => setModeHelp(null)}
        />
      )}
      <div className="grid grid-cols-3 gap-1.5 md:gap-2">
      {MODE_ORDER.map((id) => {
        const meta = MODE_HELP[id];
        const on = value === id;
        return (
          <div key={id} className="relative z-[21] flex min-w-0 items-stretch">
            <button
              type="button"
              onClick={() => onChange(id)}
              className={`min-w-0 flex-1 rounded-l-xl border border-r-0 px-1.5 py-1.5 text-left sm:px-2 ${
                on ? meta.selected : "border-gray-800 bg-transparent text-white"
              }`}
            >
              <p className="truncate text-[10px] font-bold sm:text-[11px]">{meta.title}</p>
            </button>
            <button
              type="button"
              aria-label={`${meta.title}の説明`}
              aria-expanded={modeHelp === id}
              onClick={() => setModeHelp((v) => (v === id ? null : id))}
              className={`flex items-center rounded-r-xl border border-l-0 px-1 ${
                on ? `${meta.selected} text-white/70` : "border-gray-800 bg-transparent text-muted"
              }`}
            >
              <HelpCircle size={14} strokeWidth={2} />
            </button>
            {modeHelp === id && (
              <div
                role="dialog"
                className={`absolute top-[calc(100%+6px)] z-30 w-[min(18rem,calc(100vw-2.5rem))] rounded-xl border border-gray-700 bg-[#1a222c] px-3 py-2.5 text-left shadow-xl ${meta.helpPos}`}
              >
                <p className="text-[11px] font-bold text-white">{meta.title}</p>
                <p className="mt-1 text-[11px] leading-snug text-[#b8c0c8]">{meta.body}</p>
              </div>
            )}
          </div>
        );
      })}
      {value === "challenge" && (
        <div className="col-span-3">
          <input
            value={correctAnswer}
            onChange={(e) => onCorrectAnswer(e.target.value)}
            placeholder="正解"
            className="w-full border-0 border-b border-gray-800 bg-transparent px-0 py-2 text-sm outline-none"
          />
          <p className="mt-0.5 text-[11px] text-muted">※単位は書かなくていいです</p>
        </div>
      )}
      </div>
    </div>
  );
}
