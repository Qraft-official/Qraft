import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BLACKBOARD_SEED_KEY = "qraft_x_aha_blackboard_001";
const PREFERRED_EMAIL = "qraft.study@gmail.com";

const PROBLEM = {
  title: "最後に残る数",
  subject: "math" as const,
  field: "整数・規則性",
  level: 3,
  mode: "aha" as const,
  problem:
    "黒板に 1, 2, 3, …, 100 が書かれています。\n\n好きな2つの数 a, b を消して、\n代わりに a+b-1 を書きます。\n\nこれを数が1つになるまで繰り返します。\n\n最後に残る数はいくつ？",
  answer: "4951",
  hint: "「どの2つを選ぶか」ではなく、\n黒板に書かれている数の合計に注目してみよう。",
  solution:
    "最初の合計は\n\n1+2+…+100\n= 100×101÷2\n= 5050。\n\naとbを消してa+b-1を書くと、\n\n変更前:\na+b\n\n変更後:\na+b-1\n\nなので、1回操作するたびに黒板上の数の合計は必ず1減る。\n\n最初は100個の数があり、\n最後は1個になるので操作回数は99回。\n\nしたがって最後の合計、つまり最後に残る数は\n\n5050-99=4951。\n\nどの2数を選び続けても答えは同じ。",
  ahaPoint:
    "複雑な操作を追跡する必要はなく、「操作のたびに全体の合計が1減る」という不変に近い性質だけを見ると一瞬で解ける。",
};

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

type Author = { id: string; email: string | null; handle: string | null; source: string };

async function resolveAuthor(admin: SupabaseClient): Promise<Author | { error: string }> {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listed.error) return { error: listed.error.message };
  const preferred = listed.data.users.find(
    (u) => (u.email ?? "").toLowerCase() === PREFERRED_EMAIL,
  );
  if (preferred) {
    return {
      id: preferred.id,
      email: preferred.email ?? PREFERRED_EMAIL,
      handle: null,
      source: "auth email qraft.study@gmail.com",
    };
  }

  if (await hasColumn(admin, "profiles", "is_sample")) {
    const { data: official } = await admin
      .from("profiles")
      .select("id, handle")
      .eq("is_sample", true)
      .in("handle", ["qraft", "qraft_official"])
      .limit(1)
      .maybeSingle();
    if (official?.id) {
      return {
        id: String(official.id),
        email: null,
        handle: typeof official.handle === "string" ? official.handle : null,
        source: "existing official sample profile",
      };
    }
    const { data: anySample } = await admin
      .from("profiles")
      .select("id, handle")
      .eq("is_sample", true)
      .limit(1)
      .maybeSingle();
    if (anySample?.id) {
      return {
        id: String(anySample.id),
        email: null,
        handle: typeof anySample.handle === "string" ? anySample.handle : null,
        source: "existing sample profile",
      };
    }
  }

  return {
    error:
      "No official/sample author: qraft.study@gmail.com is not in Auth, and no sample profile exists. Refusing to create a user. Create that Auth account (or a sample official profile), then run: npx tsx scripts/seed-x-aha-blackboard.ts",
  };
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

  if (!(await tableExists(admin, "launch_seed_map"))) {
    throw new Error("Cannot seed: launch_seed_map is missing. Apply publish_at / seed-map migration first.");
  }

  let nowIso: string;
  const nowRpc = await admin.rpc("server_now");
  if (!nowRpc.error && nowRpc.data) {
    nowIso = String(nowRpc.data);
  } else {
    const { data: ping } = await admin.from("launch_seed_map").select("created_at").limit(1);
    void ping;
    nowIso = new Date().toISOString();
  }
  if (Date.parse(nowIso) > Date.now() + 30_000) {
    throw new Error("Refusing future timestamp from clock");
  }

  const includeHints = await hasColumn(admin, "problems", "hints");
  const includePublish = await hasColumn(admin, "problems", "publish_at");
  const solution = `${PROBLEM.solution}\n\n${PROBLEM.ahaPoint}`;
  const row: Record<string, unknown> = {
    author_id: author.id,
    title: PROBLEM.title,
    problem_text: PROBLEM.problem,
    solution,
    subject: PROBLEM.subject,
    photo: null,
    is_sprint: false,
    sprint_day: null,
    pages: [{ id: "p1", latex: PROBLEM.problem, doodle: 0 }],
    problem_format: "typed",
    mode: "aha",
    correct_answer: PROBLEM.answer,
    difficulty_level: PROBLEM.level,
    created_at: nowIso,
  };
  if (includePublish) row.publish_at = nowIso;
  if (includeHints) row.hints = PROBLEM.hint ? [PROBLEM.hint] : [];

  const { data: mapped } = await admin
    .from("launch_seed_map")
    .select("entity_id")
    .eq("seed_key", BLACKBOARD_SEED_KEY)
    .maybeSingle();

  console.log(
    [
      `Author: ${author.source}`,
      `Author id: ${author.id}`,
      `Seed key: ${BLACKBOARD_SEED_KEY}`,
      `Timestamp: ${nowIso}`,
      `Existing map: ${mapped ? String((mapped as { entity_id: string }).entity_id) : "(none)"}`,
      `Mode: ${dryRun ? "dry-run" : "write"}`,
    ].join("\n"),
  );

  if (dryRun) return;

  if (mapped?.entity_id) {
    const entityId = String((mapped as { entity_id: string }).entity_id);
    const { data: existing, error: readError } = await admin
      .from("problems")
      .select("id, author_id")
      .eq("id", entityId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!existing) throw new Error(`Mapped problem ${entityId} is missing; refusing to insert a second copy.`);
    if (String((existing as { author_id: string }).author_id) !== author.id) {
      throw new Error("Refusing to update a mapped row that is not the official/sample author.");
    }
    const { error } = await admin.from("problems").update(row).eq("id", entityId).eq("author_id", author.id);
    if (error) throw new Error(error.message);
    console.log(`Updated ${entityId}`);
    return;
  }

  const inserted = await admin.from("problems").insert(row).select("id").single();
  if (inserted.error || !inserted.data) {
    throw new Error(inserted.error?.message ?? "insert failed");
  }
  const id = String((inserted.data as { id: string }).id);
  const { error: mapError } = await admin.from("launch_seed_map").upsert({
    seed_key: BLACKBOARD_SEED_KEY,
    kind: "problem",
    entity_id: id,
  });
  if (mapError) throw new Error(mapError.message);
  console.log(`Inserted ${id}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
