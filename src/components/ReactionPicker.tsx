"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export function ReactionPicker({
  open,
  onClose,
  emojis,
  selected,
  onPick,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  emojis: readonly string[];
  selected?: string;
  onPick: (emoji: string) => void;
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
      const menuW = Math.min(288, window.innerWidth - 16);
      const menuH = 88;
      const navSafe = 88;
      if (!el) {
        setPos({
          top: Math.max(16, window.innerHeight / 2 - menuH / 2),
          left: Math.max(8, (window.innerWidth - menuW) / 2),
        });
        return;
      }
      const r = el.getBoundingClientRect();
      let left = r.left + r.width / 2 - menuW / 2;
      left = Math.min(Math.max(8, left), window.innerWidth - menuW - 8);
      let top = r.top - menuH - 8;
      if (top < 8) top = r.bottom + 8;
      if (top + menuH > window.innerHeight - navSafe) {
        top = Math.max(8, window.innerHeight - navSafe - menuH);
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

  const grid = (
    <div className="flex flex-wrap justify-center gap-1 px-3 py-3">
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onPick(emoji);
            onClose();
          }}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${
            selected === emoji ? "bg-aha/20 scale-110" : "hover:bg-white/10"
          }`}
          aria-label={`リアクション ${emoji}`}
          aria-pressed={selected === emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 sm:bg-black/40"
            aria-label="リアクションを閉じる"
            onClick={onClose}
          />
          {wide ? (
            <motion.div
              role="dialog"
              aria-label="リアクション"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              style={{ top: pos.top, left: pos.left, width: Math.min(288, typeof window !== "undefined" ? window.innerWidth - 16 : 288) }}
              className="absolute overflow-hidden rounded-2xl border border-gray-700 bg-[#15202b] shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              {grid}
            </motion.div>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="リアクション"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-3xl border border-gray-800 bg-[#15202b] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 pt-3">
                <p className="text-sm font-black">リアクション</p>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-white/10"
                  aria-label="閉じる"
                  onClick={onClose}
                >
                  <X size={18} />
                </button>
              </div>
              {grid}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
