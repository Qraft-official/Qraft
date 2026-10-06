// Run against a local production server: node scripts/verify-blog.mjs http://127.0.0.1:3100
import assert from "node:assert/strict";
import { getBlogArticle, getBlogArticles } from "../src/lib/blog.ts";
import { isIndexablePublicPath, isNoIndexPath, isPublicBrowsePath } from "../src/lib/public-routes.ts";

const origin = process.argv[2] ?? "http://127.0.0.1:3100";
const articles = getBlogArticles();
assert.ok(articles.length > 0);
assert.equal(getBlogArticle("../../.env.local"), undefined);
assert.equal(isIndexablePublicPath("/blogger"), false);
assert.equal(isIndexablePublicPath("/blog/a/b"), false);
assert.equal(isNoIndexPath("/settings"), true);
assert.equal(isNoIndexPath("/sprint"), true);
for (let i = 1; i < articles.length; i++) {
  assert.ok(articles[i - 1].publishedAt >= articles[i].publishedAt);
}

async function read(path, status = 200) {
  const response = await fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(60_000) });
  assert.equal(response.status, status, `${path}: HTTP status`);
  if (status === 200) assert.doesNotMatch(response.headers.get("x-robots-tag") ?? "", /noindex/);
  // No Cookie, authorization, or JavaScript execution: this is the actual crawler/guest HTML.
  return response.text();
}

// Retain all HTML for metadata/JSON-LD checks, excluding script payloads when checking visible content.
async function page(path) {
  const response = await fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(60_000) });
  assert.equal(response.status, 200, path);
  assert.doesNotMatch(response.headers.get("x-robots-tag") ?? "", /noindex/);
  const html = await response.text();
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  assert.ok(isPublicBrowsePath(path));
  assert.match(visible, /href="\/blog"[^>]*>Qraftコラム<\/a>/);
  assert.match(html, /<meta name="description"/);
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/);
  assert.match(html, /<meta property="og:title"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/qrafters.jp\/blog/);
  return { html, visible };
}

const list = await page("/blog");
assert.match(list.visible, /<h1[^>]*>Qraftコラム<\/h1>/);
for (const article of articles) {
  assert.ok(list.visible.includes(`href="/blog/${article.slug}"`));
  const { html, visible } = await page(`/blog/${article.slug}`);
  assert.match(visible, /<article>/);
  assert.match(visible, /<h2/);
  assert.match(visible, /href="\/discover"/);
  const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(json, "Article JSON-LD");
  assert.equal(JSON.parse(json[1]).headline, article.title);
  assert.equal(JSON.parse(json[1]).datePublished, article.publishedAt);
  if (article.content.includes("$$")) {
    assert.match(visible, /katex-display/);
    assert.doesNotMatch(visible, /class="katex-error"/);
  }
}
await read("/blog/this-article-does-not-exist", 404);
const sitemap = await read("/sitemap.xml");
assert.ok(sitemap.includes("https://qrafters.jp/blog</loc>"));
for (const article of articles) assert.ok(sitemap.includes(`https://qrafters.jp/blog/${article.slug}</loc>`));
assert.ok(sitemap.includes("https://qrafters.jp/about</loc>"));
const robots = await read("/robots.txt");
assert.match(robots, /Allow: \/blog/);
console.log(`PASS: ${articles.length} article(s), guest HTML, math, metadata, JSON-LD, footer, 404, sitemap, robots and route boundaries`);
