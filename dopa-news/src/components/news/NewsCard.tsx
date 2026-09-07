"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { BreakingTag, CategoryTag, HeatMeter } from "./Badges";
import NewsThumb from "./NewsThumb";
import SaveButton from "./SaveButton";
import ShareButton from "./ShareButton";
import { relativeTime } from "@/lib/format";
import type { NewsWithQuiz } from "@/types/database";

export default function NewsCard({
  article,
  index = 0,
  priority = false,
}: {
  article: NewsWithQuiz;
  index?: number;
  priority?: boolean;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index, 6) * 0.035, ease: [0.22, 1, 0.36, 1] }}
      className="card overflow-hidden"
    >
      <Link href={`/news/${article.id}`} className="block active:opacity-90">
        <div className="relative">
          <NewsThumb
            src={article.image_url}
            alt={article.title}
            category={article.category}
            className="h-[176px] w-full"
            priority={priority}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-800 via-ink-800/70 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
            {article.is_breaking && <BreakingTag />}
            <CategoryTag category={article.category} />
          </div>
        </div>

        <div className="-mt-3 px-4 pb-1">
          <h2 className="line-clamp-3 text-[16.5px] font-bold leading-[1.42] tracking-tight text-fg">
            {article.title}
          </h2>
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-fg-muted">
            {article.summary}
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <HeatMeter heat={article.heat} />
          <span className="text-[11px] text-fg-faint">
            {relativeTime(article.published_at)} ・ {article.source_name}
          </span>
        </div>
        <div className="flex shrink-0 items-center">
          <SaveButton newsId={article.id} />
          <ShareButton
            title={article.title}
            path={`/news/${article.id}`}
            text={article.three_second_summary}
          />
          <Link
            href={`/news/${article.id}`}
            aria-label="詳細を見る"
            className="grid h-9 w-9 place-items-center rounded-full text-fg-faint active:bg-white/10"
          >
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
