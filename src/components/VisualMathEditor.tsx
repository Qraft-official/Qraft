"use client";

import {
  attachMultilineMathfield,
  attachPlainTextMenu,
  insertMathNewline,
  insertPlainTextIntoMathfield,
} from "@/lib/mathlive";
import type { MathfieldElement } from "mathlive";
import { Menu } from "lucide-react";
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
    window.mathVirtualKeyboard?.hide();
    attachPlainTextMenu(mf);
    const detachMultiline = attachMultilineMathfield(mf);

    const sync = () => onChangeRef.current(mf.getValue("latex"));
    const keepVkHidden = () => window.mathVirtualKeyboard?.hide();
    mf.addEventListener("input", sync);
    mf.addEventListener("focusin", keepVkHidden);
    if (value && mf.value !== value) mf.value = value;

    return () => {
      detachMultiline();
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

  const [menuOpen, setMenuOpen] = useState(false);

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
      insertMathNewline(mf);
      onChangeRef.current(mf.getValue("latex"));
      return;
    }
    insertVisual(action.text);
  };

  return (
    <div className="flex min-w-0 w-full flex-col">
      <div className="px-3 pt-2">
        {header}
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold tracking-wide text-muted">
            視覚数式エディタ · 枠をタップして中に入力
          </p>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-md p-1 text-muted hover:bg-white/10 hover:text-white"
              aria-label="エディタメニュー"
              aria-expanded={menuOpen}
            >
              <Menu size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-gray-700 bg-[#15202b] shadow-xl">
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    const mf = fieldRef.current;
                    if (mf) {
                      insertPlainTextIntoMathfield(mf);
                      onChangeRef.current(mf.getValue("latex"));
                    }
                  }}
                >
                  テキストを入力（通常の文章入力）
                </button>
              </div>
            )}
          </div>
        </div>
        {!ready ? (
          <div className="flex min-h-[10rem] items-center justify-center rounded-xl border border-gray-800 bg-panel text-sm text-muted">
            数式エディタを読み込み中…
          </div>
        ) : (
          <math-field
            ref={(el) => {
              fieldRef.current = el as MathfieldElement | null;
            }}
            className="aha-mathfield aha-mathfield-visual min-h-[10rem] w-full min-w-0"
            default-mode="math"
            smart-mode="true"
          />
        )}
        {footer && <div className="mt-2 min-w-0 shrink-0 pb-2">{footer}</div>}
      </div>
      <MathKeyboard onAction={handleKeyboardClick} />
    </div>
  );
}
