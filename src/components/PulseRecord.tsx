"use client";

import { EmptyState } from "@/components/UiStates";
import { PULSE_NAME } from "@/lib/constants";
import { jstDateString, jstMonthGrid, jstParts } from "@/lib/jst";
import { fetchMyPulseAttempts, fetchPublishedPulses } from "@/lib/pulse";
import {
  addMonth,
  attemptByDay,
  computePulseStreaks,
  computePulseTotals,
  labelForVisual,
  visualForDay,
  type PulseAttempt,
  type PublishedPulse,
} from "@/lib/pulse-stats";
import { useApp } from "@/lib/store";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const VISUAL_CLASS: Record<string, string> = {
  correct: "bg-aha text-black",
  incorrect: "bg-neon/80 text-white",
  pending: "bg-orange-400/80 text-black",
  unattempted: "border border-gray-600 bg-transparent text-muted",
  none: "bg-white/5 text-muted/50",
  future: "bg-transparent text-muted/40",
};

export function PulseRecord() {
  const router = useRouter();
  const { authenticated } = useApp();
  const todayParts = jstParts();
  const [month, setMonth] = useState(`${todayParts.year}-${String(todayParts.month).padStart(2, "0")}`);
  const [pulses, setPulses] = useState<PublishedPulse[]>([]);
  const [attempts, setAttempts] = useState<PulseAttempt[]>([]);
  const [selected, setSelected] = useState<string | null>(jstDateString());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    void (async () => {
      const [listed, mine] = await Promise.all([fetchPublishedPulses(80), fetchMyPulseAttempts()]);
      if (listed.error) setError(listed.error);
      else setPulses(listed.pulses);
      if (!mine.error) setAttempts(mine.attempts);
    })();
  }, [authenticated]);

  const publishedMap = useMemo(() => {
    const map = new Map<string, PublishedPulse>();
    for (const p of pulses) map.set(p.sprintDay, p);
    return map;
  }, [pulses]);
  const attemptsMap = useMemo(() => attemptByDay(attempts), [attempts]);
  const days = useMemo(() => pulses.map((p) => p.sprintDay), [pulses]);
  const streaks = useMemo(() => computePulseStreaks(days, attempts), [days, attempts]);
  const totals = useMemo(() => computePulseTotals(attempts), [attempts]);
  const [year, monthNum] = month.split("-").map(Number);
  const cells = jstMonthGrid(year, monthNum);
  const maxMonth = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}`;
  const selectedPulse = selected ? publishedMap.get(selected) : undefined;
  const selectedAttempt = selected ? attemptsMap.get(selected) : undefined;
  const selectedVisual = selected
    ? visualForDay(selected, publishedMap, attemptsMap)
    : null;

  if (!authenticated) {
    return (
      <div className="px-4 py-10">
        <EmptyState
          title="戦績はログイン後に確認できます"
          body="PULSEの挑戦結果はサーバーに保存されます。"
          actionHref="/login"
          actionLabel="ログイン"
        />
      </div>
    );
  }

  const accuracy =
    totals.accuracy == null ? "—" : `${Math.round(totals.accuracy * 1000) / 10}%`;

  return (
    <div className="pb-10">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-black/80 px-3 py-3 backdrop-blur">
        <button type="button" onClick={() => router.push("/")} className="text-white" aria-label="戻る">
          <ArrowLeft size={20} />
        </button>
        <p className="font-bold">{PULSE_NAME} 戦績</p>
      </header>

      {error ? <p className="px-4 py-3 text-sm text-red-300">{error}</p> : null}

      <section className="grid grid-cols-5 gap-1 px-3 py-3 text-center">
        {[
          ["挑戦", String(totals.attempted)],
          ["正解", String(totals.correct)],
          ["正答率", accuracy],
          ["連続", String(streaks.current)],
          ["最長", String(streaks.longest)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-gray-800 bg-panel px-1 py-2">
            <p className="text-base font-black text-white">{v}</p>
            <p className="text-[10px] text-muted">{k}</p>
          </div>
        ))}
      </section>

      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          aria-label="前の月"
          onClick={() => setMonth((m) => addMonth(m, -1))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-700"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-black">
          {year}年{monthNum}月
        </p>
        <button
          type="button"
          aria-label="次の月"
          disabled={month >= maxMonth}
          onClick={() => setMonth((m) => addMonth(m, 1))}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-700 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 text-center text-[10px] text-muted">
        {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 px-3">
        {cells.map((cell, i) => {
          if (!cell.date) return <span key={`e-${i}`} className="aspect-square" />;
          const visual = visualForDay(cell.date, publishedMap, attemptsMap);
          const isSel = selected === cell.date;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => setSelected(cell.date)}
              className={`aspect-square rounded-md text-[11px] font-bold ${VISUAL_CLASS[visual]} ${
                isSel ? "ring-2 ring-white" : ""
              }`}
            >
              {Number(cell.date.slice(-2))}
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-4 text-[10px] text-muted">黄緑=正解 · 紫=不正解 · 橙=未判定 · 枠=未挑戦</p>

      {selected && selectedVisual ? (
        <div className="mx-4 mt-4 rounded-2xl border border-gray-800 bg-panel p-4">
          <p className="text-xs font-bold text-purple-300">{selected}</p>
          <p className="mt-1 text-sm font-black">{selectedPulse?.title || "PULSEなし"}</p>
          <p className="mt-1 text-xs text-muted">{labelForVisual(selectedVisual)}</p>
          {selectedPulse ? (
            <Link href={`/p/${selectedPulse.id}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-sky-400">
              この日のPULSEを見る
            </Link>
          ) : null}
          {selectedAttempt?.grade ? (
            <p className="mt-2 text-[11px] text-muted">記録: {selectedAttempt.grade}</p>
          ) : null}
        </div>
      ) : null}

      <section className="mt-6 px-4">
        <h2 className="text-sm font-black">挑戦履歴</h2>
        <ul className="mt-2 divide-y divide-gray-800">
          {pulses.map((p) => {
            const a = attemptsMap.get(p.sprintDay);
            const visual = visualForDay(p.sprintDay, publishedMap, attemptsMap);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-[11px] text-muted">{p.sprintDay}</p>
                  <p className="text-sm font-bold">{p.title}</p>
                </div>
                <span className="text-[11px] font-bold">{labelForVisual(visual)}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
