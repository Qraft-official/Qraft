"use client";

import { formatTimer } from "@/lib/sprint";
import { remainingTo } from "@/lib/sprint-schedule";
import { useApp } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function PulseChallengeCard() {
  const router = useRouter();
  const { pulseTeaser, officialPost, sprintUnlocks } = useApp();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const opensAt = pulseTeaser?.opensAt;
  const closesAt = pulseTeaser?.closesAt || officialPost?.publishAt;
  const published = Boolean(
    pulseTeaser?.published || (officialPost && (!opensAt || now >= new Date(opensAt).getTime())),
  );
  const liveWindow =
    published && closesAt ? now < new Date(closesAt).getTime() : false;
  const unlocked = officialPost ? !!sprintUnlocks[officialPost.id] : false;

  const countdown = useMemo(() => {
    if (!published && opensAt) return remainingTo(opensAt, new Date(now));
    if (liveWindow && closesAt) return remainingTo(closesAt, new Date(now));
    return 0;
  }, [published, liveWindow, opensAt, closesAt, now]);

  if (!pulseTeaser?.scheduled && !officialPost) return null;

  if (!published) {
    return (
      <button
        type="button"
        onClick={() => router.push("/sprint")}
        className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-2xl border border-aha/30 bg-panel p-4 text-left"
      >
        <p className="text-[11px] font-bold tracking-wide text-aha">今日の21時問題</p>
        <p className="mt-1 text-lg font-black">21:00 OPEN</p>
        <p className="mt-1 font-mono text-sm text-muted">{formatTimer(countdown)}</p>
      </button>
    );
  }

  const snippet = officialPost?.title?.trim() || officialPost?.text?.replace(/\*\*/g, "").slice(0, 80);

  return (
    <button
      type="button"
      onClick={() => router.push("/sprint")}
      className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-2xl border border-aha/40 bg-panel p-4 text-left"
    >
      <p className="text-[11px] font-bold tracking-wide text-aha">21:00 CHALLENGE</p>
      <p className="mt-1 text-lg font-black">今日の1問</p>
      {liveWindow ? (
        <p className="mt-1 font-mono text-sm text-aha">残り {formatTimer(countdown)}</p>
      ) : (
        <p className="mt-1 text-sm text-muted">{unlocked ? "提出済み" : "制限時間終了"}</p>
      )}
      {snippet ? <p className="mt-2 line-clamp-2 text-sm text-white/80">{snippet}</p> : null}
    </button>
  );
}
