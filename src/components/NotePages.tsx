"use client";

import { LatexText } from "@/lib/latex";
import { isDisplayImageSrc } from "@/lib/problem-images";
import type { NotePage } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

const PATHS = [
  "M12 40 C 40 20, 80 80, 120 50 S 180 20, 220 70",
  "M20 90 C 60 110, 90 40, 150 80 S 210 120, 240 60",
  "M30 30 Q 100 140 200 40 T 280 90",
  "M8 70 C 70 10, 90 130, 170 50 S 250 10, 300 80",
  "M16 110 C 50 60, 140 60, 180 110 S 260 150, 290 90",
];

const SWIPE_PX = 48;

function pageFrameStyle(page: NotePage): CSSProperties | undefined {
  if (isDisplayImageSrc(page.image)) return undefined;
  if (page.contentHeight) return { minHeight: page.contentHeight };
  return undefined;
}

function NoteMeta({ title, memo }: { title?: string; memo?: string }) {
  if (!title && !memo) return null;
  return (
    <div className="relative z-10 max-w-full border-b border-white/10 px-3 pb-2 pt-3">
      {title ? (
        <h2 className="max-w-full text-[15px] font-black leading-snug text-white [overflow-wrap:anywhere] [word-break:break-word]">
          {title}
        </h2>
      ) : null}
      {memo ? (
        <p
          className={`max-w-full whitespace-pre-wrap text-[13px] leading-relaxed text-[#c9d1d9] [overflow-wrap:anywhere] [word-break:break-word] ${
            title ? "mt-1" : ""
          }`}
        >
          {memo}
        </p>
      ) : null}
    </div>
  );
}

function PageBody({
  page,
  index,
  title,
  memo,
}: {
  page: NotePage;
  index: number;
  title?: string;
  memo?: string;
}) {
  const imageSrc = isDisplayImageSrc(page.image) ? page.image : undefined;
  const showMeta = index === 0 && Boolean(title || memo);
  return (
    <div
      className="paper-grid relative w-full max-w-full overflow-hidden rounded-2xl border border-gray-800 bg-[#0b1220]"
      style={pageFrameStyle(page)}
    >
      {showMeta ? <NoteMeta title={title} memo={memo} /> : null}
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={`ノート ${index + 1}ページ`}
          className="pointer-events-none block h-auto w-full max-w-full select-none rounded-2xl"
          draggable={false}
        />
      ) : (
        <>
          {!page.latex && (
            <svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 320 208">
              <path
                d={PATHS[page.doodle % PATHS.length]}
                fill="none"
                stroke={index % 2 ? "#CCFF00" : "#A855F7"}
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
          <div className="relative z-10 flex min-h-[8rem] max-w-full flex-col overflow-hidden p-3">
            {page.latex ? (
              <div className="mt-1 max-w-full [overflow-wrap:anywhere] [word-break:break-word]">
                <LatexText text={page.latex} className="max-w-full text-sm" />
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export function NotePages({
  pages,
  className = "",
  title,
  memo,
}: {
  pages: NotePage[];
  className?: string;
  title?: string;
  memo?: string;
}) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(0);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const pagesKey = pages.map((p) => p.id).join("|");

  useEffect(() => {
    setIndex(0);
    setDir(0);
  }, [pagesKey]);

  if (!pages.length) return null;

  const last = pages.length - 1;
  const current = Math.min(index, last);
  const page = pages[current] ?? pages[0];
  const multi = pages.length > 1;

  const go = (next: number, fromDir: number) => {
    const clamped = Math.max(0, Math.min(last, next));
    if (clamped === current) return;
    setDir(fromDir);
    setIndex(clamped);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!multi || (e.pointerType === "mouse" && e.button !== 0)) return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!multi || !start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) go(current + 1, 1);
    else go(current - 1, -1);
  };

  return (
    <div className={`mt-3 ${className}`}>
      <div
        className="relative touch-pan-y overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={page.id}
            custom={dir}
            initial={{ x: dir === 0 ? 0 : dir * 36, opacity: 0.35 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir === 0 ? 0 : dir * -36, opacity: 0.35 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <PageBody page={page} index={current} title={title} memo={memo} />
          </motion.div>
        </AnimatePresence>

        {multi && (
          <>
            <button
              type="button"
              aria-label="前のページ"
              disabled={current === 0}
              onClick={(e) => {
                e.stopPropagation();
                go(current - 1, -1);
              }}
              className="absolute left-1.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/65 text-white shadow-lg backdrop-blur-sm disabled:opacity-25"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="次のページ"
              disabled={current === last}
              onClick={(e) => {
                e.stopPropagation();
                go(current + 1, 1);
              }}
              className="absolute right-1.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/65 text-white shadow-lg backdrop-blur-sm disabled:opacity-25"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {multi && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted">
            {current + 1}/{pages.length}
          </span>
          <div className="flex items-center gap-1.5">
            {pages.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-label={`${i + 1}ページ目`}
                aria-current={i === current ? "true" : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  go(i, i > current ? 1 : -1);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-4 bg-aha" : "w-1.5 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
