"use client";

import { SolverAnswerField } from "@/components/AnswerFields";
import { unlockCorrectFeedback } from "@/lib/correct-feedback";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { useState } from "react";

export function ProblemAnswerBox({ post }: { post: Post }) {
  const { gradeProblemAnswer, lastAttempts } = useApp();
  const last = lastAttempts[post.id];
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect" | "ungraded">(
    last?.grade === "correct" ? "correct" : "idle",
  );

  const submit = () => {
    if (busy) return;
    const trimmed = answer.trim();
    if (!trimmed) {
      setError("答えを入力してください");
      return;
    }
    unlockCorrectFeedback();
    setBusy(true);
    setError("");
    void gradeProblemAnswer(post.id, trimmed).then((res) => {
      setBusy(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.correct === true) {
        setStatus("correct");
        return;
      }
      if (res.graded) {
        setStatus("incorrect");
        return;
      }
      setStatus("ungraded");
    });
  };

  return (
    <div className="mt-3 rounded-2xl border border-gray-800 bg-panel px-3 py-3">
      <label htmlFor={`aha-answer-${post.id}`} className="text-xs font-bold text-muted">
        答え
      </label>
      <SolverAnswerField
        id={`aha-answer-${post.id}`}
        value={answer}
        onChange={(next) => {
          setAnswer(next);
          if (error) setError("");
          if (status === "incorrect" || status === "ungraded") setStatus("idle");
        }}
        onSubmit={submit}
        unit={post.answerUnit}
        disabled={busy}
      />
      {status === "correct" ? (
        <p className="mt-2 text-sm font-black text-emerald-300">正解！</p>
      ) : null}
      {status === "incorrect" ? (
        <p className="mt-2 text-sm font-bold text-orange-200">もう一度考えてみよう</p>
      ) : null}
      {status === "ungraded" ? (
        <p className="mt-2 text-sm text-muted">この問題はいま採点できません</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      <button
        type="button"
        disabled={busy || !answer.trim()}
        onClick={submit}
        className="mt-2 min-h-11 w-full rounded-full bg-aha text-sm font-black text-black disabled:opacity-40"
      >
        {busy ? "採点中…" : "解答する"}
      </button>
    </div>
  );
}
