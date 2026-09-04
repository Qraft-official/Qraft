"use client";

import { getAppDialogPending, settleAppDialog, subscribeAppDialog } from "@/lib/app-dialog";
import { useEffect, useId, useRef, useState } from "react";

export function AppDialogHost() {
  const [, setTick] = useState(0);
  const titleId = useId();
  const descId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pending = getAppDialogPending();

  useEffect(() => subscribeAppDialog(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (!pending) return;
    const t = window.setTimeout(() => {
      if (pending.request.kind === "prompt") inputRef.current?.focus();
      else if (pending.request.kind === "confirm" && pending.request.destructive) {
        cancelRef.current?.focus();
      } else {
        confirmRef.current?.focus();
      }
    }, 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        settleAppDialog(pending.request.kind === "confirm" ? false : null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [pending]);

  if (!pending) return null;
  const req = pending.request;
  const destructive = req.kind === "confirm" && req.destructive;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="presentation"
      onClick={() => settleAppDialog(req.kind === "confirm" ? false : null)}
    >
      <div
        role={destructive ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-sm rounded-2xl border border-gray-800 bg-[#15202b] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-black text-white">
          {req.title}
        </h2>
        <p id={descId} className="mt-2 text-sm leading-relaxed text-muted">
          {req.message}
        </p>
        {req.kind === "prompt" && (
          <input
            ref={inputRef}
            defaultValue={req.defaultValue}
            placeholder={req.placeholder}
            className="mt-3 w-full rounded-xl border border-gray-700 bg-black px-3 py-2.5 text-sm outline-none focus-visible:border-aha"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                settleAppDialog(e.currentTarget.value);
              }
            }}
          />
        )}
        <div className="mt-4 flex gap-2">
          <button
            ref={cancelRef}
            type="button"
            className="min-h-11 flex-1 rounded-full border border-gray-700 px-3 text-sm font-bold text-white"
            onClick={() => settleAppDialog(req.kind === "confirm" ? false : null)}
          >
            {req.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`min-h-11 flex-1 rounded-full px-3 text-sm font-black ${
              destructive ? "bg-red-500 text-white" : "bg-aha text-black"
            }`}
            onClick={() => {
              if (req.kind === "prompt") {
                settleAppDialog(inputRef.current?.value ?? "");
              } else {
                settleAppDialog(true);
              }
            }}
          >
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
