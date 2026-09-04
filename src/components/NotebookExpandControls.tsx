"use client";

import { ArrowLeft, Maximize2, Menu } from "lucide-react";
import type { ReactNode } from "react";

export function NotebookExpandButton({
  onClick,
  className = "",
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:bg-white/10 hover:text-white ${className}`}
      aria-label="拡大"
      title="拡大"
    >
      <Maximize2 size={16} />
    </button>
  );
}

export function ComposerExpandOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col bg-[#0b1220]">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onClose}
          className="tap-target rounded-md p-2 text-muted hover:bg-white/10 hover:text-white"
          aria-label="縮小"
          title="縮小"
        >
          <Menu size={20} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/15"
        >
          <ArrowLeft size={14} />
          完了
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
