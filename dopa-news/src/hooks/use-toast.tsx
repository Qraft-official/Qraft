"use client";

import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Check, Info } from "lucide-react";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const TONE_STYLE: Record<ToastTone, { ring: string; icon: ReactNode }> = {
  success: {
    ring: "border-[#4ef5a3]/40 text-[#4ef5a3]",
    icon: <Check size={15} strokeWidth={2.6} />,
  },
  error: {
    ring: "border-[#ff5c7a]/45 text-[#ff5c7a]",
    icon: <AlertTriangle size={15} strokeWidth={2.4} />,
  },
  info: {
    ring: "border-[#35dcff]/40 text-[#35dcff]",
    icon: <Info size={15} strokeWidth={2.4} />,
  },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center pad-safe-top">
        <div className="mt-3 flex w-full max-w-[440px] flex-col gap-2 px-4">
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className={`glass pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-[13px] font-medium ${TONE_STYLE[t.tone].ring}`}
              >
                <span className="shrink-0">{TONE_STYLE[t.tone].icon}</span>
                <span className="text-fg leading-snug">{t.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
