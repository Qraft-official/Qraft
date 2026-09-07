"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, HelpCircle, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { percent } from "@/lib/format";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { NewsQuiz, QuizOption } from "@/types/database";

const OPTION_KEYS: QuizOption[] = ["A", "B", "C"];

export default function QuizCard({ quiz: initialQuiz }: { quiz: NewsQuiz }) {
  const { user } = useSession();
  const gate = useAuthGate();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState(initialQuiz);
  const [myVote, setMyVote] = useState<QuizOption | null>(null);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState<QuizOption | null>(null);

  const labels: Record<QuizOption, string> = {
    A: quiz.option_a,
    B: quiz.option_b,
    C: quiz.option_c,
  };
  const counts: Record<QuizOption, number> = {
    A: quiz.votes_a,
    B: quiz.votes_b,
    C: quiz.votes_c,
  };
  const total = counts.A + counts.B + counts.C;
  const revealed = myVote !== null;

  useEffect(() => {
    let active = true;
    async function loadVote() {
      if (!user || !isSupabaseConfigured) {
        if (active) {
          setMyVote(null);
          setChecking(false);
        }
        return;
      }
      const { data } = await getSupabase()
        .from("news_votes")
        .select("selected_option")
        .eq("quiz_id", quiz.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      setMyVote((data?.selected_option as QuizOption | undefined) ?? null);
      setChecking(false);
    }
    void loadVote();
    return () => {
      active = false;
    };
  }, [user, quiz.id]);

  const vote = useCallback(
    async (option: QuizOption) => {
      if (!gate("投票")) return;
      if (!user || myVote || submitting) return;

      setSubmitting(option);
      try {
        const supabase = getSupabase();
        const { error } = await supabase
          .from("news_votes")
          .insert({ quiz_id: quiz.id, user_id: user.id, selected_option: option });

        if (error) {
          // 23505 = the one-vote-per-user unique constraint.
          if (error.code === "23505") {
            const { data } = await supabase
              .from("news_votes")
              .select("selected_option")
              .eq("quiz_id", quiz.id)
              .eq("user_id", user.id)
              .maybeSingle();
            setMyVote((data?.selected_option as QuizOption | undefined) ?? option);
            toast("このニュースにはすでに投票済みです", "info");
            return;
          }
          throw error;
        }

        setMyVote(option);
        const { data: fresh } = await supabase
          .from("news_quizzes")
          .select("*")
          .eq("id", quiz.id)
          .maybeSingle();
        if (fresh) setQuiz(fresh as NewsQuiz);
      } catch {
        toast("投票できませんでした。通信環境を確認してください", "error");
      } finally {
        setSubmitting(null);
      }
    },
    [gate, user, myVote, submitting, quiz.id, toast],
  );

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#a98bff]/15 text-[#a98bff]">
          <Sparkles size={15} strokeWidth={2.4} />
        </span>
        <h3 className="text-[14px] font-bold">このあとどうなる？</h3>
        <span className="ml-auto text-[10.5px] font-semibold text-fg-faint">みんなの予想</span>
      </header>

      <div className="px-4 py-3.5">
        <p className="text-[14.5px] font-semibold leading-relaxed text-fg">{quiz.question}</p>

        <div className="mt-3.5 space-y-2">
          {OPTION_KEYS.map((key) => {
            const share = percent(counts[key], total);
            const mine = myVote === key;
            const isResult = quiz.result_option === key;
            return (
              <button
                key={key}
                type="button"
                disabled={revealed || checking || submitting !== null}
                onClick={() => void vote(key)}
                aria-label={`選択肢${key}: ${labels[key]}`}
                className={`relative w-full overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                  mine
                    ? "border-[#4ef5a3]/60 bg-[#4ef5a3]/[0.07]"
                    : isResult && revealed
                      ? "border-[#ffc44d]/50 bg-[#ffc44d]/[0.06]"
                      : "border-line bg-ink-700"
                } ${revealed ? "cursor-default" : "active:scale-[0.99] active:bg-ink-600"}`}
              >
                {revealed && (
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${share}%` }}
                    transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                    className={`absolute inset-y-0 left-0 ${
                      mine ? "bg-[#4ef5a3]/14" : "bg-white/[0.055]"
                    }`}
                  />
                )}
                <span className="relative flex items-center gap-2.5">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-black ${
                      mine ? "bg-[#4ef5a3] text-[#08130d]" : "bg-white/8 text-fg-muted"
                    }`}
                  >
                    {key}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-fg">
                    {labels[key]}
                  </span>
                  <AnimatePresence>
                    {submitting === key && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Loader2 size={15} className="animate-spin text-fg-muted" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {revealed && (
                    <motion.span
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className={`shrink-0 text-[13px] font-black tabular-nums ${
                        mine ? "text-[#4ef5a3]" : "text-fg-muted"
                      }`}
                    >
                      {share}%
                    </motion.span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {checking ? (
          <p className="mt-3 text-[11.5px] text-fg-faint">投票状況を確認しています…</p>
        ) : revealed ? (
          <div className="mt-3 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
              <CheckCircle2 size={13} className="text-[#4ef5a3]" />
              あなたの回答は <span className="font-bold text-[#4ef5a3]">{myVote}</span> ・
              {total.toLocaleString("ja-JP")}人が投票
            </p>
            {quiz.result_option ? (
              <p className="rounded-xl border border-[#ffc44d]/30 bg-[#ffc44d]/[0.07] px-3 py-2 text-[12px] leading-relaxed text-[#ffc44d]">
                答え合わせ：正解は <span className="font-black">{quiz.result_option}</span>
                {quiz.result_note ? ` — ${quiz.result_note}` : ""}
              </p>
            ) : (
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-fg-faint">
                <HelpCircle size={12} className="mt-[2px] shrink-0" />
                これは未来の予測なので正解はまだありません。結果が確定したら答え合わせが表示されます。
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-[11.5px] text-fg-faint">
            1つ選んで投票すると、みんなの予想が見られます（投票は1回だけ）
          </p>
        )}
      </div>
    </section>
  );
}
