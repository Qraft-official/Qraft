"use client";

import { PostCard } from "@/components/PostCard";
import { PULSE_BLURB, PULSE_NAME } from "@/lib/constants";
import { formatTimer } from "@/lib/sprint";
import { fetchSprintReveal, type SprintReveal } from "@/lib/sprint-client";
import { remainingTo } from "@/lib/sprint-schedule";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";
import { ArrowLeft, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SprintPage() {
  const router = useRouter();
  const {
    officialPost,
    pulseTeaser,
    sprint,
    sprintUnlocked,
    submitSprint,
    hasPremium,
    bgmOn,
    setBgmOn,
    openPaywall,
    openComposer,
    refreshPulse,
  } = useApp();
  const [now, setNow] = useState(() => Date.now());
  const [submitError, setSubmitError] = useState("");
  const [reveal, setReveal] = useState<SprintReveal | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void refreshPulse();
    const id = window.setInterval(() => void refreshPulse(), 20000);
    return () => window.clearInterval(id);
  }, [refreshPulse]);

  useEffect(() => {
    if (!sprintUnlocked || !officialPost) {
      setReveal(null);
      return;
    }
    void fetchSprintReveal(officialPost.id).then(setReveal);
  }, [sprintUnlocked, officialPost]);

  const opensAt = pulseTeaser?.opensAt;
  const closesAt = pulseTeaser?.closesAt || officialPost?.publishAt;
  const openMs = opensAt ? new Date(opensAt).getTime() : 0;
  const closeMs = closesAt ? new Date(closesAt).getTime() : 0;
  const published = Boolean(officialPost) && (!openMs || now >= openMs);
  const live = published && closeMs > 0 && now < closeMs;
  const leftOpen = opensAt ? remainingTo(opensAt, new Date(now)) : 0;
  const leftClose = closesAt ? remainingTo(closesAt, new Date(now)) : 0;

  const openQuoteComposer = () => {
    if (!officialPost) return;
    openComposer({
      open: true,
      mode: "solution",
      quotePostId: officialPost.id,
    });
  };

  return (
    <div className="min-h-dvh pb-8">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-black/80 px-3 py-3 backdrop-blur">
        <button type="button" onClick={() => router.push("/")} className="text-white">
          <ArrowLeft size={20} />
        </button>
        <p className="font-bold">{PULSE_NAME}</p>
      </header>

      {!published && (
        <div className="px-5 py-6">
          <p className="text-sm font-bold text-aha">今日の21時問題</p>
          <h1 className="mt-2 text-3xl font-black">21:00 OPEN</h1>
          <p className="mt-3 text-sm text-muted">{PULSE_BLURB}</p>
          <p className="mt-4 font-mono text-4xl font-black text-aha">{formatTimer(leftOpen)}</p>
          <p className="mt-3 text-sm text-muted">公開まで問題本文は表示されません。</p>
        </div>
      )}

      {published && officialPost && (
        <>
          <div className="px-4 py-3">
            <p className="text-[11px] font-bold tracking-wide text-aha">21:00 CHALLENGE</p>
            <p className="text-lg font-black">今日の1問</p>
            {live ? (
              <motion.p className="mt-1 font-mono text-3xl font-black text-aha">
                残り {formatTimer(leftClose)}
              </motion.p>
            ) : (
              <p className="mt-1 text-sm text-muted">制限時間終了</p>
            )}
            {officialPost.topic ? (
              <p className="mt-1 text-[11px] text-muted">{officialPost.topic}</p>
            ) : null}
          </div>
          <PostCard post={officialPost} />
          {sprintUnlocked && reveal?.explanation ? (
            <div className="mx-4 mt-3 rounded-2xl border border-gray-800 bg-panel p-4">
              <p className="text-xs font-bold text-muted">解説</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{reveal.explanation}</p>
              {reveal.hint ? <p className="mt-2 text-xs text-muted">ヒント: {reveal.hint}</p> : null}
            </div>
          ) : null}
          {submitError && <p className="px-4 text-sm text-red-400">{submitError}</p>}
          <div className="px-4 pt-3">
            {live && !sprintUnlocked ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                onClick={openQuoteComposer}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-aha py-4 text-base font-black text-black"
              >
                <PenLine size={18} />
                引用して解法を投稿
              </motion.button>
            ) : null}
            {live && !sprintUnlocked ? (
              <button
                type="button"
                onClick={() => {
                  setSubmitError("");
                  void submitSprint(sprint.pages).then((res) => {
                    if (res?.error) setSubmitError(res.error);
                  });
                }}
                className="mt-2 w-full rounded-full border border-gray-700 py-3 text-sm font-bold"
              >
                提出する（制限時間内）
              </button>
            ) : null}
            {!live && !sprintUnlocked ? (
              <p className="text-center text-sm text-muted">提出していないため、他の人の解答は表示されません。</p>
            ) : null}
            {sprintUnlocked ? (
              <p className="text-center text-sm text-aha">提出済み — 解説とコメントが開放されます。</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!hasPremium) {
                openPaywall("フォーカス BGM は Qraft Premium（月額¥400）限定です。");
                return;
              }
              setBgmOn(!bgmOn);
            }}
            className="mt-3 px-4 pb-4 text-center text-xs text-muted"
          >
            🎵 BGM {hasPremium ? (bgmOn ? "ON" : "OFF") : "Premium"}
          </button>
        </>
      )}
    </div>
  );
}
