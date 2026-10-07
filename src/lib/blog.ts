import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

export type BlogArticle = {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  category?: string;
  content: string;
};

export const BLOG_DESCRIPTION = "数学・パズル・勉強法など、「考えること」が少し楽しくなる読みもの。";
const directory = join(process.cwd(), "src/content/blog");

function date(value: unknown, field: string, file: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error(`${file}: ${field} must be a quoted YYYY-MM-DD date`);
  }
  return value;
}

/** Repository-owned Markdown only. Invalid metadata fails the build instead of publishing silently. */
export function getBlogArticles(): BlogArticle[] {
  const slugs = new Set<string>();
  return readdirSync(directory).filter((file) => file.endsWith(".md")).map((file) => {
    const source = readFileSync(join(directory, file), "utf8");
    if (!/^---\r?\n/.test(source)) throw new Error(`${file}: YAML front matter must start with ---`);
    const { data, content } = matter(source);
    for (const field of ["title", "slug", "description", "category"]) {
      if (typeof data[field] !== "string" || !data[field].trim()) throw new Error(`${file}: missing ${field}`);
    }
    const slug = data.slug as string;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || file !== `${slug}.md` || slugs.has(slug)) {
      throw new Error(`${file}: slug must be unique and match the filename`);
    }
    slugs.add(slug);
    if (!content.trim()) throw new Error(`${file}: empty article`);
    const publishedAt = date(data.publishedAt, "publishedAt", file);
    const updatedAt = data.updatedAt === undefined ? undefined : date(data.updatedAt, "updatedAt", file);
    if (updatedAt && updatedAt < publishedAt) throw new Error(`${file}: updatedAt precedes publishedAt`);
    return { title: data.title.trim(), slug, description: data.description.trim(), publishedAt, updatedAt, category: (data.category as string).trim(), content };
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
}

export function getBlogArticle(slug: string) {
  // Look up known slugs; never interpolate URL input into a filesystem path.
  return getBlogArticles().find((article) => article.slug === slug);
}

export function formatBlogDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}
