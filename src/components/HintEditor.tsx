"use client";

import { HINT_MAX } from "@/lib/learn";

export function HintEditor({
  hints,
  onChange,
}: {
  hints: string[];
  onChange: (next: string[]) => void;
}) {
  const rows = [0, 1, 2].map((i) => hints[i] ?? "");
  return (
    <div className="border-b border-gray-800 px-3 py-2 md:px-4">
      <p className="text-xs font-bold text-muted">段階ヒント（任意 · 最大{HINT_MAX}）</p>
      {rows.map((value, i) => (
        <input
          key={i}
          value={value}
          onChange={(e) => {
            const next = [...rows];
            next[i] = e.target.value;
            onChange(next);
          }}
          placeholder={`ヒント${i + 1}`}
          className="mt-1.5 w-full border-0 border-b border-gray-800 bg-transparent py-2 text-sm outline-none"
        />
      ))}
    </div>
  );
}
