"use client";

import { SUBJECTS, TIER_NAMES } from "@/lib/constants";
import { useApp } from "@/lib/store";
import type { Subject, Tier, Tiers } from "@/lib/types";
import { motion } from "framer-motion";
import { useState } from "react";

export function Onboarding() {
  const { completeOnboarding } = useApp();
  const [tiers, setTiers] = useState<Tiers>({ math: 1, physics: 1, chemistry: 1 });

  const setTier = (s: Subject, t: Tier) => setTiers((p) => ({ ...p, [s]: t }));

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black px-5 py-10">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-bold tracking-[0.2em] text-aha">AHA!</p>
        <h1 className="mt-2 text-3xl font-black leading-tight">
          あなたの現在地を
          <br />
          3科目で選べ。
        </h1>
        <p className="mt-3 text-sm text-muted">
          あとからいつでも上がれる。まずは正直なスタート地点から。
        </p>

        <div className="mt-8 space-y-6">
          {SUBJECTS.map((s) => (
            <div key={s.id} className="rounded-3xl border border-gray-800 bg-panel p-4">
              <p className="text-lg font-bold">
                {s.emoji} {s.label}
              </p>
              <p className="mt-1 text-xs text-purple-300">
                Tier {tiers[s.id]} · {TIER_NAMES[s.id][tiers[s.id]]}
              </p>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {([1, 2, 3, 4, 5] as Tier[]).map((t) => (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setTier(s.id, t)}
                    className={`rounded-xl py-3 text-sm font-black ${
                      tiers[s.id] === t
                        ? "bg-neon text-white glow-purple"
                        : "bg-white/5 text-muted"
                    }`}
                  >
                    {t}
                  </motion.button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                {([1, 2, 3, 4, 5] as Tier[]).map((t) => (
                  <span key={t} className="mr-2">
                    {t}:{TIER_NAMES[s.id][t]}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => completeOnboarding(tiers)}
          className="glow-lime mt-8 w-full rounded-full bg-aha py-4 text-base font-black text-black"
        >
          アハ！を始める
        </motion.button>
      </div>
    </div>
  );
}
