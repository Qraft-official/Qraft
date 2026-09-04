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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-lg md:max-w-2xl lg:max-w-4xl">
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto glow-lime absolute right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-aha text-black"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
      aria-label="新規投稿"
    >
      <Plus size={28} strokeWidth={2.6} />
    </button>
    </div>
  );
}
