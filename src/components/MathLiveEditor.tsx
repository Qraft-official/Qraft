"use client";

import type { MathfieldElement } from "mathlive";
import { type ReactNode, useEffect, useRef, useState } from "react";

export function MathLiveEditor({
  value,
  onChange,
  footer,
  fill = true,
}: {
  value: string;
  onChange: (v: string) => void;
  footer?: ReactNode;
  /** When false, grow with content so a parent scroller can show quoted problems above. */
  fill?: boolean;
}) {
  const fieldRef = useRef<MathfieldElement | null>(null);
  const kbHostRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("mathlive").then((ml) => {
      if (cancelled) return;
      ml.MathfieldElement.fontsDirectory = "";
      ml.MathfieldElement.soundsDirectory = null;
      setReady(true);
    });
    return () => {
      cancelled = true;
      window.mathVirtualKeyboard?.hide();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const mf = fieldRef.current;
    const host = kbHostRef.current;
    if (!mf || !host) return;

    mf.mathVirtualKeyboardPolicy = "manual";
    mf.smartFence = true;
    const kb = window.mathVirtualKeyboard;
    if (kb) {
      kb.container = host;
      kb.show({ animate: false });
    }

    const onIn = () => window.mathVirtualKeyboard?.show();
    const onInput = () => onChangeRef.current(mf.value);
    mf.addEventListener("focusin", onIn);
    mf.addEventListener("input", onInput);
    if (mf.value !== value) mf.value = value;
    mf.focus();

    return () => {
      mf.removeEventListener("focusin", onIn);
      mf.removeEventListener("input", onInput);
    };
    // value is synced in a separate effect so the field is only wired once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    const mf = fieldRef.current;
    if (mf && mf.value !== value) mf.value = value;
  }, [value]);

  if (!ready) {
    return (
      <div className={`flex items-center justify-center text-sm text-muted ${fill ? "min-h-0 flex-1" : "min-h-[7.5rem]"}`}>
        数式キーボードを読み込み中…
      </div>
    );
  }

  return (
    <div
      className={
        fill
          ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          : "flex min-w-0 flex-col"
      }
    >
      <math-field
        ref={(el) => {
          fieldRef.current = el as MathfieldElement | null;
        }}
        className="aha-mathfield min-h-[7.5rem] min-w-0 w-full shrink-0 overflow-auto"
      />
      {footer && <div className="mt-2 min-w-0 shrink-0">{footer}</div>}
      <div
        ref={kbHostRef}
        className={
          fill
            ? "aha-ml-kb mt-2 min-h-0 min-w-0 flex-1 overflow-hidden"
            : "aha-ml-kb mt-2 min-h-[14rem] min-w-0"
        }
      />
    </div>
  );
}
