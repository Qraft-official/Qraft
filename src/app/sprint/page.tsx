"use client";

import { MultiPageCanvas } from "@/components/MultiPageCanvas";
import { PostCard } from "@/components/PostCard";
import { formatTimer, remainingMs } from "@/lib/sprint";
import { useApp } from "@/lib/store";
import type { CanvasPage } from "@/lib/types";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function SprintPage() {
  const router = useRouter();
  const {
    officialPost,
    sprint,
    startSprint,
    submitSprint,
    timeoutSprint,
    updateSprintPages,
    community,
    sprintUnlocked,
    hasPremium,
    bgmOn,
    setBgmOn,
    openPaywall,
    posts,
  } = useApp();
  const [now, setNow] = useState(Date.now());
  const [pages, setPages] = useState<CanvasPage[]>(sprint.pages);

  useEffect(() => {
    setPages(sprint.pages);
  }, [sprint.pages]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const left = sprint.startedAt ? remainingMs(sprint.startedAt, now) : null;
  const running = !!sprint.startedAt && !sprint.submittedAt && !sprint.timedOut;

  useEffect(() => {
    if (running && left !== null && left <= 0) timeoutSprint();
  }, [running, left, timeoutSprint]);

  const live = useMemo(() => {
    const accuracy = sprint.submittedAt ? 91 : sprint.timedOut ? 0 : 0;
    const avg = "6:18";
    return { accuracy, avg, n: 12840 };
  }, [sprint.submittedAt, sprint.timedOut]);

  const onPages = (next: CanvasPage[]) => {
    setPages(next);
    updateSprintPages(next);
  };

  if (sprintUnlocked) {
    return (
      <div className="min-h-dvh pb-8">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-black/80 px-3 py-3 backdrop-blur">
          <button onClick={() => router.push("/")} className="text-white">
            <ArrowLeft size={20} />
          </button>
          <p className="font-bold">全国戦 結果</p>
        </header>
        <div className="mx-4 mt-4 rounded-2xl border border-gray-800 bg-panel p-4">
          <p className="text-xs text-muted">LIVE</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-black text-aha">
                {sprint.timedOut ? "—" : `${live.accuracy}%`}
              </p>
              <p className="text-[11px] text-muted">正解率</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{live.avg}</p>
              <p className="text-[11px] text-muted">平均解答時間</p>
            </div>
            <div>
              <p className="text-2xl font-black text-purple-300">
                {live.n.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted">挑戦者</p>
            </div>
          </div>
          <p className="mt-3 text-center text-sm font-bold text-aha">
            みんなの解答 開放
          </p>
        </div>
        <PostCard post={officialPost} />
        {posts
          .filter((p) => (p.isSprint || p.kind === "sprint") && p.id !== officialPost.id)
          .map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        {community.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    );
  }

  if (!sprint.startedAt) {
    return (
      <div className="flex min-h-dvh flex-col px-5 py-6">
        <button onClick={() => router.push("/")} className="self-start text-muted">
          <ArrowLeft size={20} />
        </button>
        <p className="mt-8 text-sm font-bold text-orange-400">🔥 21:00全国戦</p>
        <h1 className="mt-2 text-3xl font-black">10分一本勝負</h1>
        <p className="mt-3 text-sm text-muted">
          開始した瞬間からカウントダウン。提出しなければタイムアウト。次の 21:00 まで何度でも待てるが、一度スタートしたら逃げられない。
        </p>
        <div className="mt-6 rounded-2xl border border-gray-800 bg-panel p-4">
          <PostCard post={officialPost} />
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={startSprint}
          className="glow-lime mt-auto rounded-full bg-aha py-4 text-base font-black text-black"
        >
          Start Challenge
        </motion.button>
        <button
          type="button"
          onClick={() => {
            if (!hasPremium) {
              openPaywall("フォーカス BGM は Qraft Premium（月額¥300）限定です。");
              return;
            }
            setBgmOn(!bgmOn);
          }}
          className="mt-3 pb-4 text-center text-xs text-muted"
        >
          🎵 解答 BGM {hasPremium ? (bgmOn ? "ON" : "OFF") : "· Premium"}
        </button>
      </div>
    );
  }

  const danger = left !== null && left < 30000;

  return (
    <div className="flex h-dvh flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs font-bold text-muted">CHALLENGE</p>
        <motion.p
          key={left}
          animate={{ scale: danger ? [1, 1.08, 1] : 1 }}
          className={`font-mono text-4xl font-black ${danger ? "text-red-500" : "text-aha"}`}
        >
          {formatTimer(left ?? 0)}
        </motion.p>
        <button
          onClick={() => submitSprint(pages)}
          className="rounded-full bg-neon px-3 py-1.5 text-xs font-bold"
        >
          提出
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!hasPremium) {
            openPaywall("フォーカス BGM は Qraft Premium（月額¥300）限定です。");
            return;
          }
          setBgmOn(!bgmOn);
        }}
        className="px-4 pb-1 text-right text-[11px] text-muted"
      >
        🎵 BGM {hasPremium ? (bgmOn ? "ON" : "OFF") : "Premium"}
      </button>
      <MultiPageCanvas pages={pages} onChange={onPages} className="min-h-0 flex-1" premium={hasPremium} />
    </div>
  );
}
