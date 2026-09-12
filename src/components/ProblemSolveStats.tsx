"use client";

import { DIFFICULTY_LEVELS } from "@/lib/difficulty";
import {
  accuracyRate,
  compactSolveStatsLine,
  formatDurationClock,
  observedDifficultyLabel,
  STATS_MIN_N,
} from "@/lib/problem-stats";
import { referralFetch } from "@/lib/referral-client";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { useState } from "react";

type DurationBlock = {
  n?: number | null;
  avg?: number | null;
  median?: number | null;
  fastest?: number | null;
  p25?: number | null;
  p75?: number | null;
  p90?: number | null;
};

type AnalyticsPayload = {
  solvers?: number;
  excludedSolvers?: number;
  correct?: number;
  incorrect?: number;
  difficultyLevel?: number;
  isAuthor?: boolean;
  duration?: DurationBlock | null;
  durationByGrade?: { correctAvg?: number | null; incorrectAvg?: number | null };
  series?: { bucket?: string; solvers?: number; correct?: number; avgDuration?: number | null }[];
  seriesGrain?: "hour" | "day";
};

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-gray-800 bg-panel px-3 py-2">
      <p className="text-[10px] font-bold tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

export function ProblemSolveStats({ post, detail }: { post: Post; detail?: boolean }) {
  if (post.kind !== "problem") return null;
  const solvers = post.gradeN ?? 0;
  const correct = post.gradeCorrect ?? 0;
  const rate = accuracyRate(correct, solvers);
  const avg = formatDurationClock(
    solvers >= STATS_MIN_N && (post.durationN ?? 0) >= STATS_MIN_N
      ? Math.round((post.durationSum ?? 0) / (post.durationN || 1))
      : null,
  );

  if (!detail) {
    return (
      <p className="mt-2 text-[11px] font-semibold text-white/55">
        {compactSolveStatsLine(post)}
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[11px] font-bold tracking-wide text-muted">基本分析</p>
      <div className="flex gap-2">
        <StatChip label="正答率" value={rate == null ? (solvers ? "集計中" : "--") : `${rate}%`} />
        <StatChip label="平均時間" value={avg ?? (solvers ? "集計中" : "--")} />
        <StatChip label="解答数" value={String(solvers)} />
      </div>
      <ProblemPremiumAnalytics post={post} />
    </div>
  );
}

function ProblemPremiumAnalytics({ post }: { post: Post }) {
  const { hasPremium, openPaywall } = useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  if (!hasPremium) {
    return (
      <button
        type="button"
        onClick={() => openPaywall("詳細な問題分析は Premium 限定です")}
        className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-amber-400/20 bg-amber-400/5 px-3 text-left"
      >
        <span className="text-sm font-bold text-amber-200">詳細分析を見る</span>
        <span className="text-[11px] font-bold text-amber-300">Premium</span>
      </button>
    );
  }

  async function load() {
    if (data || loading) {
      setOpen((v) => !v);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await referralFetch(`/api/problems/${post.id}/analytics`);
    setLoading(false);
    if (res.error || !res.data || typeof res.data !== "object" || !("analytics" in res.data)) {
      setError(res.error || "分析を取得できません");
      setOpen(true);
      return;
    }
    setData((res.data as { analytics: AnalyticsPayload }).analytics);
    setOpen(true);
  }

  const solvers = Number(data?.solvers ?? 0);
  const correct = Number(data?.correct ?? 0);
  const incorrect = Number(data?.incorrect ?? 0);
  const rate = accuracyRate(correct, solvers);
  const dur = data?.duration;
  const observed = observedDifficultyLabel(rate);
  const authorLv = DIFFICULTY_LEVELS.find((d) => d.id === (data?.difficultyLevel ?? post.difficultyLevel));

  return (
    <div>
      <button
        type="button"
        onClick={() => void load()}
        className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-gray-800 bg-panel px-3"
      >
        <span className="text-sm font-bold">詳細分析を見る</span>
        <span className="text-[11px] text-muted">{open ? "閉じる" : loading ? "読込中" : ""}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-3 rounded-2xl border border-gray-800 bg-black/30 px-3 py-3">
          {error && <p className="text-xs text-rose-300">{error}</p>}
          {data && (
            <>
              <div>
                <p className="text-[10px] font-bold text-muted">正誤内訳</p>
                <p className="mt-1 text-sm text-white">
                  正解 {correct} / 不正解 {incorrect} / 有効解答 {solvers}
                  {Number(data.excludedSolvers ?? 0) > 0
                    ? ` · 参考解答 ${Number(data.excludedSolvers)}`
                    : ""}
                  {rate != null ? ` · 正解率 ${rate}% · 不正解率 ${100 - rate}%` : " · 集計中"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted">解答時間分布</p>
                <p className="mt-1 text-sm text-white">
                  {!dur?.n
                    ? "データ不足"
                    : `中央値 ${formatDurationClock(dur.median) ?? "--"} · 平均 ${formatDurationClock(dur.avg) ?? "--"} · 最速 ${formatDurationClock(dur.fastest) ?? "--"}`}
                </p>
                {!!dur?.n && (
                  <p className="mt-0.5 text-[11px] text-muted">
                    25% {formatDurationClock(dur.p25) ?? "--"} · 75% {formatDurationClock(dur.p75) ?? "--"} · 90%{" "}
                    {formatDurationClock(dur.p90) ?? "--"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted">正解者 vs 不正解者</p>
                <p className="mt-1 text-sm text-white">
                  正解 平均 {formatDurationClock(data.durationByGrade?.correctAvg) ?? "--"} · 不正解 平均{" "}
                  {formatDurationClock(data.durationByGrade?.incorrectAvg) ?? "--"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted">難易度</p>
                <p className="mt-1 text-sm text-white">
                  設定 {authorLv?.hint ?? "中級"}
                  {observed ? ` · 実測 ${observed}` : " · 実測 集計中"}
                </p>
              </div>
              {data.isAuthor && (
                <div>
                  <p className="text-[10px] font-bold text-muted">
                    推移（{data.seriesGrain === "hour" ? "時間" : "日"}単位）
                  </p>
                  {(data.series ?? []).length === 0 ? (
                    <p className="mt-1 text-sm text-muted">まだ推移データがありません</p>
                  ) : (
                    <ul className="mt-1 space-y-1 text-[12px] text-white/80">
                      {(data.series ?? []).map((row) => (
                        <li key={String(row.bucket)}>
                          {String(row.bucket ?? "").replace("T", " ").slice(0, 16)} · 解答 {row.solvers ?? 0} · 正答{" "}
                          {accuracyRate(Number(row.correct ?? 0), Number(row.solvers ?? 0)) ?? "--"}% · 平均{" "}
                          {formatDurationClock(row.avgDuration) ?? "--"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
