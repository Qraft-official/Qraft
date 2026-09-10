"use client";

import { PREMIUM_REACTION_LABELS, PREMIUM_REACTIONS } from "@/lib/constants";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

export function ReactionPicker({
  open,
  onClose,
  selected,
  onPick,
  anchorRef,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  selected?: string;
  onPick: (emoji: string) => void;
  anchorRef?: RefObject<HTMLElement | null>;
  busy?: boolean;
  error?: string;
}) {
  const [wide, setWide] = useState(false);
  const [pos, setPos] = useState({ top: 80, left: 16 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

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
      const menuW = Math.min(360, window.innerWidth - 16);
      const menuH = 280;
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
    const focusables = () =>
      Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    const t = window.setTimeout(() => focusables()[0]?.focus(), 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (i <= 0) {
          e.preventDefault();
          items[items.length - 1]?.focus();
        }
      } else if (i === items.length - 1) {
        e.preventDefault();
        items[0]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const grid = (
    <div className="grid w-full max-w-full grid-cols-4 gap-1 px-3 pb-3 sm:grid-cols-5 md:grid-cols-6">
      {PREMIUM_REACTIONS.map((emoji) => {
        const label = PREMIUM_REACTION_LABELS[emoji];
        const on = selected === emoji;
        return (
          <button
            key={emoji}
            type="button"
            disabled={busy}
            onClick={() => onPick(emoji)}
            className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-xl px-0.5 py-1.5 disabled:opacity-50 ${
              on ? "bg-aha/15 ring-1 ring-aha/70" : "hover:bg-white/10"
            }`}
            aria-label={label ? `${label} ${emoji}` : `リアクション ${emoji}`}
            aria-pressed={on}
          >
            <span className="text-[1.45rem] leading-none" aria-hidden>
              {emoji}
            </span>
            <span className="mt-1 max-w-full truncate text-[10px] font-bold text-[#b8c0c8]">
              {label}
            </span>
          </button>
        );
      })}
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
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reaction-picker-title"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              style={{
                top: pos.top,
                left: pos.left,
                width: Math.min(360, typeof window !== "undefined" ? window.innerWidth - 16 : 360),
              }}
              className="absolute max-h-[min(70vh,28rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-gray-700 bg-[#15202b] shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 pt-2">
                <p id="reaction-picker-title" className="text-sm font-black">
                  リアクションを追加
                </p>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-white/10"
                  aria-label="閉じる"
                  onClick={onClose}
                >
                  <X size={18} />
                </button>
              </div>
              {error ? <p className="px-3 pb-1 text-xs text-red-400">{error}</p> : null}
              {grid}
            </motion.div>
          ) : (
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reaction-picker-title"
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 72 || info.velocity.y > 600) onClose();
              }}
              className="absolute inset-x-0 bottom-0 max-h-[min(78vh,32rem)] overflow-x-hidden overflow-y-auto rounded-t-[24px] border border-gray-800 bg-[#15202b] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex cursor-grab justify-center pt-2 active:cursor-grabbing"
                aria-hidden
                onPointerDown={(e) => dragControls.start(e)}
              >
                <span className="h-1 w-10 rounded-full bg-gray-600" />
              </div>
              <div className="flex items-center justify-between px-4 pt-1">
                <p id="reaction-picker-title" className="text-sm font-black">
                  リアクションを追加
                </p>
                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-white/10"
                  aria-label="閉じる"
                  onClick={onClose}
                >
                  <X size={18} />
                </button>
              </div>
              {error ? <p className="px-4 pb-1 text-xs text-red-400">{error}</p> : null}
              {grid}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
