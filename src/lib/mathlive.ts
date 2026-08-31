import type { MathfieldElement } from "mathlive";
import { latexLooksLikePlainText, latexToPlainText, normalizeLatexForKatex } from "./latex-normalize";

/** Wrap MathLive LaTeX so the existing KaTeX feed renderer can display it. */
export function wrapMathliveLatex(latex: string) {
  const t = latex.trim();
  if (!t) return "";
  if (latexLooksLikePlainText(t)) {
    return latexToPlainText(t) || t;
  }
  if (t.includes("$$")) {
    return t.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner: string) => `$$${normalizeLatexForKatex(inner)}$$`);
  }
  if (t.includes("$") && !t.trimStart().startsWith("\\")) return t;
  return `$$${normalizeLatexForKatex(t)}$$`;
}

/** Strip markdown/$ wrappers so MathLive can ingest AI-generated problems. */
export function toMathliveLatex(src: string) {
  return src.replace(/\*\*/g, "").replace(/\$\$/g, "").replace(/\$/g, "").trim();
}

const PLAIN_TEXT_MENU_ID = "insert-plain-text";

function escapeLatexText(src: string) {
  return src.replace(/\\/g, "\\backslash ").replace(/[{}]/g, (ch) => `\\${ch}`);
}

export function insertMathNewline(mf: MathfieldElement) {
  mf.focus();
  if (mf.mode === "text") {
    const ok = mf.insert("\n", {
      focus: true,
      format: "latex",
      insertionMode: "replaceSelection",
      selectionMode: "after",
      scrollIntoView: true,
    });
    if (ok) {
      mf.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
  }
  mf.insert("\\\\", {
    focus: true,
    format: "latex",
    insertionMode: "replaceSelection",
    selectionMode: "after",
    scrollIntoView: true,
  });
  mf.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Enable mixed text/math display mode and Enter = newline (not submit). */
export function attachMultilineMathfield(mf: MathfieldElement) {
  mf.smartMode = true;
  mf.smartFence = true;
  mf.defaultMode = "math";
  mf.setAttribute("smart-mode", "true");
  mf.setAttribute("default-mode", "math");

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || e.isComposing) return;
    e.preventDefault();
    e.stopPropagation();
    insertMathNewline(mf);
  };
  const onChange = (e: Event) => {
    e.stopPropagation();
  };
  mf.addEventListener("keydown", onKeyDown, true);
  mf.addEventListener("change", onChange);
  return () => {
    mf.removeEventListener("keydown", onKeyDown, true);
    mf.removeEventListener("change", onChange);
  };
}

export function insertPlainTextIntoMathfield(mf: MathfieldElement) {
  const raw = window.prompt("テキストを入力（通常の文章）", "");
  if (raw == null || !raw.trim()) return;
  mf.focus();
  const lines = raw.split(/\r?\n/);
  const latex = lines.map((line) => `\\text{${escapeLatexText(line)}}`).join("\\\\");
  mf.insert(latex, {
    focus: true,
    format: "latex",
    insertionMode: "replaceSelection",
    selectionMode: "after",
    scrollIntoView: true,
  });
  mf.dispatchEvent(new Event("input", { bubbles: true }));
}

export function attachPlainTextMenu(mf: MathfieldElement) {
  const existing = [...mf.menuItems];
  if (existing.some((item) => "id" in item && item.id === PLAIN_TEXT_MENU_ID)) return;
  mf.menuItems = [
    {
      type: "command",
      id: PLAIN_TEXT_MENU_ID,
      label: "テキストを入力（通常の文章入力）",
      onMenuSelect: () => insertPlainTextIntoMathfield(mf),
    },
    { type: "divider" },
    ...existing,
  ];
}
