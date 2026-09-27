"use client";

import { LatexText } from "@/lib/latex";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import { useEffect, useState } from "react";

type WrittenResponse = {
  id: string;
  responder_id: string;
  answer: string;
  grade: "pending" | "correct" | "incorrect";
  grade_comment: string | null;
  submitted_at: string;
};

export function WrittenAnswerBox({ post }: { post: Post }) {
  const { authenticated, refreshNotifications } = useApp();
  const [isAuthor, setIsAuthor] = useState(false);
  const [responses, setResponses] = useState<WrittenResponse[]>([]);
  const [answer, setAnswer] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyResponse, setBusyResponse] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const author = user.id === post.authorId;
      setIsAuthor(author);
      let query = supabase
        .from("problem_written_responses")
        .select("id, responder_id, answer, grade, grade_comment, submitted_at")
        .eq("problem_id", post.id)
        .order("submitted_at", { ascending: false });
      if (!author) query = query.eq("responder_id", user.id);
      const { data, error: queryError } = await query;
      if (cancelled) return;
      if (queryError) setError(queryError.message);
      else setResponses((data ?? []) as WrittenResponse[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [post.authorId, post.id]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!answer.trim() || busy) return;
    setBusy(true);
    setError("");
    const { data, error: submitError } = await supabase.rpc("submit_written_response", {
      p_problem_id: post.id,
      p_answer: answer.trim(),
    });
    if (submitError) {
      setError(submitError.message);
    } else {
      setResponses((current) => [
        {
          id: String(data),
          responder_id: "",
          answer: answer.trim(),
          grade: "pending",
          grade_comment: null,
          submitted_at: new Date().toISOString(),
        },
        ...current,
      ]);
      setAnswer("");
    }
    setBusy(false);
  };

  const grade = async (response: WrittenResponse, result: "correct" | "incorrect") => {
    if (busyResponse) return;
    setBusyResponse(response.id);
    setError("");
    const comment = comments[response.id]?.trim() ?? "";
    const { error: gradeError } = await supabase.rpc("grade_written_response", {
      p_response_id: response.id,
      p_grade: result,
      p_comment: comment || null,
    });
    if (gradeError) {
      setError(gradeError.message);
    } else {
      setResponses((current) => current.map((item) => item.id === response.id
        ? { ...item, grade: result, grade_comment: comment || null }
        : item,
      ));
    }
    setBusyResponse("");
    if (!gradeError) void refreshNotifications();
  };

  return (
    <section className="mt-3 rounded-2xl border border-gray-800 bg-panel px-3 py-3">
      <h3 className="text-sm font-black">記述回答</h3>
      {post.correctAnswer && isAuthor ? (
        <details className="mt-2 rounded-lg border border-gray-800 px-3 py-2">
          <summary className="min-h-9 cursor-pointer text-xs font-bold text-muted">模範解答を見る</summary>
          <div className="mt-2 text-sm"><LatexText text={post.correctAnswer} /></div>
        </details>
      ) : null}

      {!authenticated ? (
        <p className="mt-2 text-sm text-muted">ログインして回答してください。</p>
      ) : isAuthor ? (
        loading ? <p className="mt-2 text-sm text-muted">回答を読み込み中…</p> : responses.length === 0 ? (
          <p className="mt-2 text-sm text-muted">記述回答はまだありません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-800">
            {responses.map((response) => (
              <li key={response.id} className="py-3 first:pt-1">
                <p className="mb-2 text-[11px] text-muted">{new Date(response.submitted_at).toLocaleString("ja-JP")}</p>
                <div className="rounded-xl border border-gray-800 bg-black/50 p-3 text-sm leading-relaxed">
                  <LatexText text={response.answer} />
                </div>
                {response.grade === "pending" ? (
                  <>
                    <textarea
                      value={comments[response.id] ?? ""}
                      onChange={(event) => setComments((value) => ({ ...value, [response.id]: event.target.value.slice(0, 500) }))}
                      maxLength={500}
                      rows={2}
                      placeholder="採点コメント（任意）"
                      className="mt-2 min-h-11 w-full resize-y rounded-lg border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-aha"
                    />
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button type="button" disabled={!!busyResponse} onClick={() => void grade(response, "correct")} className="min-h-11 rounded-lg bg-emerald-400/15 text-sm font-black text-emerald-300 disabled:opacity-40">○ 正解</button>
                      <button type="button" disabled={!!busyResponse} onClick={() => void grade(response, "incorrect")} className="min-h-11 rounded-lg bg-rose-400/15 text-sm font-black text-rose-300 disabled:opacity-40">× 不正解</button>
                    </div>
                  </>
                ) : (
                  <p className={`mt-2 text-sm font-bold ${response.grade === "correct" ? "text-emerald-300" : "text-orange-200"}`}>
                    {response.grade === "correct" ? "○ 正解" : "× 不正解"}
                    {response.grade_comment ? <span className="mt-1 block font-normal text-muted">{response.grade_comment}</span> : null}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <form onSubmit={(event) => void submit(event)} className="mt-2">
            <label htmlFor={`written-answer-${post.id}`} className="text-xs font-bold text-muted">文章・数式で回答</label>
            <textarea
              id={`written-answer-${post.id}`}
              value={answer}
              onChange={(event) => setAnswer(event.target.value.slice(0, 5000))}
              maxLength={5000}
              rows={4}
              placeholder="回答を入力"
              className="mt-1 min-h-24 w-full resize-y rounded-xl border border-gray-800 bg-black px-3 py-2 text-sm outline-none focus:border-aha"
            />
            <button type="submit" disabled={busy || !answer.trim()} className="mt-2 min-h-11 w-full rounded-full bg-aha text-sm font-black text-black disabled:opacity-40">
              {busy ? "送信中…" : "回答を送信"}
            </button>
          </form>
          {responses.map((response) => (
            <div key={response.id} className="mt-3 border-t border-gray-800 pt-3">
              <p className="text-xs font-bold text-muted">{response.grade === "pending" ? "採点待ち" : response.grade === "correct" ? "○ 正解" : "× 不正解"}</p>
              {response.grade_comment ? <p className="mt-1 text-sm">{response.grade_comment}</p> : null}
            </div>
          ))}
        </>
      )}
      {error ? <p role="alert" className="mt-2 break-words text-xs text-red-400">{error}</p> : null}
    </section>
  );
}
