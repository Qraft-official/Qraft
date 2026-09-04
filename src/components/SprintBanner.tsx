"use client";

import { PULSE_NAME } from "@/lib/constants";
import { getNextRelease } from "@/lib/sprint";
import { useApp } from "@/lib/store";
import { Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SprintBanner() {
  const { sprint, sprintUnlocked } = useApp();
  const router = useRouter();
  const [toNext, setToNext] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = getNextRelease().getTime() - Date.now();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setToNext(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const status = sprint.submittedAt
    ? "提出済み"
    : sprint.timedOut
      ? "タイムアウト"
      : sprint.startedAt
        ? "挑戦中"
        : "10分一本勝負";

  return (
    <button
      type="button"
      onClick={() => router.push("/sprint")}
      className="mx-4 mt-2 flex w-[calc(100%-2rem)] min-h-11 items-center gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-left"
    >
      <Flame className="shrink-0 text-orange-400" size={18} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{PULSE_NAME}</span>
        <span className="block text-xs text-muted">毎日21時の共通問題 · {status}</span>
      </span>
      <span className="shrink-0 text-right text-xs font-bold text-aha">
        {toNext}
        {sprintUnlocked ? <span className="mt-0.5 block text-purple-300">Live</span> : null}
      </span>
    </button>
  );
}
