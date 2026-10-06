import type { Metadata } from "next";
import Link from "next/link";
import { BLOG_DESCRIPTION, formatBlogDate, getBlogArticles } from "@/lib/blog";
import { CANONICAL_ORIGIN } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Qraftコラム",
  description: BLOG_DESCRIPTION,
  alternates: { canonical: `${CANONICAL_ORIGIN}/blog` },
  robots: { index: true, follow: true },
  openGraph: { title: "Qraftコラム | Qraft", description: BLOG_DESCRIPTION, siteName: "Qraft", type: "website", locale: "ja_JP", url: `${CANONICAL_ORIGIN}/blog` },
};

export default function BlogPage() {
  const articles = getBlogArticles();
  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-sm font-bold tracking-wide text-aha">読む、考える、試してみる。</p>
      <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">Qraftコラム</h1>
      <p className="mt-4 max-w-xl text-base leading-8 text-[#c5cdd6]">{BLOG_DESCRIPTION}</p>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {articles.map((article) => (
          <article key={article.slug} className="flex flex-col rounded-2xl border border-gray-800 bg-white/[0.025] p-6">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              {article.category && <span className="rounded-full bg-aha/10 px-3 py-1 font-bold text-aha">{article.category}</span>}
              <time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt)}</time>
            </div>
            <h2 className="mt-4 text-xl font-bold leading-relaxed text-white"><Link href={`/blog/${article.slug}`} className="hover:text-aha">{article.title}</Link></h2>
            <p className="mt-3 flex-1 text-sm leading-7 text-[#c5cdd6]">{article.description}</p>
            <Link href={`/blog/${article.slug}`} aria-label={`${article.title}を続きを読む`} className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-sky-400">続きを読む <span aria-hidden="true" className="ml-2">→</span></Link>
          </article>
        ))}
      </div>
    </main>
  );
}
