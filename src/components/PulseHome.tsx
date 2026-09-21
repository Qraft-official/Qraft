"use client";

import { PostCard } from "@/components/PostCard";
import { PULSE_NAME } from "@/lib/constants";
import { getNextPulseRelease, isPulseOpenAt, jstDateString } from "@/lib/jst";
import { useApp } from "@/lib/store";
import { Flame } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function formatCountdown(ms: number) {
  const clamped = Math.max(0, ms);
  const h = Math.floor(clamped / 3600000);
  const m = Math.floor((clamped % 3600000) / 60000);
  const s = Math.floor((clamped % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PulseHome() {
  const { officialPost, authenticated, openComposer } = useApp();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const today = jstDateString(new Date(now));
  const live = isPulseOpenAt(today, new Date(now));
  const next = getNextPulseRelease(new Date(now));
  const remain = formatCountdown(next.getTime() - now);
  const todayPost = live && officialPost?.sprintDay === today ? officialPost : null;

  return (
    <div>
      <div className="mx-4 mt-3 rounded-2xl border border-neon/40 bg-neon/10 px-4 py-4">
        <p className="flex items-center gap-2 text-sm font-black text-purple-200">
          <Flame size={16} className="text-orange-400" />
          {PULSE_NAME}
        </p>
        {live && todayPost ? (
          <>
            <p className="mt-1 text-xs text-muted">本日 {today} · 21:00 公開</p>
            <Link
              href="/sprint"
              className="mt-3 inline-flex min-h-11 items-center rounded-full bg-aha px-4 text-sm font-black text-black"
            >
              今日のPULSEに挑戦
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-lg font-black text-white">今日のPULSEは21:00に公開</p>
            <p className="mt-1 text-sm text-muted">公開まで {remain}</p>
          </>
        )}
      </div>

      {todayPost ? <PostCard post={todayPost} /> : null}

      <div className="grid grid-cols-2 gap-2 px-4 py-4">
        <Link
          href="/sprint/archive"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 text-sm font-bold"
        >
          過去のPULSE
        </Link>
        {authenticated ? (
          <Link
            href="/sprint/stats"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 text-sm font-bold"
          >
            戦績
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 text-sm font-bold text-muted"
          >
            ログインして戦績
          </Link>
        )}
      </div>

      <p className="px-4 pb-4 text-center text-[11px] text-muted">
        <button
          type="button"
          className="text-sky-400"
          onClick={() => openComposer({ open: true, mode: "problem", isSprint: true })}
        >
          コミュニティ応募（メール）
        </button>
      </p>
    </div>
  );
}
