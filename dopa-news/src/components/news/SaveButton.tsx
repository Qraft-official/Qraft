"use client";

import { motion, useAnimationControls } from "framer-motion";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { getSupabase } from "@/lib/supabase/client";

export default function SaveButton({
  newsId,
  withLabel = false,
}: {
  newsId: string;
  withLabel?: boolean;
}) {
  const { user, savedIds, setSavedLocally } = useSession();
  const gate = useAuthGate();
  const { toast } = useToast();
  const controls = useAnimationControls();
  const [busy, setBusy] = useState(false);
  const saved = savedIds.has(newsId);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!gate("保存")) return;
    if (busy || !user) return;

    const next = !saved;
    setBusy(true);
    setSavedLocally(newsId, next);
    if (next) void controls.start({ scale: [1, 1.32, 0.94, 1], transition: { duration: 0.42 } });

    try {
      const supabase = getSupabase();
      if (next) {
        const { error } = await supabase
          .from("saved_news")
          .insert({ user_id: user.id, news_id: newsId });
        if (error && error.code !== "23505") throw error;
        toast("アーカイブに保存しました", "success");
      } else {
        const { error } = await supabase
          .from("saved_news")
          .delete()
          .eq("user_id", user.id)
          .eq("news_id", newsId);
        if (error) throw error;
        toast("保存を解除しました", "info");
      }
    } catch {
      setSavedLocally(newsId, saved);
      toast("保存できませんでした。通信環境を確認してください", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "保存を解除" : "保存する"}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
        saved ? "text-[#4ef5a3]" : "text-fg-muted"
      } active:bg-white/10`}
    >
      <motion.span animate={controls} className="inline-flex">
        <Bookmark size={16} fill={saved ? "#4ef5a3" : "transparent"} strokeWidth={2} />
      </motion.span>
      {withLabel && <span>{saved ? "保存済み" : "保存"}</span>}
    </button>
  );
}
