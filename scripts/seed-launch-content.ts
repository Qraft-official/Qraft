/**
 * One-shot launch seed for 9/12 sample posts.
 *
 *   npx tsx scripts/seed-launch-content.ts --dry-run
 *   npx tsx scripts/seed-launch-content.ts --execute
 *
 * --execute writes to the configured Supabase project. Never run without permission.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { planLaunchContent, randomPassword, sampleEmail, sampleUserId, SAMPLE_USERS } from "./launch-content";

function loadEnvFile(path: string) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || !args.has("--execute");
const execute = args.has("--execute");

if (execute && args.has("--dry-run")) {
  console.error("Use either --dry-run or --execute, not both.");
  process.exit(1);
}

function printPlan() {
  const plan = planLaunchContent();
  const counts = new Map<string, number>();
  for (const p of plan.posts) counts.set(p.authorHandle, (counts.get(p.authorHandle) ?? 0) + 1);
  console.log("mode", execute ? "EXECUTE" : "DRY-RUN");
  console.log("files", plan.files);
  console.log("sample_users", plan.users.length);
  console.log("problems", plan.posts.length);
  console.log("first_publish", plan.posts[0]?.publishAtJst);
  console.log("last_publish", plan.posts[plan.posts.length - 1]?.publishAtJst);
  console.log("assignment:");
  for (const u of SAMPLE_USERS) {
    console.log(`  @${u.handle} (${u.name}) ${counts.get(u.handle) ?? 0}問`);
  }
  console.log("schedule:");
  for (const p of plan.posts) {
    console.log(
      `  ${p.publishAtJst}  ${p.seedKey}  @${p.authorHandle}  ${p.subject}/${p.field}  ${p.title}`,
    );
  }
  return plan;
}

async function runExecute(plan: ReturnType<typeof planLaunchContent>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です");
  }
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: colErr } = await admin.from("profiles").select("is_sample").limit(1);
  if (colErr) {
    throw new Error(
      `profiles.is_sample がありません。先に supabase/migrations/20260912020000_launch_sample_and_publish_at.sql を適用してください: ${colErr.message}`,
    );
  }

  for (const user of plan.users) {
    const id = sampleUserId(user.handle);
    const email = sampleEmail(user.handle);

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, handle, is_sample")
      .eq("id", id)
      .maybeSingle();

    if (!existingProfile) {
      const { data: handleHit } = await admin
        .from("profiles")
        .select("id, is_sample, handle")
        .ilike("handle", user.handle)
        .maybeSingle();
      if (handleHit && handleHit.id !== id) {
        if (!handleHit.is_sample) {
          throw new Error(`handle @${user.handle} は実ユーザーが使用中です。中止します。`);
        }
      }
    } else if (existingProfile.is_sample === false) {
      throw new Error(`id ${id} は実ユーザーです。sample 上書きを中止します。`);
    }

    if (!existingProfile) {
      const { error: createErr } = await admin.auth.admin.createUser({
        id,
        email,
        email_confirm: true,
        password: randomPassword(),
        user_metadata: {
          name: user.name,
          handle: user.handle,
          is_sample: true,
        },
      });
      if (createErr && !/already|registered|exists/i.test(createErr.message)) {
        const listed = await admin.auth.admin.getUserById(id);
        if (!listed.data.user) throw createErr;
      }
    }

    const { error: upsertErr } = await admin.from("profiles").upsert(
      {
        id,
        name: user.name,
        handle: user.handle,
        is_sample: true,
        age: null,
        onboarded: true,
      },
      { onConflict: "id" },
    );
    if (upsertErr) throw new Error(`profile ${user.handle}: ${upsertErr.message}`);
  }

  const { data: existingKeys } = await admin
    .from("problems")
    .select("seed_key")
    .like("seed_key", "launch:%");
  const have = new Set((existingKeys ?? []).map((r) => String((r as { seed_key: string }).seed_key)));

  let inserted = 0;
  let skipped = 0;
  for (const post of plan.posts) {
    if (have.has(post.seedKey)) {
      skipped += 1;
      continue;
    }
    const { error } = await admin.from("problems").insert({
      id: post.problemId,
      author_id: post.authorId,
      title: post.title,
      problem_text: post.problemText,
      solution: post.solution,
      subject: post.subject,
      is_sprint: false,
      sprint_day: null,
      mode: post.mode,
      correct_answer: post.correctAnswer,
      difficulty_level: post.level,
      topic: post.field,
      publish_at: post.publishAtIso,
      created_at: post.publishAtIso,
      seed_key: post.seedKey,
      confused_count: 0,
      is_hard_spotlight: false,
      promoted: false,
    });
    if (error) throw new Error(`problem ${post.seedKey}: ${error.message}`);
    inserted += 1;
  }
  console.log(`execute done inserted=${inserted} skipped=${skipped} users=${plan.users.length}`);
}

async function main() {
  const plan = printPlan();
  if (!execute) {
    console.log("\nNo database writes (dry-run).");
    return;
  }
  await runExecute(plan);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
