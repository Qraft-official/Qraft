"use client";

import { FONT_SIZES, fontSizeClass } from "@/lib/constants";
import { LatexText } from "@/lib/latex";
import type { FontSize } from "@/lib/types";
import { Menu } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { type InputMode, type MathKeyAction, MathKeyboard } from "./MathKeyboard";

const FORMAT = [
  { id: "h2", label: "H2", wrap: false, insert: "## " },
  { id: "bold", label: "B", wrap: true, before: "**", after: "**" },
  { id: "codei", label: "</>", wrap: true, before: "`", after: "`" },
  { id: "ul", label: "•", wrap: false, insert: "- " },
];

/** `{|}` marks the caret. `|` is stripped and not inserted. */
function splitTemplate(template: string) {
  const token = "{|}";
  const marked = template.indexOf(token);
  if (marked >= 0) {
    return { piece: template.replace(token, "{}"), offset: marked + 1 };
  }
  return { piece: template, offset: template.length };
}

export function LatexEditor({
  value,
  onChange,
  placeholder,
  tall,
  keyboard,
  header,
  footer,
  fontSize,
  onFontSizeChange,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tall?: boolean;
  keyboard?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  fontSize?: FontSize;
  onFontSizeChange?: (fs: FontSize) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(value);
  const pendingCaretRef = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [kbMode, setKbMode] = useState<InputMode>("math");

  const applyCaret = (pos: number) => {
    const el = textareaRef.current;
    if (!el) return false;
    el.focus();
    // Only set the range once the new text is actually in the DOM.
    // Clamping against a stale shorter value would push the caret past `}`.
    if (el.value.length < pos) return false;
    el.setSelectionRange(pos, pos);
    return true;
  };

  const restoreCaretAfterPaint = (pos: number) => {
    pendingCaretRef.current = pos;
    applyCaret(pos);
    requestAnimationFrame(() => {
      applyCaret(pos);
      requestAnimationFrame(() => applyCaret(pos));
    });
  };

  useLayoutEffect(() => {
    draftRef.current = value;
    const pos = pendingCaretRef.current;
    if (pos == null) return;
    applyCaret(pos);
  }, [value]);

  const insertTemplate = (template: string) => {
    const { piece, offset } = splitTemplate(template);
    const el = textareaRef.current;
    const pending = pendingCaretRef.current;
    const src = draftRef.current;
    let start: number;
    let end: number;
    if (pending != null) {
      start = end = pending;
    } else if (el) {
      start = el.selectionStart;
      end = el.selectionEnd;
    } else {
      start = end = src.length;
    }

    const next = src.slice(0, start) + piece + src.slice(end);
    const pos = start + offset;
    draftRef.current = next;
    pendingCaretRef.current = pos;

    if (el) {
      el.focus();
      el.value = next;
      el.setSelectionRange(pos, pos);
    }

    flushSync(() => {
      onChange(next);
    });

    restoreCaretAfterPaint(pos);
  };

  const handleKeyboardClick = (action: MathKeyAction) => {
    if (action.type === "backspace") {
      const el = textareaRef.current;
      const pending = pendingCaretRef.current;
      const src = draftRef.current;
      let start: number;
      let end: number;
      if (pending != null) {
        start = end = pending;
      } else if (el) {
        start = el.selectionStart;
        end = el.selectionEnd;
      } else {
        start = end = src.length;
      }
      if (start !== end) {
        insertAt(src, start, end, "", start);
        return;
      }
      if (start <= 0) return;
      insertAt(src, start - 1, start, "", start - 1);
      return;
    }
    if (action.type === "enter") {
      insertTemplate("\n");
      return;
    }
    insertTemplate(action.text);
  };

  const insertAt = (src: string, start: number, end: number, piece: string, pos: number) => {
    const next = src.slice(0, start) + piece + src.slice(end);
    draftRef.current = next;
    pendingCaretRef.current = pos;
    const el = textareaRef.current;
    if (el) {
      el.focus();
      el.value = next;
      el.setSelectionRange(pos, pos);
    }
    flushSync(() => {
      onChange(next);
    });
    restoreCaretAfterPaint(pos);
  };

  const wrapSelection = (before: string, after: string) => {
    const el = textareaRef.current;
    const src = draftRef.current;
    const start = el?.selectionStart ?? src.length;
    const end = el?.selectionEnd ?? start;
    const selected = src.slice(start, end) || "text";
    insertAt(src, start, end, `${before}${selected}${after}`, start + before.length + selected.length);
  };

  const docked = Boolean(keyboard && tall);

  return (
    <div
      className={
        docked || tall
          ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          : "min-w-0"
      }
    >
      <div
        className={`flex min-h-0 min-w-0 flex-col px-3 pt-2 ${
          docked || tall ? "flex-1 overflow-y-auto overscroll-contain" : ""
        }`}
      >
        {header}
        <div className="aha-scroll mb-1 flex shrink-0 items-center gap-1 overflow-x-auto pb-1">
          {FORMAT.map((f) => (
            <button
              key={f.id}
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() =>
                f.wrap ? wrapSelection(f.before!, f.after!) : insertTemplate(f.insert!)
              }
              className="shrink-0 rounded-lg border border-gray-700 bg-white/5 px-2 py-1 text-[11px] font-bold text-white hover:border-neon"
            >
              {f.label}
            </button>
          ))}
          {onFontSizeChange && (
            <div className="ml-1 flex items-center gap-0.5">
              {FONT_SIZES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => onFontSizeChange(f.id)}
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                    (fontSize ?? "sm") === f.id
                      ? "bg-aha text-black"
                      : "text-muted hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          <div className="relative ml-auto shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg border border-gray-700 bg-white/5 p-1 text-muted hover:text-white"
              aria-label="エディタメニュー"
            >
              <Menu size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-gray-700 bg-[#15202b] shadow-xl">
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-xs font-bold hover:bg-white/5"
                  onClick={() => {
                    setMenuOpen(false);
                    const raw = window.prompt("テキストを入力（通常の文章）", "");
                    if (raw?.trim()) insertTemplate(raw.trim());
                  }}
                >
                  テキストを入力（通常の文章入力）
                </button>
              </div>
            )}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            draftRef.current = e.target.value;
            pendingCaretRef.current = null;
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          inputMode="text"
          enterKeyHint="enter"
          autoCapitalize="sentences"
          autoCorrect="on"
          spellCheck
          onKeyDown={(e) => {
            if (e.key === "Enter") e.stopPropagation();
          }}
          className={`min-w-0 w-full max-w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap outline-none [overflow-wrap:anywhere] [word-break:break-word] focus:border-neon ${
            docked
              ? "min-h-[8rem] flex-1 resize-none overflow-y-auto"
              : tall
                ? "min-h-0 flex-1 resize-none overflow-y-auto"
                : "min-h-40 h-40 resize-y"
          }`}
        />
        <div
          className={`mt-2 min-w-0 shrink-0 overflow-x-auto overflow-y-auto rounded-xl border border-dashed border-gray-800 bg-[#0b1220] p-2 ${
            docked ? "max-h-28" : tall ? "max-h-20" : "max-h-28"
          }`}
        >
          <p className="mb-1 text-[10px] font-bold tracking-wide text-muted">LIVE PREVIEW · KaTeX</p>
          {value.trim() ? (
            <LatexText text={value} className={`max-w-full break-words ${fontSizeClass(fontSize)} [&_.katex-display]:overflow-x-auto`} />
          ) : (
            <p className="text-xs text-muted">$数式$ と見出しがここに描画されます。</p>
          )}
        </div>
        {footer && <div className="mt-2 min-w-0 shrink-0 pb-2">{footer}</div>}
      </div>
      {keyboard && (
        <MathKeyboard
          onAction={handleKeyboardClick}
          inputMode={kbMode}
          onInputModeChange={(mode) => {
            setKbMode(mode);
            if (mode === "text") {
              requestAnimationFrame(() => textareaRef.current?.focus());
            }
          }}
        />
      )}
    </div>
  );
}
