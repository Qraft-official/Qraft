"use client";

import { PostCard } from "@/components/PostCard";
import { EmptyState } from "@/components/UiStates";
import { OFFICIAL_PROFILE_ID, SUBJECT_LABEL } from "@/lib/constants";
import { asSubject } from "@/lib/problems";
import { fetchMyPulseAttempts, fetchPublishedPulses } from "@/lib/pulse";
import { attemptByDay, labelForVisual, type PulseAttempt, type PublishedPulse } from "@/lib/pulse-stats";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function resultOf(pulse: PublishedPulse, attempts: Map<string, PulseAttempt>) {
  const a = attempts.get(pulse.sprintDay);
  if (!a) return "unattempted" as const;
  if (a.grade === "correct") return "correct" as const;
  if (a.grade === "incorrect") return "incorrect" as const;
  return "pending" as const;
}

export function PulseArchive() {
  const router = useRouter();
  const { posts, authenticated } = useApp();
  const [rows, setRows] = useState<PublishedPulse[]>([]);
  const [attempts, setAttempts] = useState<PulseAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(
    async (before?: string, append = false) => {
      setBusy(true);
      const listed = await fetchPublishedPulses(20, before);
      if (listed.error) setError(listed.error);
      setRows((prev) => (append ? [...prev, ...listed.pulses] : listed.pulses));
      if (authenticated) {
        const mine = await fetchMyPulseAttempts();
        if (!mine.error) setAttempts(mine.attempts);
      } else {
        setAttempts([]);
      }
      setBusy(false);
    },
    [authenticated],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => attemptByDay(attempts), [attempts]);
  const last = rows[rows.length - 1]?.sprintDay;

  return (
    <div className="pb-8">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-black/80 px-3 py-3 backdrop-blur">
        <button type="button" onClick={() => router.push("/")} className="text-white" aria-label="戻る">
          <ArrowLeft size={20} />
        </button>
        <p className="font-bold">過去のPULSE</p>
      </header>

      {error ? <p className="px-4 py-3 text-sm text-red-300">{error}</p> : null}

      {rows.length === 0 && !busy ? (
        <EmptyState title="公開済みのPULSEはまだありません" body="毎日21時に1問公開されます。" />
      ) : (
        <ul className="divide-y divide-gray-800">
          {rows.map((pulse) => {
            const result = resultOf(pulse, byDay);
            const live = posts.find((p) => p.id === pulse.id);
            const post =
              live ??
              ({
                id: pulse.id,
                authorId: pulse.authorId || OFFICIAL_PROFILE_ID,
                kind: "sprint",
                subject: asSubject(pulse.subject),
                text: `**${pulse.title}**`,
                title: pulse.title,
                createdAt: pulse.publishAt,
                replyCount: 0,
                repostCount: 0,
                likeCount: 0,
                ahaSum: 0,
                ahaCount: 0,
                eleganceSum: 0,
                eleganceCount: 0,
                isSprint: true,
                sprintDay: pulse.sprintDay,
                difficultyLevel: pulse.difficultyLevel,
              } satisfies Post);
            return (
              <li key={pulse.id}>
                <button
                  type="button"
                  onClick={() => setOpenId((id) => (id === pulse.id ? null : pulse.id))}
                  className="flex w-full min-h-11 items-start justify-between gap-3 px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-[11px] font-bold text-purple-300">{pulse.sprintDay}</span>
                    <span className="mt-0.5 block text-sm font-black text-white">{pulse.title || "PULSE"}</span>
                    <span className="mt-1 block text-[11px] text-muted">
                      Lv{pulse.difficultyLevel} · {SUBJECT_LABEL[asSubject(pulse.subject)]}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-gray-700 px-2 py-1 text-[11px] font-bold">
                    {authenticated ? labelForVisual(result === "pending" ? "pending" : result) : "公開済み"}
                  </span>
                </button>
                {openId === pulse.id ? (
                  <div className="border-t border-gray-900">
                    <PostCard post={post} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {last && rows.length >= 20 ? (
        <div className="px-4 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void load(last, true)}
            className="min-h-11 w-full rounded-full border border-gray-700 text-sm font-bold"
          >
            {busy ? "読み込み中…" : "さらに見る"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
