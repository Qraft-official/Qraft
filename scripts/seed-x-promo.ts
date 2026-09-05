import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pastPromoTimes } from "./launch-content/timestamps";
import { X_PROMO_PROBLEMS } from "./x-promo-problems";

const PREFERRED_EMAIL = "qraft.study@gmail.com";

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

async function hasColumn(admin: SupabaseClient, table: string, column: string) {
  const { error } = await admin.from(table).select(column).limit(0);
  return !error;
}

async function tableExists(admin: SupabaseClient, table: string) {
  const { error } = await admin.from(table).select("*").limit(0);
  if (!error) return true;
  return !/does not exist|schema cache|could not find/i.test(error.message);
}

async function dbNowMs(admin: SupabaseClient) {
  const { data, error } = await admin.rpc("server_now");
  if (error || !data) {
    throw new Error(`Cannot read database now(): ${error?.message ?? "empty"}`);
  }
  const t = Date.parse(String(data));
  if (!Number.isFinite(t)) throw new Error("database now() was not a timestamp");
  return t;
}

type Author = { id: string; email: string | null; handle: string | null; name: string | null; source: string };

async function resolveAuthor(admin: SupabaseClient): Promise<Author | { error: string }> {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) return { error: listed.error.message };
  const preferred = listed.data.users.find(
    (u) => (u.email ?? "").toLowerCase() === PREFERRED_EMAIL,
  );
  if (preferred) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id, name, handle")
      .eq("id", preferred.id)
      .maybeSingle();
    return {
      id: preferred.id,
      email: preferred.email ?? PREFERRED_EMAIL,
      handle: typeof profile?.handle === "string" ? profile.handle : null,
      name: typeof profile?.name === "string" ? profile.name : null,
      source: "auth email qraft.study@gmail.com",
    };
  }

  if (await hasColumn(admin, "profiles", "is_sample")) {
    const { data: samples } = await admin
      .from("profiles")
      .select("id, name, handle")
      .eq("is_sample", true)
      .in("handle", ["qraft", "qraft_official", "qraft.study"]);
    const official = (samples ?? [])[0] as { id: string; name?: string; handle?: string } | undefined;
    if (official?.id) {
      return {
        id: official.id,
        email: null,
        handle: official.handle ?? null,
        name: official.name ?? null,
        source: "existing official sample profile",
      };
    }
  }

  const { data: byHandle } = await admin
    .from("profiles")
    .select("id, name, handle")
    .in("handle", ["qraft", "qraft_official"])
    .maybeSingle();
  if (byHandle?.id) {
    return {
      id: String(byHandle.id),
      email: null,
      handle: typeof byHandle.handle === "string" ? byHandle.handle : null,
      name: typeof byHandle.name === "string" ? byHandle.name : null,
      source: "existing official handle",
    };
  }

  return {
    error:
      "No official/sample author: qraft.study@gmail.com is not in Auth, and no official sample profile (handle qraft / qraft_official) exists. Refusing to create a user.",
  };
}

function payload(authorId: string, problem: (typeof X_PROMO_PROBLEMS)[number], at: string, includeHints: boolean) {
  const solution = `${problem.solution}\n\n${problem.ahaPoint}`;
  const row: Record<string, unknown> = {
    author_id: authorId,
    title: problem.title,
    problem_text: problem.problem,
    solution,
    subject: problem.subject,
    photo: null,
    is_sprint: false,
    sprint_day: null,
    pages: [{ id: "p1", latex: problem.problem, doodle: 0 }],
    problem_format: "typed",
    mode: "aha",
    correct_answer: problem.answer,
    difficulty_level: problem.level,
    created_at: at,
    publish_at: at,
  };
  if (includeHints) row.hints = problem.hint ? [problem.hint] : [];
  return row;
}

async function main() {
  loadDotEnv();
  const dryRun = process.argv.includes("--dry-run");
  const admin = adminClient();
  if (!admin) {
    throw new Error("Cannot seed: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const author = await resolveAuthor(admin);
  if ("error" in author) {
    console.error(author.error);
    process.exit(2);
  }

  if (!(await hasColumn(admin, "problems", "publish_at"))) {
    throw new Error("Cannot seed: apply migration 20260905200000_problem_publish_at.sql first.");
  }
  if (!(await tableExists(admin, "launch_seed_map"))) {
    throw new Error("Cannot seed: launch_seed_map is missing.");
  }

  const nowMs = await dbNowMs(admin);
  const times = pastPromoTimes(X_PROMO_PROBLEMS.length, nowMs);
  for (const iso of times) {
    if (Date.parse(iso) > nowMs) throw new Error(`Refusing future timestamp ${iso}`);
  }

  const { data: mapRows } = await admin
    .from("launch_seed_map")
    .select("seed_key, kind, entity_id")
    .in(
      "seed_key",
      X_PROMO_PROBLEMS.map((p) => p.seedKey),
    );
  const mapByKey = new Map(
    (mapRows ?? []).map((r) => [String((r as { seed_key: string }).seed_key), r as { entity_id: string }]),
  );

  console.log(
    [
      `Author: ${author.source}`,
      `Author id: ${author.id}`,
      `Handle: ${author.handle ?? "(none)"}`,
      `Email: ${author.email ?? "(none)"}`,
      `DB now: ${new Date(nowMs).toISOString()}`,
      `Posts: ${X_PROMO_PROBLEMS.length}`,
      `Mode: ${dryRun ? "dry-run" : "write"}`,
    ].join("\n"),
  );

  if (dryRun) {
    for (let i = 0; i < X_PROMO_PROBLEMS.length; i++) {
      console.log(`${X_PROMO_PROBLEMS[i].seedKey} ${times[i]} ${X_PROMO_PROBLEMS[i].title}`);
    }
    return;
  }

  const includeHints = await hasColumn(admin, "problems", "hints");
  for (let i = 0; i < X_PROMO_PROBLEMS.length; i++) {
    const problem = X_PROMO_PROBLEMS[i];
    const at = times[i];
    const row = payload(author.id, problem, at, includeHints);
    const mapped = mapByKey.get(problem.seedKey);
    if (mapped?.entity_id) {
      const { data: existing, error: readError } = await admin
        .from("problems")
        .select("id, author_id")
        .eq("id", mapped.entity_id)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      if (!existing) {
        throw new Error(`Mapped id ${mapped.entity_id} for ${problem.seedKey} is missing; refusing to insert a duplicate blindly.`);
      }
      if (String((existing as { author_id: string }).author_id) !== author.id) {
        throw new Error(`Refusing to update ${problem.seedKey}: mapped row is not the official author.`);
      }
      const { error } = await admin.from("problems").update(row).eq("id", mapped.entity_id).eq("author_id", author.id);
      if (error) throw new Error(`Failed updating ${problem.seedKey}: ${error.message}`);
      continue;
    }
    const inserted = await admin.from("problems").insert(row).select("id").single();
    if (inserted.error || !inserted.data) {
      throw new Error(`Failed inserting ${problem.seedKey}: ${inserted.error?.message ?? "no row"}`);
    }
    const { error: mapError } = await admin.from("launch_seed_map").upsert({
      seed_key: problem.seedKey,
      kind: "problem",
      entity_id: (inserted.data as { id: string }).id,
    });
    if (mapError) throw new Error(`Failed mapping ${problem.seedKey}: ${mapError.message}`);
  }

  console.log("X promo seed write completed.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
