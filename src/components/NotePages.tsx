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
          className="paper-grid relative h-44 w-[86%] shrink-0 snap-center overflow-hidden rounded-2xl border border-gray-800 bg-[#0b1220] sm:h-56 sm:w-[72%] md:h-72 md:w-[58%] lg:h-80 lg:w-[48%]"
        >
          {page.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.image}
              alt={`ノート ${i + 1}ページ`}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <>
              {!page.latex && (
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
              )}
              <div className="relative z-10 flex h-full flex-col overflow-y-auto p-3">
                <span className="text-[10px] text-muted">Page {i + 1}</span>
                {page.latex ? (
                  <div className="mt-2">
                    <LatexText text={page.latex} className="text-sm" />
                  </div>
                ) : null}
              </div>
            </>
          )}
          {page.image && (
            <span className="absolute left-2 top-2 z-10 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-muted">
              Page {i + 1}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
