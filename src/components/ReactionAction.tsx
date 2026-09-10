"use client";

import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { ReactionPicker } from "./ReactionPicker";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);

  const closePicker = () => {
    setOpen(false);
    setError("");
    window.requestAnimationFrame(() => btnRef.current?.focus());
  };

  const pick = (emoji: string) => {
    if (busyRef.current) return;
    if (!hasPremium) {
      closePicker();
      onPaywall();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      onReact(postId, emoji);
      closePicker();
    } catch {
      setError("リアクションを保存できませんでした");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-w-0 flex-1 justify-center">
      <button
        type="button"
        ref={btnRef}
        className={`flex min-h-11 min-w-11 items-center justify-center gap-0.5 px-0.5 ${
          selected ? "text-aha" : "text-muted hover:text-white"
        }`}
        aria-label="リアクションを追加"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-pressed={Boolean(selected)}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Plus size={16} strokeWidth={2.25} />
      </button>
      <ReactionPicker
        open={open}
        onClose={closePicker}
        selected={selected}
        onPick={pick}
        anchorRef={btnRef}
        busy={busy}
        error={error}
      />
    </div>
  );
}
