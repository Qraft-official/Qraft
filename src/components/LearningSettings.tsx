"use client";

import { SUBJECTS, TIER_NAMES } from "@/lib/constants";
import type { Subject, Tier, Tiers } from "@/lib/types";

export const TIER_BANDS: { label: string; hint: string; tiers: Tier[] }[] = [
  { label: "基礎", hint: "入門〜基本", tiers: [1, 2] },
  { label: "応用", hint: "標準〜発展手前", tiers: [3] },
  { label: "発展", hint: "難問・探究", tiers: [4, 5] },
];

function bandFor(tier: Tier) {
  return TIER_BANDS.find((b) => b.tiers.includes(tier)) ?? TIER_BANDS[0];
}

export function AgePicker({
  age,
  onChange,
}: {
  age: number | null;
  onChange: (n: number | null) => void;
}) {
  const sliderValue = Math.min(100, age ?? 0);
  return (
    <div className="rounded-3xl border border-gray-800 bg-panel p-4">
      <p className="text-lg font-bold">年齢</p>
      <p className="mt-2 rounded-2xl bg-aha/10 px-3 py-2 text-[12px] leading-relaxed text-aha">
        0歳〜上限なし。何歳からでも学べるアプリです。年齢によるレベル制限はありません。
      </p>
      <div className="mt-4 flex items-end gap-2">
        <input
          type="number"
          min={0}
          max={130}
          value={age === null ? "" : age}
          placeholder="任意"
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
              return;
            }
            const n = Number(raw);
            if (Number.isFinite(n)) onChange(Math.max(0, Math.min(130, Math.floor(n))));
          }}
          className="w-24 rounded-xl border border-gray-800 bg-black px-3 py-2 text-lg font-black text-white outline-none"
        />
        <span className="pb-2 text-sm text-muted">歳</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={sliderValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-4 w-full accent-aha"
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>0歳</span>
        <span>100歳（スライダー上限。手入力でそれ以上も可）</span>
      </div>
    </div>
  );
}

export function SubjectLevelPickers({
  tiers,
  onChange,
}: {
  tiers: Tiers;
  onChange: (next: Tiers) => void;
}) {
  const setTier = (s: Subject, t: Tier) => onChange({ ...tiers, [s]: t });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-1 rounded-2xl border border-gray-800 bg-black/40 px-2 py-2 text-center text-[11px] font-bold">
        <span className="flex-1 text-sky-300">基礎</span>
        <span className="text-muted">➔</span>
        <span className="flex-1 text-aha">応用</span>
        <span className="text-muted">➔</span>
        <span className="flex-1 text-orange-300">発展</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="flex h-full">
          <div className="w-[40%] bg-sky-400/80" />
          <div className="w-[20%] bg-aha/90" />
          <div className="w-[40%] bg-orange-400/80" />
        </div>
      </div>
      <p className="text-center text-[10px] text-muted">難易度の流れ：基礎 ➔ 応用 ➔ 発展</p>

      {SUBJECTS.map((s) => {
        const current = tiers[s.id];
        const band = bandFor(current);
        return (
          <div key={s.id} className="rounded-3xl border border-gray-800 bg-panel p-4">
            <p className="text-lg font-bold">
              {s.emoji} {s.label}
            </p>
            <p className="mt-1 text-xs text-purple-300">
              Tier {current} · {TIER_NAMES[s.id][current]} · {band.label}
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as Tier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(s.id, t)}
                  className={`rounded-xl py-3 text-sm font-black ${
                    current === t ? "bg-neon text-white glow-purple" : "bg-white/5 text-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[9px] text-muted">
              <span>1–2 基礎</span>
              <span>3 応用</span>
              <span>4–5 発展</span>
            </div>
          </div>
        );
      })}
      <p className="text-center text-[11px] leading-relaxed text-muted">
        ※選択したレベルは後から設定画面でいつでも変更できます
      </p>
    </div>
  );
}
