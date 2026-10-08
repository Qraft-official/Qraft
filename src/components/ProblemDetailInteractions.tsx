"use client";

import { ProblemAnswerBox } from "@/components/ProblemAnswerBox";
import { ProblemSetAddButton } from "@/components/ProblemSetAddButton";
import { WrittenAnswerBox } from "@/components/WrittenAnswerBox";
import { OfficialProblemAnswerBox } from "@/components/OfficialProblemAnswerBox";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/lib/store";
import type { Post } from "@/lib/types";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import { useEffect, useState } from "react";

export function ProblemDetailInteractions({ preview }: { preview: PublicProblemPreview }) {
  const { authenticated } = useApp();
  const [authorId, setAuthorId] = useState("");

  useEffect(() => {
    if (!authenticated || preview.isSprint || preview.isOfficial) return;
    let cancelled = false;
    void supabase
      .from("problems")
      .select("author_id")
      .eq("id", preview.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setAuthorId(typeof data?.author_id === "string" ? data.author_id : "");
      });
    return () => { cancelled = true; };
  }, [authenticated, preview.id, preview.isOfficial, preview.isSprint]);

  if (preview.isOfficial) {
    return (
      <section className="border-b border-gray-800 px-4 py-4">
        <OfficialProblemAnswerBox problemId={preview.id} answerUnit={preview.answerUnit} />
      </section>
    );
  }
  if (!authenticated || preview.isSprint || !authorId) return null;
  const post: Post = {
    id: preview.id,
    authorId,
    kind: "problem",
    subject: preview.subject,
    text: preview.body,
    title: preview.title,
    createdAt: preview.createdAt,
    replyCount: 0,
    repostCount: 0,
    likeCount: 0,
    ahaSum: 0,
    ahaCount: 0,
    eleganceSum: 0,
    eleganceCount: 0,
    isSprint: false,
    problemMode: preview.mode,
    answerType: preview.answerType,
    answerOptions: preview.answerOptions,
    answerAvailable: preview.answerAvailable,
    answerUnit: preview.answerUnit,
  };
  const answer = preview.answerType === "written"
    ? <WrittenAnswerBox post={post} />
    : preview.answerType === "choice" || preview.answerAvailable
      ? <ProblemAnswerBox post={post} />
      : null;

  return (
    <section className="space-y-3 border-b border-gray-800 px-4 py-4">
      {answer}
      <ProblemSetAddButton problemId={preview.id} />
    </section>
  );
}
