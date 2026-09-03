"use client";

import {
  applyMathfieldModePolicy,
  attachJapaneseTextMode,
  attachMultilineMathfield,
  attachPlainTextMenu,
  enableMathfieldWrapping,
  insertMathNewline,
  insertPlainTextIntoMathfield,
  setMathfieldInputMode,
  setMathfieldOsKeyboard,
} from "@/lib/mathlive";
import type { MathfieldElement } from "mathlive";
import { Maximize2, Menu } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { type InputMode, type MathKeyAction, MathKeyboard } from "./MathKeyboard";

export function VisualMathEditor({
  value,
  onChange,
  header,
  footer,
  expanded,
  onToggleExpand,
  compact = false,
  showChrome,
  showKeyboard = true,
}: {
  value: string;
  onChange: (v: string) => void;
  header?: ReactNode;
  footer?: ReactNode;
  expanded?: boolean;
  onToggleExpand?: () => void;
  compact?: boolean;
  showChrome?: boolean;
  showKeyboard?: boolean;
}) {
  const fieldRef = useRef<MathfieldElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("math");
  const inputModeRef = useRef<InputMode>("math");
  inputModeRef.current = inputMode;

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
    enableMathfieldWrapping(mf);
    attachPlainTextMenu(mf);
    const detachMultiline = attachMultilineMathfield(mf);
    const detachJp = attachJapaneseTextMode(mf, (mode) => {
      inputModeRef.current = mode;
      setInputMode(mode);
    });

    const sync = () => onChangeRef.current(mf.getValue("latex"));
    const keepVkHidden = () => window.mathVirtualKeyboard?.hide();
    const onFocusIn = () => {
      keepVkHidden();
      enableMathfieldWrapping(mf);
      applyMathfieldModePolicy(mf, inputModeRef.current);
      if (inputModeRef.current === "text" && mf.mode !== "text") {
        setMathfieldInputMode(mf, "text", { focus: false });
      }
      setMathfieldOsKeyboard(mf, inputModeRef.current === "text");
    };
    const onFocusOut = (e: Event) => {
      const fe = e as FocusEvent;
      const next = fe.relatedTarget;
      if (next instanceof Node && (mf.contains(next) || mf.shadowRoot?.contains(next))) return;
      keepVkHidden();
      // Keep the user-selected [文]/[√x] mode; do not fall back to math + VK.
    };
    let revertingMode = false;
    const onModeChange = () => {
      if (revertingMode) return;
      if (inputModeRef.current !== "text" || mf.mode === "text") return;
      revertingMode = true;
      try {
        setMathfieldInputMode(mf, "text", { focus: false });
      } finally {
        revertingMode = false;
      }
    };
    mf.addEventListener("input", sync);
    mf.addEventListener("focusin", onFocusIn);
    mf.addEventListener("focusout", onFocusOut);
    mf.addEventListener("mode-change", onModeChange);
    if (value && mf.value !== value) mf.value = value;

    return () => {
      detachMultiline();
      detachJp();
      mf.removeEventListener("input", sync);
      mf.removeEventListener("focusin", onFocusIn);
      mf.removeEventListener("focusout", onFocusOut);
      mf.removeEventListener("mode-change", onModeChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    const mf = fieldRef.current;
    if (!mf || !ready) return;
    if (mf.getValue("latex") !== value) mf.value = value;
  }, [ready, value]);

  const [menuOpen, setMenuOpen] = useState(false);

  const applyInputMode = (mode: InputMode) => {
    inputModeRef.current = mode;
    setInputMode(mode);
    const mf = fieldRef.current;
    if (!mf) return;
    applyMathfieldModePolicy(mf, mode);
    setMathfieldInputMode(mf, mode);
    if (mode === "text") {
      requestAnimationFrame(() => {
        const el = fieldRef.current;
        if (!el) return;
        applyMathfieldModePolicy(el, "text");
        setMathfieldInputMode(el, "text");
      });
    } else {
      window.mathVirtualKeyboard?.hide();
    }
  };

  const insertVisual = (latex: string) => {
    const mf = fieldRef.current;
    if (!mf) return;
    mf.focus();
    const needsMath = /[\\{}^_]/.test(latex);
    if (needsMath && inputModeRef.current === "text") {
      setMathfieldOsKeyboard(mf, false);
      setMathfieldInputMode(mf, "math");
      inputModeRef.current = "math";
      setInputMode("math");
    }
    mf.insert(latex, {
      focus: true,
      format: inputModeRef.current === "text" && !needsMath ? "plain-text" : "latex",
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

  const chrome = showChrome ?? !expanded;
  const fieldMax = "max-h-[360px] w-full min-w-0 sm:max-h-[28rem]";

  return (
    <div className={`flex min-h-0 min-w-0 w-full flex-col ${expanded ? "flex-1" : ""}`}>
      <div className={expanded ? "flex min-h-0 min-w-0 w-full flex-1 flex-col" : compact ? "w-full min-w-0 pt-1" : "w-full min-w-0 px-3 pt-2 sm:px-4"}>
        {header}
        {chrome && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold tracking-wide text-muted">
            視覚数式エディタ · 枠をタップして中に入力
          </p>
          <div className="flex items-center gap-1">
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="rounded-md p-1 text-muted hover:bg-white/10 hover:text-white"
                aria-label="拡大"
              >
                <Maximize2 size={16} />
              </button>
            )}
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
        </div>
        )}
        {!ready ? (
          <div className={`flex items-center justify-center overflow-y-auto rounded-xl border border-gray-800 bg-panel text-sm text-muted ${expanded ? "min-h-0 flex-1" : `h-[8rem] ${fieldMax}`}`}>
            数式エディタを読み込み中…
          </div>
        ) : (
          <div className={expanded ? "flex min-h-0 flex-1 flex-col overflow-hidden" : `${fieldMax} overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]`}>
            <math-field
              ref={(el) => {
                fieldRef.current = el as MathfieldElement | null;
              }}
              className={`aha-mathfield aha-mathfield-visual w-full min-w-0 ${expanded ? "aha-mathfield-visual-expanded flex-1" : ""}`}
              default-mode="math"
              smart-mode="true"
            />
          </div>
        )}
        {!expanded && footer && <div className="mt-2 min-w-0 shrink-0 pb-20 sm:pb-2">{footer}</div>}
      </div>
      {showKeyboard && (
        <MathKeyboard
          onAction={handleKeyboardClick}
          inputMode={inputMode}
          onInputModeChange={applyInputMode}
        />
      )}
    </div>
  );
}
