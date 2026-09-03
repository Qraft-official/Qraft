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

export function insertMathNewline(mf: MathfieldElement) {
  mf.focus();
  mf.insert("\\\\", insertOpts("latex"));
  emitMathfieldInput(mf);
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

function isNewlineInput(ie: InputEvent) {
  if (ie.inputType === "insertLineBreak" || ie.inputType === "insertParagraph") return true;
  if (ie.inputType === "insertText" && (ie.data === "\n" || ie.data === "\r\n")) return true;
  return false;
}

function deleteBackwardOrForward(mf: MathfieldElement, forward: boolean) {
  mf.executeCommand(forward ? "deleteForward" : "deleteBackward");
  emitMathfieldInput(mf);
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

  const onKeyDown = (e: Event) => {
    if (handledEvents.has(e)) return;
    handledEvents.add(e);
    const ke = e as KeyboardEvent;
    if (ke.isComposing || ke.key === "Process" || ke.keyCode === 229) return;
    if (ke.key === "Enter") {
      ke.preventDefault();
      ke.stopPropagation();
      insertMathNewline(mf);
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
      insertMathNewline(mf);
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
