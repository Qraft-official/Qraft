"use client";

import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareButtonProps {
  title: string;
  path: string;
  text?: string;
  withLabel?: boolean;
}

export default function ShareButton({ title, path, text, withLabel = false }: ShareButtonProps) {
  const { toast } = useToast();

  async function share(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("リンクをコピーしました", "success");
    } catch (err) {
      // A user dismissing the native share sheet is not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast("共有できませんでした", "error");
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label="共有する"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-fg-muted transition-colors active:bg-white/10"
    >
      <Share2 size={16} strokeWidth={2} />
      {withLabel && <span>共有</span>}
    </button>
  );
}
