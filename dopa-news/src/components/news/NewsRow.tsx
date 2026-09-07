"use client";

import Link from "next/link";
import { CategoryTag } from "./Badges";
import NewsThumb from "./NewsThumb";
import SaveButton from "./SaveButton";
import { relativeTime } from "@/lib/format";
import type { NewsWithQuiz } from "@/types/database";

export default function NewsRow({
  article,
  meta,
  showSave = true,
}: {
  article: NewsWithQuiz;
  meta?: string;
  showSave?: boolean;
}) {
  return (
    <div className="card flex items-center gap-3 p-2.5">
      <Link href={`/news/${article.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <NewsThumb
          src={article.image_url}
          alt={article.title}
          category={article.category}
          className="h-[62px] w-[62px] shrink-0 rounded-xl"
          sizes="62px"
        />
        <span className="min-w-0 flex-1">
          <span className="mb-1 flex items-center gap-1.5">
            <CategoryTag category={article.category} />
          </span>
          <span className="line-clamp-2 block text-[13.5px] font-semibold leading-snug text-fg">
            {article.title}
          </span>
          <span className="mt-1 block text-[10.5px] text-fg-faint">
            {meta ?? `${relativeTime(article.published_at)} ・ ${article.source_name}`}
          </span>
        </span>
      </Link>
      {showSave && (
        <div className="shrink-0">
          <SaveButton newsId={article.id} />
        </div>
      )}
    </div>
  );
}
