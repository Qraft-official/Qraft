"use client";

import { PostCard } from "@/components/PostCard";
import { PULSE_NAME } from "@/lib/constants";
import { getNextPulseRelease } from "@/lib/jst";
import { useApp } from "@/lib/store";
import { Flame } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function nextPulseLabel(now = Date.now()) {
  const next = getNextPulseRelease(new Date(now));
  const ms = Math.max(0, next.getTime() - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h <= 0 && m <= 0) return "次のPULSEは21:00";
  if (h <= 0) return `次の問題まで ${m}分`;
  return `次の問題まで ${h}時間${m}分`;
}

export function PulseHome() {
  const { officialPost, authenticated, openComposer } = useApp();
  const [label, setLabel] = useState(() => nextPulseLabel());

  useEffect(() => {
    const tick = () => setLabel(nextPulseLabel());
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, []);

  const livePost = officialPost.title ? officialPost : null;

  return (
    <div>
      <div className="mx-4 mt-3 rounded-2xl border border-neon/40 bg-neon/10 px-4 py-4">
        <p className="flex items-center gap-2 text-sm font-black text-purple-200">
          <Flame size={16} className="text-orange-400" />
          {PULSE_NAME}
        </p>
        <p className="mt-1 text-xs text-muted">毎日21時の共通問題</p>
        <p className="mt-2 text-sm font-bold text-white">{label}</p>
        {livePost ? (
          <Link
            href="/sprint"
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-aha px-4 text-sm font-black text-black"
          >
            このPULSEに挑戦
          </Link>
        ) : null}
      </div>

      {livePost ? <PostCard post={livePost} /> : (
        <p className="px-4 py-6 text-sm text-muted">公開済みのPULSEはまだありません。</p>
      )}

      <div className="grid grid-cols-2 gap-2 px-4 py-4">
        <Link
          href="/sprint/archive"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-700 text-sm font-bold"
        >
          過去のPULSEを見る
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
