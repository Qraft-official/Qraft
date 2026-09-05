import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { assignProblems } from "./launch-content/assign";
import { loadLaunchProblems, type LaunchProblem } from "./launch-content/load-problems";
import { SAMPLE_USERS } from "./launch-content/sample-users";
import {
  LAUNCH_PUBLISH_END_ISO,
  LAUNCH_PUBLISH_START_ISO,
  staggeredPublishTimes,
} from "./launch-content/timestamps";

type SeedMapRow = { seed_key: string; kind: string; entity_id: string };

function loadDotEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  for (const name of [".env.local", ".env"]) {
    const path = resolve(root, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function printReport(lines: string[]) {
  console.log(lines.join("\n"));
}

async function tableExists(admin: SupabaseClient, table: string) {
  const { error } = await admin.from(table).select("*").limit(0);
  if (!error) return true;
  return !/does not exist|schema cache|could not find/i.test(error.message);
}

async function hasColumn(admin: SupabaseClient, table: string, column: string) {
  const { error } = await admin.from(table).select(column).limit(0);
  return !error;
}

async function loadSeedMap(admin: SupabaseClient | null): Promise<SeedMapRow[]> {
  if (!admin) return [];
  if (!(await tableExists(admin, "launch_seed_map"))) return [];
  const { data, error } = await admin.from("launch_seed_map").select("seed_key, kind, entity_id");
  if (error) return [];
  return (data ?? []) as SeedMapRow[];
}

async function identifiedSampleProblemIds(admin: SupabaseClient | null) {
  if (!admin) return [] as string[];
  const ids = new Set<string>();
  const map = await loadSeedMap(admin);
  for (const row of map) {
    if (row.kind === "problem" && row.entity_id) ids.add(row.entity_id);
  }
  if (await hasColumn(admin, "profiles", "is_sample")) {
    const { data: samples } = await admin.from("profiles").select("id").eq("is_sample", true);
    const sampleIds = (samples ?? []).map((r) => String((r as { id: string }).id));
    if (sampleIds.length) {
      const { data: posts } = await admin.from("problems").select("id").in("author_id", sampleIds);
      for (const row of posts ?? []) ids.add(String((row as { id: string }).id));
    }
  }
  return [...ids];
}

function problemRow(
  authorId: string,
  problem: LaunchProblem,
  publishedAt: string,
  includeHints: boolean,
) {
  const row: Record<string, unknown> = {
    author_id: authorId,
    title: problem.title,
    problem_text: problem.problem,
    solution: problem.solution || null,
    subject: problem.subject,
    photo: null,
    is_sprint: false,
    sprint_day: null,
    pages: [{ id: "p1", latex: problem.problem, doodle: 0 }],
    problem_format: "typed",
    mode: "aha",
    correct_answer: problem.answer,
    difficulty_level: problem.level,
    created_at: publishedAt,
    publish_at: publishedAt,
  };
  if (includeHints) row.hints = problem.hint ? [problem.hint] : [];
  return row;
}

async function main() {
  loadDotEnv();
  const dryRun = process.argv.includes("--dry-run");
  const loaded = loadLaunchProblems();
  const assigned = assignProblems(SAMPLE_USERS, loaded.valid);
  const times = staggeredPublishTimes(
    assigned.map((row) => ({ seedKey: row.problem.seedKey, authorKey: row.user.seedKey })),
  );

  const admin = adminClient();
  const seedMap = await loadSeedMap(admin);
  const mapByKey = new Map(seedMap.map((r) => [r.seed_key, r]));
  const existingProblemKeys = new Set(
    seedMap.filter((r) => r.kind === "problem").map((r) => r.seed_key),
  );
  const existingUserKeys = new Set(seedMap.filter((r) => r.kind === "user").map((r) => r.seed_key));

  let existingSampleUsers = 0;
  if (admin && (await hasColumn(admin, "profiles", "is_sample"))) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_sample", true);
    existingSampleUsers = count ?? existingUserKeys.size;
  } else {
    existingSampleUsers = existingUserKeys.size;
  }

  const toDelete = await identifiedSampleProblemIds(admin);
  const currentProblemIds = new Set(
    seedMap.filter((r) => r.kind === "problem" && loaded.valid.some((p) => p.seedKey === r.seed_key)).map((r) => r.entity_id),
  );
  const staleDeletes = toDelete.filter((id) => !currentProblemIds.has(id));

  const postsToCreate = assigned.filter((row) => !existingProblemKeys.has(row.problem.seedKey));
  const postsToSkip = assigned.filter((row) => existingProblemKeys.has(row.problem.seedKey));
  const usersToCreate = SAMPLE_USERS.filter((u) => !existingUserKeys.has(u.seedKey)).length;

  printReport([
    `Existing sample posts to delete: ${staleDeletes.length}`,
    `Existing real posts affected: 0`,
    ``,
    `Sample users to create: ${usersToCreate}`,
    `Sample users already existing: ${existingSampleUsers}`,
    ``,
    `Problems loaded: ${loaded.loadedCount}`,
    `Valid problems: ${loaded.valid.length}`,
    `Invalid problems: ${loaded.invalid.length}`,
    ``,
    `Posts to create: ${postsToCreate.length}`,
    `Posts to reschedule: ${postsToSkip.length}`,
    ``,
    `Publish window (JST):`,
    `${LAUNCH_PUBLISH_START_ISO} .. ${LAUNCH_PUBLISH_END_ISO}`,
    `First planned: ${times[0] ?? "(none)"}`,
    `Last planned: ${times[times.length - 1] ?? "(none)"}`,
    ``,
    `JSON files: ${loaded.files.join(", ") || "(none)"}`,
    `DB connected: ${admin ? "yes" : "no (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)"}`,
    `Mode: ${dryRun ? "dry-run" : "write"}`,
  ]);

  if (loaded.invalid.length) {
    console.log("\nInvalid problems:");
    for (const err of loaded.invalid) console.log(`- ${err}`);
  }

  if (dryRun) {
    console.log("\nDry-run: no database writes.");
    return;
  }

  if (!admin) {
    throw new Error("Cannot seed: service role client is not configured.");
  }
  if (!(await tableExists(admin, "launch_seed_map")) || !(await hasColumn(admin, "profiles", "is_sample"))) {
    throw new Error("Cannot seed: apply migration 20260905140000_launch_sample_accounts.sql first.");
  }
  if (!(await hasColumn(admin, "problems", "publish_at"))) {
    throw new Error("Cannot seed: apply migration 20260905200000_problem_publish_at.sql first.");
  }

  const includeHints = await hasColumn(admin, "problems", "hints");

  if (staleDeletes.length) {
    const { error } = await admin.from("problems").delete().in("id", staleDeletes);
    if (error) throw new Error(`Failed deleting identified sample posts: ${error.message}`);
    await admin.from("launch_seed_map").delete().in("entity_id", staleDeletes).eq("kind", "problem");
  }

  const userIds = new Map<string, string>();
  for (const row of seedMap) {
    if (row.kind === "user") userIds.set(row.seed_key, row.entity_id);
  }

  for (const user of SAMPLE_USERS) {
    const mapped = mapByKey.get(user.seedKey);
    if (mapped?.kind === "user") {
      userIds.set(user.seedKey, mapped.entity_id);
      await admin
        .from("profiles")
        .update({
          name: user.name,
          handle: user.handle,
          bio: user.bio,
          is_sample: true,
          math_tier: user.mathTier,
          physics_tier: user.physicsTier,
          chemistry_tier: user.chemistryTier,
        })
        .eq("id", mapped.entity_id);
      continue;
    }

    const email = `qraft.sample.${user.seedKey.slice(-3)}@qraft.invalid`;
    const password = randomBytes(32).toString("base64url");
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: user.name, handle: user.handle, bio: user.bio },
      app_metadata: { qraft_sample: true, seed_key: user.seedKey },
    });
    let id = created.data.user?.id;
    if (created.error || !id) {
      const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = listed.data.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (!existing) {
        throw new Error(`Failed creating ${user.seedKey}: ${created.error?.message ?? "no user"}`);
      }
      id = existing.id;
      await admin.auth.admin.updateUserById(id, {
        user_metadata: { name: user.name, handle: user.handle, bio: user.bio },
        app_metadata: { qraft_sample: true, seed_key: user.seedKey },
      });
    }
    const { error: profileError } = await admin.from("profiles").upsert({
      id,
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      is_sample: true,
      math_tier: user.mathTier,
      physics_tier: user.physicsTier,
      chemistry_tier: user.chemistryTier,
    });
    if (profileError) throw new Error(`Failed updating profile ${user.seedKey}: ${profileError.message}`);
    const { error: mapError } = await admin.from("launch_seed_map").upsert({
      seed_key: user.seedKey,
      kind: "user",
      entity_id: id,
    });
    if (mapError) throw new Error(`Failed mapping ${user.seedKey}: ${mapError.message}`);
    userIds.set(user.seedKey, id);
  }

  for (let i = 0; i < assigned.length; i++) {
    const row = assigned[i];
    const authorId = userIds.get(row.user.seedKey);
    if (!authorId) throw new Error(`Missing author for ${row.user.seedKey}`);
    const publishedAt = times[i];
    const payload = problemRow(authorId, row.problem, publishedAt, includeHints);
    const mapped = mapByKey.get(row.problem.seedKey);
    if (mapped?.kind === "problem") {
      const { error } = await admin
        .from("problems")
        .update({
          title: payload.title,
          problem_text: payload.problem_text,
          solution: payload.solution,
          subject: payload.subject,
          pages: payload.pages,
          correct_answer: payload.correct_answer,
          difficulty_level: payload.difficulty_level,
          created_at: publishedAt,
          publish_at: publishedAt,
          ...(includeHints ? { hints: payload.hints } : {}),
        })
        .eq("id", mapped.entity_id)
        .eq("author_id", authorId);
      if (error) throw new Error(`Failed updating ${row.problem.seedKey}: ${error.message}`);
      continue;
    }
    const inserted = await admin.from("problems").insert(payload).select("id").single();
    if (inserted.error || !inserted.data) {
      throw new Error(`Failed inserting ${row.problem.seedKey}: ${inserted.error?.message ?? "no row"}`);
    }
    const { error: mapError } = await admin.from("launch_seed_map").upsert({
      seed_key: row.problem.seedKey,
      kind: "problem",
      entity_id: (inserted.data as { id: string }).id,
    });
    if (mapError) throw new Error(`Failed mapping ${row.problem.seedKey}: ${mapError.message}`);
  }

  console.log("\nSeed write completed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
