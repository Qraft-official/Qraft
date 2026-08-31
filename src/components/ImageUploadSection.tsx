"use client";

import { useApp } from "@/lib/store";
import { ImagePlus, Lock, X } from "lucide-react";
import { useRef } from "react";

const PAYWALL_REASON =
  "画像を添付するためにはプレミアムプランが必要です。プレミアムプランにアップグレードしますか？";

export function ImageUploadSection({
  isPremium,
  onFile,
  preview,
  onClear,
  label = "画像を添付する",
}: {
  isPremium: boolean;
  onFile: (file: File) => void;
  preview?: string;
  onClear?: () => void;
  label?: string;
}) {
  const { openPaywall } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    if (!isPremium) {
      openPaywall(PAYWALL_REASON);
      return;
    }
    inputRef.current?.click();
  };

  return (
    <div className="relative inline-block w-full min-w-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
      <button
        type="button"
        onClick={handleImageClick}
        className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-gray-800 bg-white/5 px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/10"
      >
        {!isPremium ? (
          <Lock size={14} className="shrink-0 text-amber-400" aria-hidden />
        ) : (
          <ImagePlus size={14} className="shrink-0 text-muted" aria-hidden />
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {!isPremium && (
          <span className="shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2 py-0.5 text-[10px] font-bold text-black">
            PREMIUM
          </span>
        )}
      </button>
      {preview && isPremium && (
        <div className="relative mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-16 w-full rounded-xl object-cover" />
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white"
              aria-label="画像を外す"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
