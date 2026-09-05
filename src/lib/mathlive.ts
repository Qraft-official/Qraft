import type { MathfieldElement } from "mathlive";
import { promptDialog } from "./app-dialog";
import { latexLooksLikePlainText, latexToPlainText, normalizeLatexForKatex, capExcessBlankLines } from "./latex-normalize";
import { unwrapTextSize, wrapWithTextSize, type TextSizeId } from "./text-size";

/** Wrap MathLive LaTeX so the existing KaTeX feed renderer can display it. */
export function wrapMathliveLatex(latex: string) {
  const withCaps = capExcessBlankLines(latex.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  if (!withCaps.replace(/\s/g, "") && !withCaps.includes("\n")) return "";
  if (latexLooksLikePlainText(withCaps)) {
    if (!/\\/.test(withCaps)) return withCaps;
    const plain = latexToPlainText(withCaps);
    return capExcessBlankLines(plain.length ? plain : withCaps);
  }
  const math = withCaps.trim();
  if (!math) return withCaps.includes("\n") ? withCaps : "";
  if (math.includes("$$")) {
    return math.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner: string) => `$$${normalizeLatexForKatex(inner)}$$`);
  }
  if (math.includes("$") && !math.trimStart().startsWith("\\")) return withCaps;
  return `$$${normalizeLatexForKatex(math)}$$`;
}

/** Strip markdown/$ wrappers so MathLive can ingest AI-generated problems. */
export function toMathliveLatex(src: string) {
  return src.replace(/\*\*/g, "").replace(/\$\$/g, "").replace(/\$/g, "").trim();
}

const PLAIN_TEXT_MENU_ID = "insert-plain-text";

function escapeLatexText(src: string) {
  return src.replace(/\\/g, "\\backslash ").replace(/[{}]/g, (ch) => `\\${ch}`);
}

function emitMathfieldInput(mf: MathfieldElement) {
  mf.dispatchEvent(new Event("input", { bubbles: true }));
}

function insertOpts(format: "latex" | "plain-text") {
  return {
    focus: true,
    format,
    insertionMode: "replaceSelection" as const,
    selectionMode: "after" as const,
    scrollIntoView: true,
  };
}

export function applyTextSizeToMathfield(mf: MathfieldElement, size: TextSizeId) {
  mf.focus();
  let selected = "";
  try {
    selected = mf.getValue(mf.selection, "latex") || "";
  } catch {
    selected = "";
  }
  if (/\\[a-zA-Z]/.test(selected)) return;
  const inner = unwrapTextSize(selected);
  if (!selected) {
    if (size === "md") return;
    mf.insert(wrapWithTextSize("\u00a0", size), insertOpts("plain-text"));
  } else {
    mf.insert(wrapWithTextSize(inner, size), insertOpts("plain-text"));
  }
  emitMathfieldInput(mf);
}

/**
 * MathLive only turns Enter into a line break inside a multiline environment.
 * `addRowAfter` promotes the root to a `lines` environment, so it is the only
 * command that reliably breaks the line in both math and text mode.
 */
export function insertMathNewline(mf: MathfieldElement) {
  mf.focus();
  const before = mf.getValue("latex");
  // MathLive text-mode parseLatex treats raw `\n`/`\r` as a space. Always use a
  // row break (`addRowAfter` / `\\`) so saved content keeps real line breaks.
  mf.executeCommand("addRowAfter");
  if (mf.getValue("latex") !== before) {
    emitMathfieldInput(mf);
    return;
  }
  mf.insert("\\\\[~0.6em]", insertOpts("latex"));
  emitMathfieldInput(mf);
}

const WRAP_STYLE_ID = "qraft-mathfield-wrap";

/** Rows of the line environment that sits directly at the root of the field. */
const ROOT_ROWS =
  ".ML__latex > .ML__mtable > .col-align-l > .ML__vlist-t > .ML__vlist-r > .ML__vlist";

/**
 * MathLive lays the formula out with `white-space: nowrap` and `width:
 * min-content` inside its shadow root, so long lines run past the field. The
 * rules can only be reached by injecting a stylesheet into that shadow root.
 */
export function enableMathfieldWrapping(mf: MathfieldElement) {
  const root = mf.shadowRoot;
  if (!root || root.getElementById(WRAP_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = WRAP_STYLE_ID;
  style.textContent = `
    .ML__container { max-width: 100%; }
    .ML__content {
      display: block !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      overflow-x: hidden !important;
      max-width: 100% !important;
    }
    .ML__latex {
      white-space: normal !important;
      width: auto !important;
      max-width: 100% !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
      /* Wrapped rows would otherwise collide: MathLive sizes its boxes for a
         single line and relies on struts for vertical spacing. */
      line-height: 1.8 !important;
    }
    .ML__base {
      width: auto !important;
      max-width: 100% !important;
      white-space: normal !important;
    }
    .ML__caret,
    .ML__text-caret {
      border-left-color: #ccff00 !important;
      opacity: 1 !important;
    }
    .ML__selection {
      background: rgba(204, 255, 0, 0.28) !important;
    }
    /* Rows of the root line environment are absolutely positioned at a fixed
       height, so a wrapped row would overlap the next one. Put just those rows
       (never nested fractions or scripts) back into normal flow. */
    ${ROOT_ROWS} {
      display: block !important;
      height: auto !important;
    }
    ${ROOT_ROWS} > span {
      position: static !important;
      top: auto !important;
      display: block !important;
      height: auto !important;
    }
    ${ROOT_ROWS} > span > .ML__pstrut {
      display: none !important;
    }
    ${ROOT_ROWS} > span > span {
      display: block !important;
      height: auto !important;
    }
    .ML__latex > .ML__mtable > .col-align-l > .ML__vlist-t,
    .ML__latex > .ML__mtable > .col-align-l > .ML__vlist-t > .ML__vlist-r {
      display: block !important;
    }
    .ML__latex > .ML__mtable > .col-align-l > .ML__vlist-t > .ML__vlist-s {
      display: none !important;
    }
    /* Struts reserve room for the (now removed) absolute row offsets. */
    .ML__latex:has(> .ML__mtable) > .ML__strut,
    .ML__latex:has(> .ML__mtable) > .ML__strut--bottom {
      display: none !important;
    }
  `;
  root.append(style);
}

function isDeleteInputType(type: string) {
  return (
    type === "deleteContentBackward" ||
    type === "deleteContentForward" ||
    type === "deleteByCut" ||
    type === "deleteSoftLineBackward" ||
    type === "deleteSoftLineForward" ||
    type === "deleteWordBackward" ||
    type === "deleteWordForward" ||
    type === "deleteHardLineBackward" ||
    type === "deleteHardLineForward" ||
    type === "deleteContent"
  );
}

function isEnterKey(ke: KeyboardEvent) {
  if (ke.isComposing || ke.key === "Process" || ke.keyCode === 229) return false;
  return ke.key === "Enter" || ke.key === "Return" || ke.keyCode === 13;
}

function isNewlineInput(ie: InputEvent) {
  if (ie.inputType === "insertLineBreak" || ie.inputType === "insertParagraph") return true;
  if (ie.inputType !== "insertText" || ie.data == null) return false;
  return ie.data === "\n" || ie.data === "\r" || ie.data === "\r\n";
}

function deleteBackwardOrForward(mf: MathfieldElement, forward: boolean) {
  const before = mf.getValue("latex");
  mf.executeCommand(forward ? "deleteForward" : "deleteBackward");
  const after = mf.getValue("latex");
  if (after !== before) emitMathfieldInput(mf);
}

function sinkAndHost(mf: MathfieldElement): EventTarget[] {
  const sink = keyboardSink(mf);
  return sink ? [mf, sink] : [mf];
}

function addCapture(
  targets: EventTarget[],
  type: string,
  handler: EventListener,
) {
  for (const t of targets) t.addEventListener(type, handler, true);
}

function removeCapture(
  targets: EventTarget[],
  type: string,
  handler: EventListener,
) {
  for (const t of targets) t.removeEventListener(type, handler, true);
}

/** Enable mixed text/math display mode and map OS Enter/Backspace (incl. IME). */
export function attachMultilineMathfield(mf: MathfieldElement) {
  mf.smartMode = true;
  mf.smartFence = true;
  mf.defaultMode = "math";
  mf.setAttribute("smart-mode", "true");
  mf.setAttribute("default-mode", "math");

  const handledEvents = new WeakSet<Event>();
  let lastNewlineAt = 0;

  const applyNewline = () => {
    const now = performance.now();
    if (now - lastNewlineAt < 40) return;
    lastNewlineAt = now;
    insertMathNewline(mf);
  };

  const onKeyDown = (e: Event) => {
    if (handledEvents.has(e)) return;
    handledEvents.add(e);
    const ke = e as KeyboardEvent;
    if (ke.isComposing || ke.key === "Process" || ke.keyCode === 229) return;
    if (isEnterKey(ke)) {
      ke.preventDefault();
      ke.stopPropagation();
      applyNewline();
      return;
    }
    if (ke.key === "Backspace" || ke.key === "Delete") {
      ke.preventDefault();
      ke.stopPropagation();
      deleteBackwardOrForward(mf, ke.key === "Delete");
    }
  };

  const onBeforeInput = (e: Event) => {
    if (handledEvents.has(e)) return;
    handledEvents.add(e);
    const ie = e as InputEvent;
    if (ie.isComposing) return;
    if (isNewlineInput(ie)) {
      ie.preventDefault();
      ie.stopPropagation();
      applyNewline();
      return;
    }
    if (isDeleteInputType(ie.inputType)) {
      ie.preventDefault();
      ie.stopPropagation();
      const forward =
        ie.inputType === "deleteContentForward" ||
        ie.inputType === "deleteSoftLineForward" ||
        ie.inputType === "deleteWordForward" ||
        ie.inputType === "deleteHardLineForward";
      deleteBackwardOrForward(mf, forward);
    }
  };

  const onChange = (e: Event) => {
    e.stopPropagation();
  };

  const bindTargets = () => sinkAndHost(mf);
  let targets = bindTargets();
  addCapture(targets, "keydown", onKeyDown);
  addCapture(targets, "beforeinput", onBeforeInput);
  mf.addEventListener("change", onChange);

  const rebind = () => {
    removeCapture(targets, "keydown", onKeyDown);
    removeCapture(targets, "beforeinput", onBeforeInput);
    targets = bindTargets();
    addCapture(targets, "keydown", onKeyDown);
    addCapture(targets, "beforeinput", onBeforeInput);
  };
  mf.addEventListener("focusin", rebind);

  return () => {
    mf.removeEventListener("focusin", rebind);
    removeCapture(targets, "keydown", onKeyDown);
    removeCapture(targets, "beforeinput", onBeforeInput);
    mf.removeEventListener("change", onChange);
  };
}

const CJK_RE =
  /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/;

export function looksLikeJapaneseText(s: string) {
  return CJK_RE.test(s);
}

function keyboardSink(mf: MathfieldElement): HTMLElement | null {
  return (
    mf.shadowRoot?.querySelector<HTMLElement>(".ML__keyboard-sink") ??
    mf.querySelector<HTMLElement>(".ML__keyboard-sink")
  );
}

/** MathLive defaults the hidden sink to `inputmode=none`, which blocks the OS keyboard. */
export function setMathfieldOsKeyboard(mf: MathfieldElement, enabled: boolean) {
  const sink = keyboardSink(mf);
  if (enabled) {
    mf.setAttribute("inputmode", "text");
    if (sink) {
      sink.setAttribute("inputmode", "text");
      sink.setAttribute("enterkeyhint", "enter");
      sink.setAttribute("autocapitalize", "sentences");
      sink.setAttribute("autocorrect", "on");
    }
    return;
  }
  mf.setAttribute("inputmode", "none");
  if (sink) {
    sink.setAttribute("inputmode", "none");
    sink.setAttribute("autocapitalize", "off");
    sink.setAttribute("autocorrect", "off");
  }
}

export function focusMathfieldForOsKeyboard(mf: MathfieldElement) {
  setMathfieldOsKeyboard(mf, true);
  const sink = keyboardSink(mf);
  mf.focus();
  sink?.focus();
}

export function applyMathfieldModePolicy(mf: MathfieldElement, mode: "math" | "text") {
  if (mode === "text") {
    mf.smartMode = false;
    mf.defaultMode = "text";
    mf.setAttribute("smart-mode", "false");
    mf.setAttribute("default-mode", "text");
    setMathfieldOsKeyboard(mf, true);
    return;
  }
  mf.smartMode = true;
  mf.defaultMode = "math";
  mf.setAttribute("smart-mode", "true");
  mf.setAttribute("default-mode", "math");
  setMathfieldOsKeyboard(mf, false);
}

export function setMathfieldInputMode(
  mf: MathfieldElement,
  mode: "math" | "text",
  opts: { focus?: boolean } = {},
) {
  const shouldFocus = opts.focus !== false;
  applyMathfieldModePolicy(mf, mode);
  const sink = keyboardSink(mf);
  const active = document.activeElement;
  const alreadyFocused =
    active === mf ||
    active === sink ||
    (active instanceof Node && Boolean(mf.shadowRoot?.contains(active)));
  if (shouldFocus && !alreadyFocused) {
    if (mode === "text") focusMathfieldForOsKeyboard(mf);
    else mf.focus();
  }
  if (mf.mode === mode) return;
  mf.executeCommand(["switchMode", mode]);
  if (mf.mode !== mode) mf.mode = mode;
}

/** Switch to text mode for IME / CJK so MathLive does not turn た into \\tan. */
export function attachJapaneseTextMode(
  mf: MathfieldElement,
  onMode: (mode: "math" | "text") => void,
) {
  let composing = false;
  let shortcutSnap: MathfieldElement["inlineShortcuts"] | null = null;

  const ensureText = () => {
    setMathfieldInputMode(mf, "text");
    onMode("text");
  };

  const onCompositionStart = () => {
    composing = true;
    if (!shortcutSnap) shortcutSnap = mf.inlineShortcuts;
    try {
      mf.inlineShortcuts = {};
    } catch {
      /* readonly in some builds */
    }
    ensureText();
  };

  const onCompositionEnd = (e: CompositionEvent) => {
    composing = false;
    if (shortcutSnap) {
      try {
        mf.inlineShortcuts = shortcutSnap;
      } catch {
        /* ignore */
      }
      shortcutSnap = null;
    }
    if (e.data && looksLikeJapaneseText(e.data)) ensureText();
  };

  const onBeforeInput = (e: Event) => {
    const ie = e as InputEvent;
    if (ie.isComposing || composing) {
      ensureText();
      return;
    }
    if (ie.data && looksLikeJapaneseText(ie.data)) ensureText();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || composing) ensureText();
  };

  mf.addEventListener("compositionstart", onCompositionStart, true);
  mf.addEventListener("compositionend", onCompositionEnd, true);
  mf.addEventListener("beforeinput", onBeforeInput, true);
  mf.addEventListener("keydown", onKeyDown, true);

  return () => {
    mf.removeEventListener("compositionstart", onCompositionStart, true);
    mf.removeEventListener("compositionend", onCompositionEnd, true);
    mf.removeEventListener("beforeinput", onBeforeInput, true);
    mf.removeEventListener("keydown", onKeyDown, true);
  };
}

export async function insertPlainTextIntoMathfield(mf: MathfieldElement) {
  const raw = await promptDialog({
    title: "テキストを入力",
    message: "通常の文章を入力します。",
    placeholder: "例: 次の式を求めよ",
    confirmLabel: "挿入",
  });
  if (raw == null) return;
  if (!raw.replace(/\s/g, "") && !raw.includes("\n")) return;
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
      onMenuSelect: () => {
        void insertPlainTextIntoMathfield(mf);
      },
    },
    { type: "divider" },
    ...existing,
  ];
}
