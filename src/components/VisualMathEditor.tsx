"use client";

import type { MathfieldElement } from "mathlive";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { type MathKeyAction, MathKeyboard } from "./MathKeyboard";

export function VisualMathEditor({
  value,
  onChange,
  header,
  footer,
}: {
  value: string;
  onChange: (v: string) => void;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  const fieldRef = useRef<MathfieldElement | null>(null);
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
    if (!mf) return;

    mf.mathVirtualKeyboardPolicy = "manual";
    mf.smartFence = true;
    mf.defaultMode = "math";
    window.mathVirtualKeyboard?.hide();

    const sync = () => onChangeRef.current(mf.getValue("latex"));
    const keepVkHidden = () => window.mathVirtualKeyboard?.hide();
    mf.addEventListener("input", sync);
    mf.addEventListener("focusin", keepVkHidden);
    if (value && mf.value !== value) mf.value = value;
    mf.focus();

    return () => {
      mf.removeEventListener("input", sync);
      mf.removeEventListener("focusin", keepVkHidden);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    const mf = fieldRef.current;
    if (!mf || !ready) return;
    if (mf.getValue("latex") !== value) mf.value = value;
  }, [ready, value]);

  const insertVisual = (latex: string) => {
    const mf = fieldRef.current;
    if (!mf) return;
    mf.focus();
    mf.insert(latex, {
      focus: true,
      format: "latex",
      insertionMode: "replaceSelection",
      selectionMode: "placeholder",
      scrollIntoView: true,
    });
    onChangeRef.current(mf.getValue("latex"));
  };

  const handleKeyboardClick = (action: MathKeyAction) => {
    const mf = fieldRef.current;
    if (!mf) return;
    mf.focus();
    window.mathVirtualKeyboard?.hide();

    if (action.type === "backspace") {
      mf.executeCommand("deleteBackward");
      onChangeRef.current(mf.getValue("latex"));
      return;
    }
    if (action.type === "enter") {
      mf.insert("\\\\", {
        focus: true,
        format: "latex",
        selectionMode: "after",
      });
      onChangeRef.current(mf.getValue("latex"));
      return;
    }
    insertVisual(action.text);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pt-2">
        {header}
        <p className="mb-1.5 text-[10px] font-bold tracking-wide text-muted">
          視覚数式エディタ · 枠をタップして中に入力
        </p>
        {!ready ? (
          <div className="flex min-h-[10rem] flex-1 items-center justify-center rounded-xl border border-gray-800 bg-panel text-sm text-muted">
            数式エディタを読み込み中…
          </div>
        ) : (
          <math-field
            ref={(el) => {
              fieldRef.current = el as MathfieldElement | null;
            }}
            className="aha-mathfield aha-mathfield-visual min-h-[10rem] w-full min-w-0 flex-1 overflow-auto"
          />
        )}
        {footer && <div className="mt-2 min-w-0 shrink-0 pb-2">{footer}</div>}
      </div>
      <MathKeyboard onAction={handleKeyboardClick} />
    </div>
  );
}
