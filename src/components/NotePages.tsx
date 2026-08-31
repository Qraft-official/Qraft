"use client";

import { LatexText } from "@/lib/latex";
import type { NotePage } from "@/lib/types";

const PATHS = [
  "M12 40 C 40 20, 80 80, 120 50 S 180 20, 220 70",
  "M20 90 C 60 110, 90 40, 150 80 S 210 120, 240 60",
  "M30 30 Q 100 140 200 40 T 280 90",
  "M8 70 C 70 10, 90 130, 170 50 S 250 10, 300 80",
  "M16 110 C 50 60, 140 60, 180 110 S 260 150, 290 90",
];

export function NotePages({ pages }: { pages: NotePage[] }) {
  return (
    <div className="aha-scroll mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
      {pages.map((page, i) => (
        <div
          key={page.id}
          className="paper-grid relative h-52 w-[78%] shrink-0 snap-center overflow-hidden rounded-2xl border border-gray-800 bg-[#0b1220]"
        >
          <svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 320 208">
            <path
              d={PATHS[page.doodle % PATHS.length]}
              fill="none"
              stroke={i % 2 ? "#CCFF00" : "#A855F7"}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d={PATHS[(page.doodle + 2) % PATHS.length]}
              fill="none"
              stroke="#22D3EE"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity={0.7}
            />
          </svg>
          <div className="relative z-10 flex h-full flex-col p-3">
            <span className="text-[10px] text-muted">Page {i + 1}</span>
            <div className="mt-auto">
              <LatexText text={`$$${page.latex}$$`} className="text-sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
