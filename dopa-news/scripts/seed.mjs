/**
 * Seeds the development sample dataset.
 *
 * Run with:  npm run seed
 *
 * Requires SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env.local for an account
 * whose profile has `is_admin = true`. Everything is written through the normal
 * anon endpoint, so row level security is exercised exactly as it is in the app.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { SAMPLE_NEWS } from "./sample-news.mjs";
import { SAMPLE_MAP_POSTS, SAMPLE_OFFICIAL_POSTS } from "./sample-map-posts.mjs";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      for (const line of text.split("\n")) {
        const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
        if (!match) continue;
        const [, key, rawValue] = match;
        if (process.env[key]) continue;
        process.env[key] = rawValue.replace(/^["']|["']$/g, "");
      }
    } catch {
      // Missing env files are fine; real environment variables win anyway.
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!url || !anonKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が必要です");
  process.exit(1);
}
if (!email || !password) {
  console.error("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD が必要です (.env.local)");
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Seed rows use a coarse lifetime; the app picks per-category TTLs. */
const ttlHoursFor = (postType) => (postType === "weather" ? 3 : 6);

async function main() {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(`管理者ログインに失敗しました: ${authError.message}`);

  const { data: me } = await supabase.auth.getUser();
  const adminId = me.user?.id;
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", adminId)
    .maybeSingle();
  if (!adminProfile?.is_admin) {
    throw new Error("このアカウントには管理者権限がありません (profiles.is_admin = true が必要)");
  }

  // ---------------- news ----------------
  const { data: existing } = await supabase
    .from("news_articles")
    .select("id")
    .eq("is_sample", true);

  if (existing?.length) {
    const { error } = await supabase.from("news_articles").delete().eq("is_sample", true);
    if (error) throw error;
    console.log(`既存のサンプルニュース ${existing.length} 件を削除しました`);
  }

  const now = Date.now();
  const articleRows = SAMPLE_NEWS.map((n) => ({
    title: n.title,
    summary: n.summary,
    what_happened: n.what_happened,
    why_trending: n.why_trending,
    three_second_summary: n.three_second_summary,
    social_reaction_summary: n.social_reaction_summary,
    category: n.category,
    image_url: n.image_url,
    source_name: n.source_name,
    source_url: "/sample-source",
    source_type: n.source_type,
    keywords: n.keywords,
    heat: n.heat,
    is_breaking: Boolean(n.is_breaking),
    is_published: true,
    is_sample: true,
    published_at: new Date(now - n.hoursAgo * 3600_000).toISOString(),
  }));

  const { data: inserted, error: newsError } = await supabase
    .from("news_articles")
    .insert(articleRows)
    .select("id, title");
  if (newsError) throw newsError;
  console.log(`ニュース ${inserted.length} 件を作成しました`);

  const quizRows = inserted.map((row, i) => {
    const source = SAMPLE_NEWS[i];
    return {
      news_id: row.id,
      question: source.quiz.question,
      option_a: source.quiz.option_a,
      option_b: source.quiz.option_b,
      option_c: source.quiz.option_c,
      sample_votes_a: source.quiz.votes[0],
      sample_votes_b: source.quiz.votes[1],
      sample_votes_c: source.quiz.votes[2],
      votes_a: source.quiz.votes[0],
      votes_b: source.quiz.votes[1],
      votes_c: source.quiz.votes[2],
    };
  });

  const { error: quizError } = await supabase.from("news_quizzes").insert(quizRows);
  if (quizError) throw quizError;
  console.log(`クイズ ${quizRows.length} 件を作成しました`);

  // ---------------- map posts ----------------
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username");
  if (profileError) throw profileError;
  const byName = new Map(profiles.map((p) => [p.username, p.id]));

  const { data: oldPosts } = await supabase.from("map_posts").select("id").eq("is_sample", true);
  if (oldPosts?.length) {
    const { error } = await supabase.from("map_posts").delete().eq("is_sample", true);
    if (error) throw error;
    console.log(`既存のサンプル投稿 ${oldPosts.length} 件を削除しました`);
  }

  const missing = new Set();
  const postRows = [...SAMPLE_MAP_POSTS, ...SAMPLE_OFFICIAL_POSTS]
    .map((p) => {
      const userId = byName.get(p.persona);
      if (!userId) {
        missing.add(p.persona);
        return null;
      }
      const createdAt = new Date(now - p.minutesAgo * 60_000);
      return {
        user_id: userId,
        latitude: p.lat,
        longitude: p.lng,
        post_type: p.type,
        category: p.category,
        comment: p.comment,
        urgency: p.urgency,
        area: p.area,
        is_official: Boolean(p.official),
        is_sample: true,
        created_at: createdAt.toISOString(),
        expires_at: new Date(
          createdAt.getTime() + ttlHoursFor(p.type) * 3600_000,
        ).toISOString(),
      };
    })
    .filter(Boolean);

  if (missing.size) {
    console.warn(
      `次のサンプルユーザーが見つかりませんでした（スキップ）: ${[...missing].join(", ")}`,
    );
  }

  const { data: insertedPosts, error: postError } = await supabase
    .from("map_posts")
    .insert(postRows)
    .select("id");
  if (postError) throw postError;
  console.log(`ドパマップ投稿 ${insertedPosts.length} 件を作成しました`);

  await supabase.auth.signOut();
  console.log("\nシードが完了しました。");
}

main().catch((err) => {
  console.error("\nシードに失敗しました:", err.message ?? err);
  process.exit(1);
});
