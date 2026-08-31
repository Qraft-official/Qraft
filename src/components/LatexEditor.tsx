"use client";

import { LatexText } from "@/lib/latex";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { type MathKeyAction, MathKeyboard } from "./MathKeyboard";

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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tall?: boolean;
  keyboard?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(value);
  const pendingCaretRef = useRef<number | null>(null);

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
        <div className="aha-scroll mb-1 flex shrink-0 gap-1 overflow-x-auto pb-1">
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
          className={`min-w-0 w-full rounded-xl border border-gray-800 bg-panel px-3 py-2 font-mono text-sm leading-relaxed outline-none focus:border-neon ${
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
            <LatexText text={value} className="max-w-full break-words text-sm [&_.katex-display]:overflow-x-auto" />
          ) : (
            <p className="text-xs text-muted">$数式$ と見出しがここに描画されます。</p>
          )}
        </div>
        {footer && <div className="mt-2 min-w-0 shrink-0 pb-2">{footer}</div>}
      </div>
      {keyboard && <MathKeyboard onAction={handleKeyboardClick} />}
    </div>
  );
}
