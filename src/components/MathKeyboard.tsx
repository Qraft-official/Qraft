"use client";

import { useHoldRepeat } from "@/lib/use-hold-repeat";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type MathKeyAction =
  | { type: "insert"; text: string }
  | { type: "backspace" }
  | { type: "enter" };

type TabId = "123" | "fx" | "abc" | "sym";

type KeySpec = {
  id: string;
  label: string;
  action: MathKeyAction;
  span?: number;
  tone?: "mute" | "accent" | "warn" | "shift";
};

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: "123", label: "123", hint: "数字" },
  { id: "fx", label: "f(x)", hint: "関数" },
  { id: "abc", label: "ABC", hint: "文字" },
  { id: "sym", label: "∑ ≠", hint: "記号" },
];

const insert = (text: string): MathKeyAction => ({ type: "insert", text });

const KEYS: Record<TabId, KeySpec[]> = {
  "123": [
    { id: "x", label: "x", action: insert("x") },
    { id: "y", label: "y", action: insert("y") },
    { id: "pi", label: "π", action: insert("\\pi") },
    { id: "e", label: "e", action: insert("e") },
    { id: "bs", label: "⌫", action: { type: "backspace" }, tone: "warn" },
    { id: "7", label: "7", action: insert("7") },
    { id: "8", label: "8", action: insert("8") },
    { id: "9", label: "9", action: insert("9") },
    { id: "div", label: "÷", action: insert("\\div") },
    { id: "lp", label: "(", action: insert("(") },
    { id: "4", label: "4", action: insert("4") },
    { id: "5", label: "5", action: insert("5") },
    { id: "6", label: "6", action: insert("6") },
    { id: "mul", label: "×", action: insert("\\times") },
    { id: "rp", label: ")", action: insert(")") },
    { id: "1", label: "1", action: insert("1") },
    { id: "2", label: "2", action: insert("2") },
    { id: "3", label: "3", action: insert("3") },
    { id: "min", label: "−", action: insert("-") },
    { id: "sqrt", label: "√", action: insert("\\sqrt{#0}") },
    { id: "0", label: "0", action: insert("0") },
    { id: "dot", label: ".", action: insert(".") },
    { id: "frac", label: "a/b", action: insert("\\frac{#0}{#1}") },
    { id: "plus", label: "+", action: insert("+") },
    { id: "ent", label: "↵", action: { type: "enter" }, tone: "accent" },
  ],
  fx: [
    { id: "sin", label: "sin", action: insert("\\sin") },
    { id: "cos", label: "cos", action: insert("\\cos") },
    { id: "tan", label: "tan", action: insert("\\tan") },
    { id: "ln", label: "ln", action: insert("\\ln") },
    { id: "log", label: "log", action: insert("\\log") },
    { id: "lim", label: "lim", action: insert("\\lim_{#0}") },
    { id: "sum", label: "Σ", action: insert("\\sum_{#0}^{#1}") },
    { id: "int", label: "∫", action: insert("\\int_{#0}^{#1}") },
    { id: "prod", label: "Π", action: insert("\\prod_{#0}^{#1}") },
    { id: "partial", label: "∂", action: insert("\\partial") },
    { id: "abs", label: "|x|", action: insert("\\left|#0\\right|") },
    { id: "exp", label: "eˣ", action: insert("e^{#0}") },
    { id: "pow", label: "xⁿ", action: insert("^{#0}") },
    { id: "fact", label: "n!", action: insert("!") },
    { id: "inf", label: "∞", action: insert("\\infty") },
    { id: "theta", label: "θ", action: insert("\\theta") },
    { id: "bs2", label: "⌫", action: { type: "backspace" }, tone: "warn" },
    { id: "ent2", label: "↵", action: { type: "enter" }, tone: "accent" },
  ],
  abc: [],
  sym: [
    { id: "eqs", label: "=", action: insert("=") },
    { id: "neq", label: "≠", action: insert("\\neq") },
    { id: "leq", label: "≤", action: insert("\\leq") },
    { id: "geq", label: "≥", action: insert("\\geq") },
    { id: "approx", label: "≈", action: insert("\\approx") },
    { id: "pm", label: "±", action: insert("\\pm") },
    { id: "cdot", label: "·", action: insert("\\cdot") },
    { id: "in", label: "∈", action: insert("\\in") },
    { id: "and", label: "∧", action: insert("\\wedge") },
    { id: "or", label: "∨", action: insert("\\vee") },
    { id: "not", label: "¬", action: insert("\\neg") },
    { id: "to", label: "→", action: insert("\\rightarrow") },
    { id: "forall", label: "∀", action: insert("\\forall") },
    { id: "exists", label: "∃", action: insert("\\exists") },
    { id: "cup", label: "∪", action: insert("\\cup") },
    { id: "cap", label: "∩", action: insert("\\cap") },
    { id: "bs4", label: "⌫", action: { type: "backspace" }, tone: "warn" },
    { id: "sp4", label: "空白", action: insert(" "), span: 2 },
    { id: "ent4", label: "↵", action: { type: "enter" }, tone: "accent" },
  ],
};

function abcKeys(shift: boolean): KeySpec[] {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("").map((ch) => {
    const c = shift ? ch.toUpperCase() : ch;
    return { id: ch, label: c, action: insert(c) };
  });
  return [
    ...letters,
    { id: "shift", label: "⇧", action: insert(""), tone: "shift" },
    { id: "bs3", label: "⌫", action: { type: "backspace" }, tone: "warn" },
    { id: "sp", label: "空白", action: insert(" "), span: 4 },
    { id: "ent3", label: "↵", action: { type: "enter" }, tone: "accent", span: 3 },
  ];
}

export type InputMode = "math" | "text";

function keyClass(tone: KeySpec["tone"], shift: boolean) {
  return `touch-manipulation min-h-10 rounded-md px-0.5 text-xs font-bold leading-none ${
    tone === "warn"
      ? "bg-[#4a2e24] text-orange-100"
      : tone === "accent"
        ? "bg-[#2d4a28] text-aha"
        : tone === "shift"
          ? shift
            ? "bg-aha text-black"
            : "bg-white/10 text-white"
          : "bg-[#2f3d4a] text-white"
  } active:brightness-125`;
}

function BackspaceKey({
  span,
  onDelete,
}: {
  span?: number;
  onDelete: () => boolean | void;
}) {
  const hold = useHoldRepeat(onDelete);
  return (
    <button
      type="button"
      aria-label="削除"
      className={`${keyClass("warn", false)} select-none [touch-action:none]`}
      style={span ? { gridColumn: `span ${span}` } : undefined}
      onPointerDown={hold.onPointerDown}
      onPointerUp={hold.onPointerUp}
      onPointerCancel={hold.onPointerCancel}
      onPointerLeave={hold.onPointerLeave}
      onLostPointerCapture={hold.onLostPointerCapture}
      onClick={hold.onClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      ⌫
    </button>
  );
}

export function MathKeyboard({
  onAction,
  inputMode,
  onInputModeChange,
  onDismiss,
}: {
  onAction: (action: MathKeyAction) => void | boolean;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  onDismiss?: () => void;
}) {
  const [tab, setTab] = useState<TabId>("123");
  const [shift, setShift] = useState(false);
  const cols = tab === "abc" ? 9 : tab === "fx" || tab === "sym" ? 6 : 5;
  const keys = tab === "abc" ? abcKeys(shift) : KEYS[tab];

  return (
    <div className="qraft-math-kb w-full min-w-0 shrink-0 border-t border-gray-800 bg-[#151c24] px-1 pt-0.5 pb-[max(0.1rem,env(safe-area-inset-bottom))] sm:px-2">
      {onDismiss ? (
        <div className="mb-0.5 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted hover:text-white"
            aria-label="キーボードを閉じる"
          >
            <ChevronDown size={22} />
          </button>
        </div>
      ) : null}
      <div className="mb-0.5 grid grid-cols-[1fr_1fr_2.75rem] gap-0.5">
        <button
          type="button"
          onClick={() => onInputModeChange("text")}
          aria-pressed={inputMode === "text"}
          className={`flex min-h-11 items-center justify-center gap-1 rounded-md leading-none ${
            inputMode === "text" ? "bg-aha text-black" : "bg-white/10 text-muted"
          }`}
        >
          <span className="text-xs font-black">[文]</span>
          <span className="text-xs font-bold">テキスト</span>
        </button>
        <button
          type="button"
          onClick={() => onInputModeChange("math")}
          aria-pressed={inputMode === "math"}
          className={`flex min-h-11 items-center justify-center gap-1 rounded-md leading-none ${
            inputMode === "math" ? "bg-aha text-black" : "bg-white/10 text-muted"
          }`}
        >
          <span className="text-xs font-black">[√x]</span>
          <span className="text-xs font-bold">数式</span>
        </button>
        <BackspaceKey onDelete={() => onAction({ type: "backspace" })} />
      </div>
      {inputMode === "math" && (
        <>
          <div className="mb-0.5 grid grid-cols-4 gap-0.5">
            {TABS.map((tabItem) => {
              const on = tab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  aria-label={`${tabItem.label} ${tabItem.hint}`}
                  aria-pressed={on}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onInputModeChange("math");
                    setTab(tabItem.id);
                  }}
                  className={`touch-manipulation min-h-10 rounded-md px-0.5 py-1 leading-none ${
                    on ? "bg-neon text-white" : "bg-white/10 text-muted"
                  }`}
                >
                  <span className="text-xs font-black">{tabItem.label}</span>
                </button>
              );
            })}
          </div>
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            onPointerDown={(e) => e.preventDefault()}
          >
            {keys.map((k) =>
              k.action.type === "backspace" ? (
                <BackspaceKey
                  key={k.id}
                  span={k.span}
                  onDelete={() => onAction({ type: "backspace" })}
                />
              ) : (
                <button
                  key={k.id}
                  type="button"
                  aria-label={k.label}
                  onClick={() => {
                    if (k.tone === "shift") {
                      setShift((s) => !s);
                      return;
                    }
                    if (tab === "abc" && k.action.type === "insert" && k.action.text && shift) {
                      setShift(false);
                    }
                    onAction(k.action);
                  }}
                  className={keyClass(k.tone, shift)}
                  style={k.span ? { gridColumn: `span ${k.span}` } : undefined}
                >
                  {k.label}
                </button>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
