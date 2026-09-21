"use client";

import { GoogleAdSlot } from "@/components/GoogleAdSlot";
import { PostCard } from "@/components/PostCard";
import { ProblemSolveStats } from "@/components/ProblemSolveStats";
import { ProblemStudyBlocks } from "@/components/ProblemStudyBlocks";
import { RelatedProblemCards } from "@/components/RelatedProblemCards";
import { useApp } from "@/lib/store";
import { fetchListedProblemStudy } from "@/lib/public-catalog";
import { isProblemListedForFeed } from "@/lib/publish-at";
import { rankRelatedProblems } from "@/lib/related-problems";
import { sanitizeHints } from "@/lib/learn";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function ProblemThread() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getPost, repliesTo, lastAttempts, me, posts, openComposer } = useApp();
  const found = getPost(id);
  const post =
    found &&
    isProblemListedForFeed({
      is_sprint: found.isSprint || found.kind === "sprint",
      publish_at: found.publishAt ?? null,
    })
      ? found
      : undefined;
  const [peek, setPeek] = useState(false);
  const [study, setStudy] = useState({ hints: [] as string[], explanation: "" });

  useEffect(() => {
    if (!post?.id) return;
    setStudy({
      hints: sanitizeHints(post.hints),
      explanation: post.solution?.trim() ?? "",
    });
    void fetchListedProblemStudy(post.id).then((row) => {
      setStudy({
        hints: row.hints.length ? row.hints : sanitizeHints(post.hints),
        explanation: row.explanation || post.solution?.trim() || "",
      });
    });
  }, [post?.id, post?.hints, post?.solution]);

  const related = useMemo(() => {
    if (!post) return [];
    const cards = posts
      .filter((p) => p.kind === "problem" || p.kind === "sprint")
      .filter((p) =>
        isProblemListedForFeed({
          is_sprint: p.isSprint || p.kind === "sprint",
          publish_at: p.publishAt ?? null,
        }),
      )
      .map((p) => ({
        id: p.id,
        title: p.title?.trim() || "問題",
        subject: p.subject,
        topic: p.topic,
        difficultyLevel: p.difficultyLevel ?? 3,
        mode: p.problemMode ?? "question",
        isSprint: Boolean(p.isSprint || p.kind === "sprint"),
      }));
    return rankRelatedProblems(
      {
        id: post.id,
        title: post.title?.trim() || "問題",
        subject: post.subject,
        topic: post.topic,
        difficultyLevel: post.difficultyLevel ?? 3,
        mode: post.problemMode ?? "question",
        isSprint: Boolean(post.isSprint || post.kind === "sprint"),
      },
      cards,
      5,
    );
  }, [post, posts]);

  if (!post) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()}>戻る</button>
        <p className="mt-4 text-muted">ポストが見つかりません。</p>
      </div>
    );
  }

  const thread = repliesTo(post.id);
  const sols = thread.filter((p) => p.kind === "solution");
  const replies = thread.filter((p) => p.kind === "reply");
  const attempted = Boolean(lastAttempts[post.id]?.submittedAt);
  const isAuthor = post.authorId === me.id;
  const questionPeek = post.problemMode === "question" && peek;
  const unlocked = attempted || isAuthor || questionPeek;
  const isProblem = post.kind === "problem" || post.kind === "sprint";

  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-black/80 px-3 py-3 backdrop-blur">
        <button onClick={() => router.back()} aria-label="戻る">
          <ArrowLeft size={20} />
        </button>
        <p className="font-bold">問題</p>
      </header>
      <PostCard post={post} hideStudy />
      {post.kind === "problem" && (
        <div className="border-b border-gray-800 px-4 pb-4">
          <ProblemSolveStats post={post} detail />
        </div>
      )}

      {isProblem ? (
        <div className="border-b border-gray-800 px-4 py-4">
          <ProblemStudyBlocks
            hints={study.hints}
            explanation={unlocked ? study.explanation : undefined}
            lockSpoilers={!unlocked}
            showAnswer={unlocked && Boolean(post.correctAnswer?.trim())}
            answer={unlocked ? post.correctAnswer : undefined}
            answerUnit={post.answerUnit}
            solutions={
              unlocked ? (
                sols.length > 0 ? (
                  <div className="-mx-4 mt-2">
                    {sols.map((p) => (
                      <PostCard key={p.id} post={p} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">まだ解法がありません。最初の解法を書いてみよう。</p>
                )
              ) : (
                <p className="mt-2 text-sm text-muted">
                  解答したあと、他の人の考え方を読めます。このページには解法エリアがあります。
                </p>
              )
            }
            writeSolution={
              unlocked ? (
                <button
                  type="button"
                  onClick={() =>
                    openComposer({
                      open: true,
                      mode: "solution",
                      quotePostId: post.id,
                    })
                  }
                  className="mt-3 inline-flex min-h-11 items-center rounded-full bg-aha px-4 text-sm font-black text-black"
                >
                  解法を書く
                </button>
              ) : post.problemMode === "question" ? (
                <button
                  type="button"
                  onClick={() => setPeek(true)}
                  className="mt-3 inline-flex min-h-11 items-center rounded-full border border-gray-700 px-4 text-sm font-bold"
                >
                  解説・解法を見る
                </button>
              ) : null
            }
          />
        </div>
      ) : null}

      {unlocked && replies.length > 0 && (
        <>
          <p className="border-b border-gray-800 px-4 py-2 text-xs font-bold text-muted">リプライ</p>
          {replies.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </>
      )}

      {unlocked ? <RelatedProblemCards items={related} /> : null}

      <GoogleAdSlot
        enabled={
          ((post.kind === "problem" || post.kind === "sprint") &&
            (post.text?.trim().length ?? 0) >= 80) ||
          sols.some((s) => (s.text?.trim().length ?? 0) >= 80)
        }
      />
    </div>
  );
}
