"use client";

import { formatTimer, getNextRelease } from "@/lib/sprint";
import { useApp } from "@/lib/store";
import { motion } from "framer-motion";
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
    ? "提出済み — みんなの解答が開放"
    : sprint.timedOut
      ? "タイムアウト — 解答フィード開放"
      : sprint.startedAt
        ? "挑戦中"
        : "いつでもスタート可（開始後は10分一本勝負）";

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push("/sprint")}
      className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-2xl border border-orange-500/40 bg-gradient-to-r from-orange-500/20 via-purple-600/20 to-aha/10 p-4 text-left"
    >
      <div className="flex items-center gap-2 text-sm font-black">
        <Flame className="text-orange-400" size={18} />
        21:00問題 公開中（10分一本勝負）
      </div>
      <p className="mt-1 text-xs text-muted">{status}</p>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-aha">次の全国戦まで {toNext}</span>
        {sprintUnlocked && <span className="text-purple-300">Live 精度開放中</span>}
      </div>
    </motion.button>
  );
}
