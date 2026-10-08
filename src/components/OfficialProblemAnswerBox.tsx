"use client";

import { SolverAnswerField } from "@/components/AnswerFields";
import { useState } from "react";

type Status = "idle" | "correct" | "incorrect";

export function OfficialProblemAnswerBox({
  problemId,
  answerUnit,
}: {
  problemId: string;
  answerUnit?: string;
}) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    const value = answer.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/challenge/grade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problemId, answer: value }),
      });
      const result = (await response.json()) as { correct?: boolean; error?: string };
      if (!response.ok) {
        setError(result.error || "採点できませんでした");
        return;
      }
      setStatus(result.correct ? "correct" : "incorrect");
    } catch {
      setError("通信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-aha/30 bg-aha/5 px-4 py-4">
      <p className="text-xs font-bold text-aha">ログインなしで挑戦</p>
      <label htmlFor={`official-answer-${problemId}`} className="mt-2 block text-sm font-black text-white">
        答え
      </label>
      <SolverAnswerField
        id={`official-answer-${problemId}`}
        value={answer}
        unit={answerUnit}
        disabled={busy}
        onChange={(value) => {
          setAnswer(value);
          setStatus("idle");
          setError("");
        }}
        onSubmit={submit}
      />
      {status === "correct" ? (
        <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-black text-emerald-300">
          正解！ 下の解説で考え方を確かめてみよう。
        </p>
      ) : null}
      {status === "incorrect" ? (
        <p className="mt-3 rounded-xl bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-200">
          もう一度考えてみよう。ヒントも使えます。
        </p>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
      <button
        type="button"
        disabled={busy || !answer.trim()}
        onClick={submit}
        className="mt-3 min-h-11 w-full rounded-full bg-aha text-sm font-black text-black disabled:opacity-40"
      >
        {busy ? "採点中…" : "答え合わせ"}
      </button>
      <p className="mt-2 text-xs leading-relaxed text-muted">回答は保存されません。</p>
    </div>
  );
}
