"use client";

import { PostCard } from "@/components/PostCard";
import { PULSE_BLURB, PULSE_NAME } from "@/lib/constants";
import { playCorrectFeedback, unlockCorrectFeedback } from "@/lib/correct-feedback";
import { getNextPulseRelease, isPulseOpenAt, jstDateString } from "@/lib/jst";
import { referralFetch } from "@/lib/referral-client";
import { formatTimer, remainingMs } from "@/lib/sprint";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";
import { ArrowLeft, PenLine } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SprintPage() {
  const router = useRouter();
  const {
    officialPost,
    sprint,
    startSprint,
    submitSprint,
    timeoutSprint,
    sprintUnlocked,
    hasPremium,
    bgmOn,
    setBgmOn,
    openPaywall,
    openComposer,
  } = useApp();
  const [now, setNow] = useState(Date.now());
  const [answer, setAnswer] = useState("");
  const [gradeLabel, setGradeLabel] = useState("");
  const [gradeBusy, setGradeBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const today = jstDateString(new Date(now));
  const live = isPulseOpenAt(today, new Date(now));
  const todayPost = live && officialPost.sprintDay === today && officialPost.title ? officialPost : null;
  const left = sprint.startedAt ? remainingMs(sprint.startedAt, now) : null;
  const running = !!sprint.startedAt && !sprint.submittedAt && !sprint.timedOut;

  useEffect(() => {
    if (running && left !== null && left <= 0) timeoutSprint();
  }, [running, left, timeoutSprint]);

  const openQuoteComposer = () => {
    if (!todayPost) return;
    openComposer({
      open: true,
      mode: "solution",
      quotePostId: todayPost.id,
    });
  };

  if (!live || !todayPost) {
    const remain = Math.max(0, getNextPulseRelease(new Date(now)).getTime() - now);
    const h = Math.floor(remain / 3600000);
    const m = Math.floor((remain % 3600000) / 60000);
    const s = Math.floor((remain % 60000) / 1000);
    return (
      <div className="flex min-h-dvh flex-col px-5 py-6">
        <button onClick={() => router.push("/")} className="self-start text-muted">
          <ArrowLeft size={20} />
        </button>
        <p className="mt-8 text-sm font-bold text-orange-400">🔥 {PULSE_NAME}</p>
        <h1 className="mt-2 text-3xl font-black">今日のPULSEは21:00に公開</h1>
        <p className="mt-3 text-sm text-muted">{PULSE_BLURB}</p>
        <p className="mt-6 font-mono text-4xl font-black text-aha">
          {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
        </p>
        <div className="mt-8 flex flex-col gap-2">
          <Link
            href="/sprint/archive"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 text-sm font-bold"
          >
            過去のPULSEを見る
          </Link>
          <Link
            href="/sprint/stats"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 text-sm font-bold"
          >
            戦績
          </Link>
        </div>
      </div>
    );
  }

  if (sprintUnlocked) {
    return (
      <div className="min-h-dvh pb-8">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-black/80 px-3 py-3 backdrop-blur">
          <button onClick={() => router.push("/")} className="text-white">
            <ArrowLeft size={20} />
          </button>
          <p className="font-bold">{PULSE_NAME} 結果</p>
        </header>
        <PostCard post={todayPost} />
      </div>
    );
  }

  if (!sprint.startedAt) {
    return (
      <div className="flex min-h-dvh flex-col px-5 py-6">
        <button onClick={() => router.push("/")} className="self-start text-muted">
          <ArrowLeft size={20} />
        </button>
        <p className="mt-8 text-sm font-bold text-orange-400">🔥 {PULSE_NAME}</p>
        <h1 className="mt-2 text-3xl font-black">10分一本勝負</h1>
        <p className="mt-3 text-sm text-muted">{PULSE_BLURB}</p>
        <div className="mt-6 rounded-2xl border border-gray-800 bg-panel p-4">
          <PostCard post={todayPost} />
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
              openPaywall("フォーカス BGM は Qraft Premium（月額¥400）限定です。");
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
    <div className="flex min-h-dvh flex-col bg-black pb-8">
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
          type="button"
          onClick={() => submitSprint(sprint.pages)}
          className="rounded-full bg-neon px-3 py-1.5 text-xs font-bold"
        >
          結果を見る
        </button>
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
        className="px-4 pb-1 text-right text-[11px] text-muted"
      >
        🎵 BGM {hasPremium ? (bgmOn ? "ON" : "OFF") : "Premium"}
      </button>
      <p className="px-4 pb-2 text-xs leading-relaxed text-muted">
        通常の引用投稿と同じ流れで、手書きノートまたは打ち込み式ノートを選んで解答できます。
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PostCard post={todayPost} />
      </div>
      <div className="space-y-2 px-4 pt-2">
        <label className="block text-xs font-bold text-muted">
          答え
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-gray-800 bg-panel px-3 text-sm text-white"
            placeholder="数値や式を入力"
          />
        </label>
        {gradeLabel ? <p className="text-sm font-bold text-aha">{gradeLabel}</p> : null}
        <button
          type="button"
          disabled={gradeBusy || !answer.trim()}
          onClick={() => {
            if (gradeBusy) return;
            unlockCorrectFeedback();
            setGradeBusy(true);
            void referralFetch("/api/sprint/grade", {
              method: "POST",
              body: JSON.stringify({ problemId: todayPost.id, answer }),
            }).then((res) => {
              setGradeBusy(false);
              if (res.error) {
                setGradeLabel(res.error);
                return;
              }
              const grade = String((res.data as { grade?: string }).grade ?? "");
              if (grade === "correct") playCorrectFeedback();
              setGradeLabel(
                grade === "correct" ? "正解" : grade === "maybe_correct" ? "ほぼ正解（要確認）" : "不正解",
              );
              submitSprint(sprint.pages);
            });
          }}
          className="min-h-11 w-full rounded-full border border-aha/40 text-sm font-bold text-aha disabled:opacity-40"
        >
          {gradeBusy ? "採点中…" : "答えを送信して採点"}
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={openQuoteComposer}
          className="glow-lime flex w-full items-center justify-center gap-2 rounded-full bg-aha py-4 text-base font-black text-black"
        >
          <PenLine size={18} />
          引用して解法を投稿
        </motion.button>
      </div>
    </div>
  );
}
