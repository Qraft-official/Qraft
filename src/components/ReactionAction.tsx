"use client";

import { PREMIUM_REACTIONS } from "@/lib/constants";
import { useEffect, useRef, useState } from "react";
import { ReactionPicker } from "./ReactionPicker";

const LONG_PRESS_MS = 420;

export function ReactionAction({
  postId,
  hasPremium,
  selected,
  onReact,
  onPaywall,
}: {
  postId: string;
  hasPremium: boolean;
  selected?: string;
  onReact: (postId: string, emoji: string) => void;
  onPaywall: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | null>(null);
  const longPressRef = useRef(false);

  const clearHold = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearHold(), []);

  if (!hasPremium) {
    return (
      <button
        type="button"
        onClick={onPaywall}
        className="flex min-h-11 min-w-0 flex-1 items-center justify-center px-0.5 text-[11px] text-muted"
        aria-label="リアクション（Premium）"
      >
        😂+
      </button>
    );
  }

  const openPicker = () => {
    clearHold();
    setOpen(true);
  };

  return (
    <div className="relative flex min-w-0 flex-1 justify-center">
      <button
        type="button"
        ref={btnRef}
        className={`flex min-h-11 min-w-11 select-none items-center justify-center text-base ${
          selected ? "scale-110" : "opacity-80 hover:opacity-100"
        }`}
        aria-label="リアクション"
        aria-expanded={open}
        aria-haspopup="dialog"
        onPointerDown={(e) => {
          if (e.button !== 0 && e.pointerType === "mouse") return;
          longPressRef.current = false;
          clearHold();
          timerRef.current = window.setTimeout(() => {
            longPressRef.current = true;
            openPicker();
          }, LONG_PRESS_MS);
        }}
        onPointerUp={clearHold}
        onPointerCancel={clearHold}
        onPointerLeave={clearHold}
        onContextMenu={(e) => {
          e.preventDefault();
          openPicker();
        }}
        onClick={() => {
          if (longPressRef.current) {
            longPressRef.current = false;
            return;
          }
          openPicker();
        }}
      >
        {selected || "😊"}
      </button>
      <ReactionPicker
        open={open}
        onClose={() => setOpen(false)}
        emojis={PREMIUM_REACTIONS}
        selected={selected}
        onPick={(emoji) => onReact(postId, emoji)}
        anchorRef={btnRef}
      />
    </div>
  );
}
