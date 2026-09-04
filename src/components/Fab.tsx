"use client";

import { useApp } from "@/lib/store";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

export function Fab({ onClick }: { onClick: () => void }) {
  const { composer, premiumOpen, paywallOpen } = useApp();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => setKeyboardOpen(window.innerHeight - vv.height > 96);
    sync();
    vv.addEventListener("resize", sync);
    return () => vv.removeEventListener("resize", sync);
  }, []);
  if (keyboardOpen || composer.open || premiumOpen || paywallOpen) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="glow-lime fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-aha text-black"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      aria-label="新規投稿"
    >
      <Plus size={28} strokeWidth={2.6} />
    </button>
  );
}
