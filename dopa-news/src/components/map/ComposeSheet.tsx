"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Loader2, MapPin, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import Toggle from "@/components/ui/Toggle";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { areaLabel } from "@/lib/geo";
import { MAP_SEGMENTS, categoriesFor } from "@/lib/map-categories";
import { MapPostError, createMapPost } from "@/lib/map-queries";
import { getSupabase } from "@/lib/supabase/client";
import type { MapPostType, MapPostWithAuthor } from "@/types/database";

interface ComposeSheetProps {
  open: boolean;
  onClose: () => void;
  defaultType: MapPostType;
  coords: { lat: number; lng: number } | null;
  locating: boolean;
  onRequestLocation: () => void;
  onCreated: (post: MapPostWithAuthor) => void;
}

const MAX_COMMENT = 100;

export default function ComposeSheet({
  open,
  onClose,
  defaultType,
  coords,
  locating,
  onRequestLocation,
  onCreated,
}: ComposeSheetProps) {
  const { user } = useSession();
  const { toast } = useToast();
  const [type, setType] = useState<MapPostType>(defaultType);
  const [category, setCategory] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [urgency, setUrgency] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setCategory(null);
      setComment("");
      setUrgency(false);
    }
  }, [open, defaultType]);

  const options = useMemo(() => categoriesFor(type), [type]);
  const area = coords ? areaLabel(coords) : null;
  const canSubmit = Boolean(user && coords && category) && !submitting;

  async function submit() {
    if (!user || !coords || !category || submitting) return;
    setSubmitting(true);
    try {
      const post = await createMapPost(getSupabase(), {
        userId: user.id,
        latitude: coords.lat,
        longitude: coords.lng,
        postType: type,
        category,
        comment,
        urgency,
        area: area ?? "日本国内",
      });
      onCreated(post);
      toast("地図に投稿しました", "success");
      onClose();
    } catch (err) {
      toast(
        err instanceof MapPostError ? err.message : "投稿できませんでした",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="現在地の状況を投稿">
      <div className="flex rounded-2xl border border-line bg-ink-900 p-1">
        {MAP_SEGMENTS.map((segment) => {
          const active = segment.type === type;
          return (
            <button
              key={segment.type}
              type="button"
              onClick={() => {
                setType(segment.type);
                setCategory(null);
              }}
              className={`relative flex-1 rounded-xl px-3 py-2 text-[12.5px] font-bold transition-colors ${
                active ? "text-[#08131a]" : "text-fg-muted"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="compose-segment"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="grad-cta absolute inset-0 rounded-xl"
                />
              )}
              <span className="relative">
                {segment.emoji} {segment.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[13.5px] font-bold text-fg">
        {type === "weather" ? "いまの天気は？" : "いま何が起きてる？"}
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {options.map((option) => {
          const active = category === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setCategory(active ? null : option.id)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 transition-all ${
                active
                  ? "border-[#4ef5a3] bg-[#4ef5a3]/10 text-[#4ef5a3] shadow-[0_0_18px_-4px_rgba(78,245,163,0.75)]"
                  : "border-line bg-ink-700 text-fg-muted active:bg-ink-600"
              }`}
            >
              <span className="text-[21px] leading-none">{option.emoji}</span>
              <span className="text-[11px] font-bold">{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label htmlFor="dopa-comment" className="text-[12.5px] font-bold text-fg">
          ひとことコメント
        </label>
        <textarea
          id="dopa-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          rows={2}
          placeholder="ひとことコメント（例：駅前で急に土砂降りです）"
          className="mt-1.5 w-full resize-none rounded-2xl border border-line bg-ink-700 px-3.5 py-3 text-[13.5px] leading-relaxed text-fg outline-none placeholder:text-fg-faint focus:border-[#35dcff]/50"
        />
        <p className="mt-1 text-right text-[10.5px] text-fg-faint">
          {comment.length} / {MAX_COMMENT}
        </p>
      </div>

      <div className="mt-1 rounded-2xl border border-line bg-ink-700 px-3.5 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#ff5c7a]/15 text-[#ff5c7a]">
            <ShieldAlert size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-fg">🚨 緊急度が高い</span>
            <span className="block text-[11px] text-fg-muted">すぐ周知したいときだけON</span>
          </span>
          <Toggle
            checked={urgency}
            onChange={setUrgency}
            label="緊急度が高い"
            accent="#ff5c7a"
          />
        </div>
        {urgency && (
          <p className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-[#ff5c7a]/[0.08] px-2.5 py-2 text-[10.5px] leading-relaxed text-[#ff5c7a]">
            <AlertTriangle size={12} className="mt-[2px] shrink-0" />
            緊急投稿は地図で強調表示されます。不要な使用が続くと投稿が制限されることがあります。
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-ink-900 px-3.5 py-2.5">
        <MapPin size={14} className="shrink-0 text-[#35dcff]" />
        <span className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-fg-muted">
          {coords
            ? `${area}付近に投稿します（座標は約100m単位に丸めて保存されます）`
            : "投稿には現在地の取得が必要です"}
        </span>
        {!coords && (
          <button
            type="button"
            onClick={onRequestLocation}
            disabled={locating}
            className="shrink-0 rounded-full border border-line-strong px-3 py-1.5 text-[11.5px] font-bold text-fg active:bg-white/10 disabled:opacity-60"
          >
            {locating ? "取得中…" : "現在地を取得"}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!canSubmit}
        className={`grad-cta mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-black text-[#07121a] transition-opacity ${
          canSubmit ? "active:opacity-90" : "opacity-40"
        }`}
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        現在地に投稿
      </button>

      {!category && (
        <p className="mt-2 text-center text-[11px] text-fg-faint">
          {type === "weather" ? "天気" : "できごと"}を1つ選んでください
        </p>
      )}
    </BottomSheet>
  );
}
