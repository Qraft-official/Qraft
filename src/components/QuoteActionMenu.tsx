"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PenLine, Repeat2, Undo2, X } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export function QuoteActionMenu({
  open,
  onClose,
  reposted,
  onRepost,
  showQuoteSolution,
  onQuoteSolution,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  reposted: boolean;
  onRepost: () => void;
  showQuoteSolution: boolean;
  onQuoteSolution: () => void;
  anchorRef?: RefObject<HTMLElement | null>;
}) {
  const [wide, setWide] = useState(false);
  const [pos, setPos] = useState({ top: 80, left: 16 });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = anchorRef?.current;
      const menuW = 288;
      const menuH = 168;
      if (!el) {
        setPos({
          top: Math.max(16, window.innerHeight / 2 - menuH / 2),
          left: Math.max(16, window.innerWidth / 2 - menuW / 2),
        });
        return;
      }
      const r = el.getBoundingClientRect();
      let left = r.left + r.width / 2 - menuW / 2;
      left = Math.min(Math.max(8, left), window.innerWidth - menuW - 8);
      let top = r.bottom + 8;
      if (top + menuH > window.innerHeight - 12) {
        top = Math.max(8, r.top - menuH - 8);
      }
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, wide, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const actions = (
    <>
      <button
        type="button"
        onClick={() => {
          onRepost();
          onClose();
        }}
        className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5"
      >
        {reposted ? <Undo2 size={18} className="text-emerald-400" /> : <Repeat2 size={18} />}
        <span className="font-bold">{reposted ? "リポストを取り消す" : "リポスト"}</span>
      </button>
      {showQuoteSolution && (
        <button
          type="button"
          onClick={() => {
            onQuoteSolution();
            onClose();
          }}
          className="flex min-h-12 w-full items-center gap-3 border-t border-gray-800 px-4 py-3 text-left text-sm hover:bg-white/5"
        >
          <PenLine size={18} className="text-aha" />
          <span>
            <span className="block font-bold text-aha">引用して解法を投稿</span>
            <span className="text-[11px] text-muted">この問題を引用して解法を書く</span>
          </span>
        </button>
      )}
    </>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 sm:bg-black/40"
            aria-label="メニューを閉じる"
            onClick={onClose}
          />
          {wide ? (
            <motion.div
              role="dialog"
              aria-label="引用・リポスト"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              style={{ top: pos.top, left: pos.left }}
              className="absolute w-72 overflow-hidden rounded-2xl border border-gray-700 bg-[#15202b] shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </motion.div>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="引用・リポスト"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-3xl border border-gray-800 bg-[#15202b] pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 pt-3">
                <p className="text-sm font-black">引用・リポスト</p>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-white/10"
                  aria-label="閉じる"
                  onClick={onClose}
                >
                  <X size={18} />
                </button>
              </div>
              {actions}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
