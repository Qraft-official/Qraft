"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  /** Tall sheets scroll internally instead of growing past the viewport. */
  maxHeight?: string;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = "86dvh",
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Screens like the Dopa Map are `position: fixed`, which creates a stacking
  // context that would trap the sheet beneath the bottom nav and clip it
  // against `overflow: hidden`. Portalling to the body avoids both.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 h-full w-full cursor-default bg-black/65 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose();
            }}
            className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[var(--app-max-width)] rounded-t-[26px] border-t border-line bg-ink-800 shadow-[0_-18px_50px_-20px_rgba(0,0,0,0.9)]"
            style={{ maxHeight }}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <span className="h-1 w-10 rounded-full bg-white/18" />
            </div>
            {(title || subtitle) && (
              <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-1">
                <div className="min-w-0">
                  {title && (
                    <h2 className="text-[17px] font-bold leading-tight text-fg">{title}</h2>
                  )}
                  {subtitle && (
                    <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="閉じる"
                  className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-fg-muted transition-colors active:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div
              className="no-scrollbar overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)]"
              style={{ maxHeight: `calc(${maxHeight} - 68px)` }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
