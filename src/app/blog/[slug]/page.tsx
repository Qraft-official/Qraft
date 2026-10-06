import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogMarkdown } from "@/components/BlogMarkdown";
import { formatBlogDate, getBlogArticle, getBlogArticles } from "@/lib/blog";
import { CANONICAL_ORIGIN } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return getBlogArticles().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getBlogArticle((await params).slug);
  if (!article) notFound();
  const url = `${CANONICAL_ORIGIN}/blog/${article.slug}`;
  return {
    title: article.title, description: article.description,
    alternates: { canonical: url }, robots: { index: true, follow: true },
    openGraph: { title: `${article.title} | Qraft`, description: article.description, url, siteName: "Qraft", locale: "ja_JP", type: "article", publishedTime: article.publishedAt, modifiedTime: article.updatedAt },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const article = getBlogArticle((await params).slug);
  if (!article) notFound();
  const structuredData = {
    "@context": "https://schema.org", "@type": "Article",
    headline: article.title, description: article.description,
    datePublished: article.publishedAt, dateModified: article.updatedAt,
    mainEntityOfPage: `${CANONICAL_ORIGIN}/blog/${article.slug}`,
    inLanguage: "ja", articleSection: article.category,
  };
  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
      <Link href="/blog" className="inline-flex min-h-11 items-center text-sm font-bold text-sky-400">← Qraftコラムへ戻る</Link>
      <article>
        <header className="mb-8 border-b border-gray-800 pb-8 pt-5">
          {article.category && <p className="text-sm font-bold text-aha">{article.category}</p>}
          <h1 className="mt-3 text-2xl font-black leading-relaxed text-white sm:text-3xl">{article.title}</h1>
          <p className="mt-5 text-base leading-8 text-[#c5cdd6]">{article.description}</p>
          <p className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span>公開日：<time dateTime={article.publishedAt}>{formatBlogDate(article.publishedAt)}</time></span>
            {article.updatedAt && <span>更新日：<time dateTime={article.updatedAt}>{formatBlogDate(article.updatedAt)}</time></span>}
          </p>
        </header>
        <BlogMarkdown content={article.content} />
      </article>
      <aside className="mt-12 rounded-2xl border border-gray-800 bg-white/[0.025] p-6">
        <p className="font-bold text-white">次は、一問考えてみませんか。</p>
        <p className="mt-2 text-sm leading-7 text-muted">Qraftの公開問題は、ログインせずに読むことができます。</p>
        <Link href="/discover" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-gray-700 px-5 text-sm font-bold text-aha hover:bg-white/5">Qraftでひらめきを試す →</Link>
      </aside>
      <Link href="/blog" className="mt-6 inline-flex min-h-11 items-center text-sm font-bold text-sky-400">Qraftコラムへ戻る</Link>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    </main>
  );
}
