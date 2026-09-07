"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Flag, MapPin, Share2, ThumbsUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { relativeTime } from "@/lib/format";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { REPORT_REASONS, mapCategory } from "@/lib/map-categories";
import { nearbyReportCount, submitReport, toggleHelpful } from "@/lib/map-queries";
import { getSupabase } from "@/lib/supabase/client";
import type { MapPostWithAuthor } from "@/types/database";

interface PostSheetProps {
  post: MapPostWithAuthor | null;
  onClose: () => void;
  userCoords: { lat: number; lng: number } | null;
  helpfulIds: Set<string>;
  onHelpfulChange: (postId: string, next: boolean, delta: number) => void;
}

export default function PostSheet({
  post,
  onClose,
  userCoords,
  helpfulIds,
  onHelpfulChange,
}: PostSheetProps) {
  const { user } = useSession();
  const gate = useAuthGate();
  const { toast } = useToast();
  const [nearby, setNearby] = useState<number | null>(null);
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReporting(false);
    setNearby(null);
    if (!post) return;
    let active = true;
    void nearbyReportCount(getSupabase(), post).then((count) => {
      if (active) setNearby(count);
    });
    return () => {
      active = false;
    };
  }, [post]);

  if (!post) return null;

  const meta = mapCategory(post.category);
  const helpful = helpfulIds.has(post.id);
  const distance = userCoords
    ? formatDistance(
        distanceMeters(userCoords, { lat: post.latitude, lng: post.longitude }),
      )
    : null;

  async function react() {
    if (!post || !gate("「役に立った」")) return;
    if (!user || busy) return;
    const next = !helpful;
    setBusy(true);
    onHelpfulChange(post.id, next, next ? 1 : -1);
    try {
      await toggleHelpful(getSupabase(), post.id, user.id, next);
    } catch {
      onHelpfulChange(post.id, !next, next ? -1 : 1);
      toast("反応を送信できませんでした", "error");
    } finally {
      setBusy(false);
    }
  }

  async function report(reason: string) {
    if (!post || !gate("通報")) return;
    if (!user) return;
    try {
      await submitReport(getSupabase(), {
        userId: user.id,
        targetType: "map_post",
        targetId: post.id,
        reason,
      });
      toast("通報を受け付けました。確認します", "success");
      setReporting(false);
    } catch {
      toast("通報を送信できませんでした", "error");
    }
  }

  async function share() {
    if (!post) return;
    const text = `${meta.emoji} ${meta.label} - ${post.area ?? ""}${post.comment ? `「${post.comment}」` : ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "ドパマップ", text, url: window.location.href });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      toast("内容をコピーしました", "success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast("共有できませんでした", "error");
    }
  }

  return (
    <BottomSheet open onClose={onClose} maxHeight="72dvh">
      <div className="flex items-start gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[24px]"
          style={{
            background: `${meta.color}1c`,
            border: `1.5px solid ${meta.color}66`,
            boxShadow: `0 0 20px -6px ${meta.color}aa`,
          }}
        >
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-[17px] font-black text-fg">{meta.label}</h2>
            {post.urgency && (
              <span className="rounded-md border border-[#ff5c7a]/50 bg-[#ff5c7a]/15 px-1.5 py-[2px] text-[10px] font-bold text-[#ff5c7a]">
                🚨 緊急
              </span>
            )}
            {post.is_official && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[#4ef5a3]/45 bg-[#4ef5a3]/12 px-1.5 py-[2px] text-[10px] font-bold text-[#4ef5a3]">
                <BadgeCheck size={11} /> 公式情報
              </span>
            )}
            {post.is_sample && (
              <span className="rounded-md border border-line-strong px-1.5 py-[2px] text-[10px] font-bold text-fg-faint">
                開発用サンプル
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-fg-muted">
            <span>{relativeTime(post.created_at)}</span>
            <span className="text-fg-faint">・</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} />
              {post.area ?? "日本国内"}
            </span>
            {distance && (
              <>
                <span className="text-fg-faint">・</span>
                <span>現在地から{distance}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {post.comment && (
        <p className="mt-3.5 rounded-2xl border border-line bg-ink-700 px-3.5 py-3 text-[14px] leading-relaxed text-fg">
          「{post.comment}」
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="text-[11.5px] text-fg-faint">投稿者: {post.author_name}</span>
        {nearby !== null && nearby > 1 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#35dcff]/35 bg-[#35dcff]/10 px-2 py-[3px] text-[11px] font-bold text-[#35dcff]">
            <Users size={11} />
            この周辺で{nearby}人が報告
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => void react()}
          disabled={busy}
          aria-pressed={helpful}
          className={`flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-[12.5px] font-bold transition-colors ${
            helpful
              ? "border-[#4ef5a3]/55 bg-[#4ef5a3]/12 text-[#4ef5a3]"
              : "border-line bg-ink-700 text-fg-muted active:bg-ink-600"
          }`}
        >
          <motion.span animate={helpful ? { scale: [1, 1.28, 1] } : { scale: 1 }}>
            <ThumbsUp size={15} fill={helpful ? "#4ef5a3" : "transparent"} />
          </motion.span>
          役に立った {post.helpful_count}
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-ink-700 px-2 py-3 text-[12.5px] font-bold text-fg-muted active:bg-ink-600"
        >
          <Share2 size={15} />
          共有
        </button>
        <button
          type="button"
          onClick={() => setReporting((v) => !v)}
          className="flex items-center justify-center gap-1.5 rounded-2xl border border-line bg-ink-700 px-2 py-3 text-[12.5px] font-bold text-fg-muted active:bg-ink-600"
        >
          <Flag size={15} />
          通報
        </button>
      </div>

      {reporting && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 overflow-hidden rounded-2xl border border-line bg-ink-700 p-3"
        >
          <p className="mb-2 text-[12px] font-bold text-fg">通報の理由を選んでください</p>
          <div className="flex flex-wrap gap-1.5">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => void report(reason)}
                className="rounded-full border border-line-strong px-3 py-1.5 text-[11.5px] font-semibold text-fg-muted active:bg-white/10"
              >
                {reason}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <p className="mt-3.5 text-[10.5px] leading-relaxed text-fg-faint">
        ユーザー投稿は個人の目撃情報であり、内容の正確性は保証されません。避難や移動の判断は、必ず自治体や交通事業者の公式発表を確認してください。
      </p>
    </BottomSheet>
  );
}
