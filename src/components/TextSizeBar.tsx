"use client";

import { TEXT_SIZES, type TextSizeId } from "@/lib/text-size";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SAMPLE_PX: Record<TextSizeId, number> = { sm: 12, md: 16, lg: 20, xl: 26 };

function useWideViewport() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return wide;
}

function SizeOptions({
  active,
  onPick,
}: {
  active?: TextSizeId;
  onPick: (size: TextSizeId) => void;
}) {
  const fromPointer = useRef(false);
  return (
    <div role="listbox" aria-label="文字サイズ">
      {TEXT_SIZES.map((s) => {
        const on = (active ?? "md") === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="option"
            aria-selected={on}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              fromPointer.current = true;
              onPick(s.id);
            }}
            onClick={(e) => {
              e.preventDefault();
              if (fromPointer.current) {
                fromPointer.current = false;
                return;
              }
              onPick(s.id);
            }}
            className={`flex min-h-12 w-full items-center gap-3 px-3 text-left ${
              on ? "bg-aha/15 text-aha" : "text-white hover:bg-white/5"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                on ? "border-aha" : "border-gray-500"
              }`}
              aria-hidden
            >
              {on ? <span className="h-2.5 w-2.5 rounded-full bg-aha" /> : null}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span style={{ fontSize: SAMPLE_PX[s.id] }} className="font-bold leading-tight">
                {s.label}
              </span>
              <span className="text-[10px] text-muted">{SAMPLE_PX[s.id]}px</span>
            </span>
            {on ? <span className="text-[10px] font-bold">選択中</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TextSizeBar({
  onPick,
  active,
  compact = false,
}: {
  onPick: (size: TextSizeId) => void;
  active?: TextSizeId;
  compact?: boolean;
}) {
  const current = TEXT_SIZES.find((s) => s.id === (active ?? "md")) ?? TEXT_SIZES[1];
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const openedByPointer = useRef(false);
  const wide = useWideViewport();
  const titleId = useId();
  const [pos, setPos] = useState({ top: 8, left: 8, width: 220 });

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !wide) return;
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuW = 220;
    const menuH = 260;
    const pad = 8;
    let left = r.left;
    if (left + menuW > window.innerWidth - pad) left = window.innerWidth - menuW - pad;
    if (left < pad) left = pad;
    let top = r.bottom + 6;
    if (top + menuH > window.innerHeight - pad) top = r.top - menuH - 6;
    if (top < pad) top = pad;
    setPos({ top, left, width: menuW });
  }, [open, wide]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDoc);
    };
  }, [open]);

  if (!compact) {
    return (
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label="文字サイズ">
        {TEXT_SIZES.map((s) => {
          const on = (active ?? "md") === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onPick(s.id);
              }}
              aria-pressed={on}
              aria-label={`文字サイズ ${s.label}${on ? "（選択中）" : ""}`}
              className={`min-h-11 min-w-11 rounded-lg border px-1.5 text-[10px] font-bold ${
                on ? "border-aha bg-aha/15 text-aha" : "border-gray-700 bg-white/5 text-white hover:border-aha"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    );
  }

  const menu =
    open && mounted
      ? createPortal(
          wide ? (
            <div
              ref={menuRef}
              role="dialog"
              aria-labelledby={titleId}
              className="fixed z-[95] overflow-hidden rounded-xl border border-gray-700 bg-[#15202b] shadow-xl"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <p id={titleId} className="sr-only">
                文字サイズ
              </p>
              <SizeOptions
                active={active}
                onPick={(size) => {
                  onPick(size);
                  setOpen(false);
                }}
              />
            </div>
          ) : (
            <div className="fixed inset-0 z-[95] flex items-end justify-center">
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label="閉じる"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setOpen(false);
                }}
              />
              <div
                ref={menuRef}
                role="dialog"
                aria-labelledby={titleId}
                className="relative w-full max-w-lg rounded-t-3xl border border-gray-800 bg-[#15202b] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl"
              >
                <p id={titleId} className="px-4 pb-1 pt-2 text-sm font-black">
                  文字サイズ
                </p>
                <SizeOptions
                  active={active}
                  onPick={(size) => {
                    onPick(size);
                    setOpen(false);
                  }}
                />
              </div>
            </div>
          ),
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openedByPointer.current = true;
          setOpen((v) => !v);
        }}
        onClick={() => {
          if (openedByPointer.current) {
            openedByPointer.current = false;
            return;
          }
          setOpen((v) => !v);
        }}
        className="relative z-10 flex h-11 w-11 items-center justify-center rounded-lg border border-gray-700 bg-white/5 text-white hover:border-aha"
        aria-label={`文字サイズ ${current.label}。選択中の文字、またはこれから入力する文字に適用`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`文字サイズ: ${current.label}（選択範囲→その文字 / 未選択→以降の入力）`}
      >
        <span className="text-[13px] font-black leading-none">Aa</span>
        <span className="sr-only">現在 {current.label}</span>
      </button>
      {menu}
    </div>
  );
}
