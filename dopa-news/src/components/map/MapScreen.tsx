"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Flame, LocateFixed, MapPin, Plus, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ComposeSheet from "./ComposeSheet";
import MapListFallback from "./MapListFallback";
import PostSheet from "./PostSheet";
import type { MapMode } from "./MapCanvas";
import { Spinner } from "@/components/ui/States";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useWebglSupport } from "@/hooks/use-webgl";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { MAP_SEGMENTS } from "@/lib/map-categories";
import { fetchLivePosts, fetchMyHelpfulIds } from "@/lib/map-queries";
import { computeTrends } from "@/lib/trends";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { MapPostType, MapPostWithAuthor } from "@/types/database";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-ink-900 text-fg-faint">
      <Spinner size={22} />
    </div>
  ),
});

const REFRESH_MS = 60_000;

/** Signed-out visitors have no reactions of their own. */
const EMPTY_HELPFUL: ReadonlySet<string> = new Set<string>();

export default function MapScreen() {
  const { user } = useSession();
  const gate = useAuthGate();
  const { toast } = useToast();
  const geo = useGeolocation(true);
  const hasWebgl = useWebglSupport();

  const [type, setType] = useState<MapPostType>("weather");
  const [mode, setMode] = useState<MapMode>("markers");
  const [posts, setPosts] = useState<MapPostWithAuthor[]>([]);
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<MapPostWithAuthor | null>(null);
  const [composing, setComposing] = useState(false);
  const [showTrends, setShowTrends] = useState(true);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [failed, setFailed] = useState(!isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const rows = await fetchLivePosts(getSupabase());
      setPosts(rows);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    // Kick off outside the effect body so the first paint is not blocked by a
    // synchronous state update.
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    let active = true;
    void fetchMyHelpfulIds(getSupabase(), user.id).then((ids) => {
      if (active) setHelpfulIds(ids);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const visiblePosts = useMemo(
    () => posts.filter((post) => post.post_type === type),
    [posts, type],
  );

  const trends = useMemo(() => computeTrends(posts, type), [posts, type]);

  const handleHelpfulChange = useCallback(
    (postId: string, next: boolean, delta: number) => {
      setHelpfulIds((prev) => {
        const updated = new Set(prev);
        if (next) updated.add(postId);
        else updated.delete(postId);
        return updated;
      });
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, helpful_count: Math.max(0, post.helpful_count + delta) }
            : post,
        ),
      );
      setSelected((prev) =>
        prev && prev.id === postId
          ? { ...prev, helpful_count: Math.max(0, prev.helpful_count + delta) }
          : prev,
      );
    },
    [],
  );

  const handleCreated = useCallback((post: MapPostWithAuthor) => {
    setPosts((prev) => [post, ...prev]);
    setType(post.post_type);
    setSelected(post);
  }, []);

  function openCompose() {
    if (!gate("マップへの投稿")) return;
    if (!geo.coords) geo.request();
    setComposing(true);
  }

  function recenter() {
    if (geo.status === "denied") {
      toast("位置情報が許可されていません。ブラウザの設定を確認してください", "info");
      return;
    }
    geo.request();
  }

  const statusText = geo.coords
    ? `現在地を表示中・${visiblePosts.length}件の投稿`
    : geo.status === "denied"
      ? `東京都心を表示中・${visiblePosts.length}件の投稿`
      : `${visiblePosts.length}件の投稿`;

  return (
    <div className="fixed inset-0 mx-auto w-full max-w-[var(--app-max-width)] overflow-hidden">
      {hasWebgl ? (
        <MapCanvas
          posts={visiblePosts}
          mode={mode}
          center={geo.center}
          userCoords={geo.coords}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
        />
      ) : (
        <MapListFallback
          posts={visiblePosts}
          userCoords={geo.coords}
          onSelect={setSelected}
        />
      )}

      {/* ---------- top overlay ---------- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 pad-safe-top">
        <div className="px-3 pt-2.5">
          <div className="glass pointer-events-auto flex rounded-full border border-line p-1">
            {MAP_SEGMENTS.map((segment) => {
              const active = segment.type === type;
              return (
                <button
                  key={segment.type}
                  type="button"
                  onClick={() => {
                    setType(segment.type);
                    setSelected(null);
                  }}
                  aria-pressed={active}
                  className={`relative flex-1 rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors ${
                    active ? "text-[#07121a]" : "text-fg-muted"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="map-segment"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="grad-cta absolute inset-0 rounded-full shadow-[0_0_22px_-6px_rgba(53,220,255,0.9)]"
                    />
                  )}
                  <span className="relative">
                    {segment.emoji} {segment.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="glass pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-[11px] font-semibold text-fg-muted">
              <MapPin size={11} className="text-[#35dcff]" />
              {loading ? "読み込み中…" : failed ? "投稿を取得できませんでした" : statusText}
            </span>
            <div className="pointer-events-auto flex items-center gap-1.5">
              {hasWebgl && (
                <button
                  type="button"
                  onClick={() => setMode((m) => (m === "markers" ? "heat" : "markers"))}
                  aria-pressed={mode === "heat"}
                  className={`glass grid h-9 w-9 place-items-center rounded-full border transition-colors ${
                    mode === "heat"
                      ? "border-[#ff5c7a]/60 text-[#ff5c7a]"
                      : "border-line text-fg-muted"
                  }`}
                  aria-label={
                    mode === "heat" ? "マーカー表示に切り替え" : "ヒートマップ表示に切り替え"
                  }
                >
                  <Flame size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={recenter}
                className="glass grid h-9 w-9 place-items-center rounded-full border border-line text-fg-muted"
                aria-label="現在地へ移動"
              >
                {geo.status === "prompting" ? (
                  <Spinner size={15} />
                ) : geo.coords ? (
                  <LocateFixed size={16} className="text-[#35dcff]" />
                ) : (
                  <Crosshair size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- trends ---------- */}
      {/* Raised clear of the basemap attribution strip pinned above the nav. */}
      <div className="absolute inset-x-0 bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom,0px)+20px)] z-20 px-3 pb-3">
        <AnimatePresence initial={false}>
          {showTrends && trends.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="glass mb-2.5 rounded-2xl border border-line p-3"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-[#4ef5a3]" />
                <h2 className="text-[12px] font-bold text-fg">いま近くで増えている話題</h2>
                <button
                  type="button"
                  onClick={() => setShowTrends(false)}
                  aria-label="トレンドを閉じる"
                  className="ml-auto grid h-6 w-6 place-items-center rounded-full text-fg-faint active:bg-white/10"
                >
                  <X size={13} />
                </button>
              </div>
              <ul className="space-y-1.5">
                {trends.map((trend) => (
                  <li key={trend.key} className="flex items-center gap-2">
                    <span className="text-[15px] leading-none">{trend.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-fg">
                      {trend.place}
                    </span>
                    <span className="text-[11.5px] text-fg-muted">
                      {trend.label} {trend.count}件
                    </span>
                    {trend.surging && (
                      <span
                        className="rounded-md px-1.5 py-[2px] text-[10px] font-black"
                        style={{ color: trend.color, background: `${trend.color}1f` }}
                      >
                        急増
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-2">
          {!showTrends && trends.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowTrends(true)}
              className="glass inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-[11.5px] font-bold text-fg-muted"
            >
              <TrendingUp size={13} className="text-[#4ef5a3]" />
              トレンドを表示
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={openCompose}
            aria-label="現在地の状況を投稿"
            className="grad-cta flex h-14 w-14 items-center justify-center rounded-full text-[#07121a] shadow-[0_10px_32px_-8px_rgba(53,220,255,0.85)] active:scale-95"
          >
            <Plus size={26} strokeWidth={2.8} />
          </button>
        </div>
      </div>

      <PostSheet
        post={selected}
        onClose={() => setSelected(null)}
        userCoords={geo.coords}
        helpfulIds={user ? helpfulIds : EMPTY_HELPFUL}
        onHelpfulChange={handleHelpfulChange}
      />

      <ComposeSheet
        open={composing}
        onClose={() => setComposing(false)}
        defaultType={type}
        coords={geo.coords}
        locating={geo.status === "prompting"}
        onRequestLocation={geo.request}
        onCreated={handleCreated}
      />
    </div>
  );
}
