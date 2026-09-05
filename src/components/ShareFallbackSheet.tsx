"use client";

import { copyText, sanitizeInviteCode } from "@/lib/share";
import { X } from "lucide-react";

export function ShareFallbackSheet({
  open,
  onClose,
  onRetry,
  onShareImage,
  url,
  inviteCode,
  imageFailed,
}: {
  open: boolean;
  onClose: () => void;
  onRetry?: () => void;
  onShareImage?: () => void;
  url: string;
  inviteCode?: string | null;
  imageFailed?: boolean;
}) {
  if (!open) return null;
  const code = sanitizeInviteCode(inviteCode);
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="共有"
        className="w-full max-w-sm rounded-t-3xl border border-gray-800 bg-[#15202b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black">共有</p>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-white/10"
            aria-label="閉じる"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {imageFailed ? (
          <p className="mt-2 text-sm font-bold text-red-300">共有画像を作成できませんでした</p>
        ) : (
          <p className="mt-2 text-xs text-muted">この端末では画像とURLを同時に送れないことがあります</p>
        )}
        <div className="mt-3 grid gap-2">
          {imageFailed && onRetry ? (
            <button
              type="button"
              className="min-h-11 rounded-full bg-aha text-sm font-bold text-black"
              onClick={onRetry}
            >
              画像を再試行
            </button>
          ) : null}
          {onShareImage && !imageFailed ? (
            <button
              type="button"
              className="min-h-11 rounded-full bg-aha text-sm font-bold text-black"
              onClick={onShareImage}
            >
              画像を共有
            </button>
          ) : null}
          <button
            type="button"
            className="min-h-11 rounded-full border border-gray-700 text-sm font-bold text-white"
            onClick={() => {
              void copyText(url).then((ok) => {
                if (ok) onClose();
              });
            }}
          >
            URLをコピー
          </button>
          {code ? (
            <button
              type="button"
              className="min-h-11 rounded-full border border-gray-700 text-sm font-bold text-white"
              onClick={() => {
                void copyText(code).then((ok) => {
                  if (ok) onClose();
                });
              }}
            >
              招待コードをコピー
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
