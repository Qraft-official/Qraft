/**
 * Register 2026-09-16..30 PULSE (21:00 JST) from a local (gitignored) secret JSON.
 *
 * Reuses problems.is_sprint / sprint_day / publish_at + sprint_secrets.
 * Does not touch the existing 2026-09-12 PULSE.
 *
 *   npx tsx scripts/seed-sprint-september-2026.ts --dry-run
 *   npx tsx scripts/seed-sprint-september-2026.ts --execute --author-handle qrafterd
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { PROD_SUPABASE_REF } from "./launch-content";
import {
  acceptedAnswersFor,
  diagramAssetStatus,
  inferAnswerType,
  loadSeptemberQuestions,
  publicExplanation,
  repoRootFromThisFile,
  seedKeyForSeptemberDay,
  septemberJsonPathFromRepoRoot,
  validateSeptemberQuestions,
  type SeptemberQuestion,
} from "./sprint-september-2026";

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

const root = repoRootFromThisFile(import.meta.url);
const args = process.argv.slice(2);
const argSet = new Set(args);
const execute = argSet.has("--execute");
const jsonFlag = (() => {
  const i = args.indexOf("--json");
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return "";
})();
if (jsonFlag) process.env.QRAFT_SPRINT_SEP_2026_JSON = jsonFlag;
const authorHandleArg = (() => {
  const i = args.indexOf("--author-handle");
  if (i >= 0 && args[i + 1]) return args[i + 1].replace(/^@/, "");
  return (process.env.PULSE_AUTHOR_HANDLE ?? "").replace(/^@/, "");
})();

if (execute && argSet.has("--dry-run")) {
  console.error("Use either --dry-run or --execute, not both.");
  process.exit(1);
}

function planRow(q: SeptemberQuestion, rootDir: string) {
  const diagram = q.requires_diagram ? diagramAssetStatus(rootDir, q.sprint_day) : null;
  const ready = !q.requires_diagram || Boolean(diagram?.exists);
  return {
    sprintDay: q.sprint_day,
    seedKey: seedKeyForSeptemberDay(q.sprint_day),
    title: q.title,
    topic: q.category,
    difficulty: q.difficulty,
    requiresDiagram: q.requires_diagram,
    diagramFile: diagram?.file ?? null,
    diagramReady: ready,
    photo: diagram?.exists ? diagram.publicPath : null,
    answerType: inferAnswerType(q.answer),
    acceptedCount: acceptedAnswersFor(q.answer).length,
    publishAtJst: q.publish_at,
    action: ready ? "upsert-if-unpublished" : "skip-missing-diagram",
  };
}

async function main() {
  const questions = loadSeptemberQuestions(root);
  const issues = validateSeptemberQuestions(questions);
  console.log("mode", execute ? "EXECUTE" : "DRY-RUN");
  console.log("json", septemberJsonPathFromRepoRoot(root));
  console.log("count", questions.length);
  console.log("validation_issues", issues.length);
  for (const issue of issues) {
    console.log(`  #${issue.index} ${issue.sprintDay ?? ""} ${issue.field ?? ""} ${issue.message}`);
  }
  if (issues.length) process.exit(1);

  const plans = questions.map((q) => planRow(q, root));
  const skipDiagram = plans.filter((p) => p.action === "skip-missing-diagram");
  const ready = plans.filter((p) => p.action !== "skip-missing-diagram");
  console.log("ready_to_register", ready.length);
  console.log("skip_missing_diagram", skipDiagram.length);
  console.log("diagrams_needed:");
  for (const p of plans.filter((x) => x.requiresDiagram)) {
    console.log(`  ${p.sprintDay}  ${p.diagramFile}  ${p.diagramReady ? "FOUND" : "MISSING"}  ${p.title}`);
  }
  console.log("schedule (secrets not printed):");
  for (const p of plans) {
    console.log(`  ${p.publishAtJst}  ${p.seedKey}  lv${p.difficulty}  ${p.action}  ${p.title}`);
  }

  if (!execute) {
    console.log("\nNo database writes (dry-run).");
    console.log("本番投入は許可後にだけ:");
    console.log("  npx tsx scripts/seed-sprint-september-2026.ts --execute --author-handle qrafterd");
    return;
  }

  if (!authorHandleArg) {
    throw new Error("--author-handle または PULSE_AUTHOR_HANDLE が必要です");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です");
  }
  if (!url.includes(PROD_SUPABASE_REF)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL が本番 Qraft project ではありません。中止します。");
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: author, error: authorErr } = await admin
    .from("profiles")
    .select("id, handle, name")
    .ilike("handle", authorHandleArg)
    .maybeSingle();
  if (authorErr) throw new Error(authorErr.message);
  if (!author?.id) throw new Error(`profile @${authorHandleArg} が見つかりません`);

  const { data: existingSprint } = await admin
    .from("problems")
    .select("id, sprint_day, seed_key, publish_at, title")
    .eq("is_sprint", true)
    .gte("sprint_day", "2026-09-16")
    .lte("sprint_day", "2026-09-30");

  const byDay = new Map(
    (existingSprint ?? []).map((r) => [
      String((r as { sprint_day: string }).sprint_day),
      r as { id: string; sprint_day: string; seed_key: string | null; publish_at: string | null; title: string },
    ]),
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const now = Date.now();

  for (const q of questions) {
    const plan = planRow(q, root);
    if (plan.action === "skip-missing-diagram") {
      skipped += 1;
      console.log(`skip diagram ${plan.sprintDay} ${plan.title}`);
      continue;
    }
    const existing = byDay.get(q.sprint_day);
    if (existing && existing.seed_key && existing.seed_key !== plan.seedKey) {
      throw new Error(`${q.sprint_day} は別の PULSE が既にあります（id=${existing.id}）。上書きしません。`);
    }
    const live = existing?.publish_at ? Date.parse(existing.publish_at) <= now : false;
    if (existing && live) {
      skipped += 1;
      console.log(`skip live ${plan.sprintDay} ${existing.id}`);
      continue;
    }

    const problemPayload = {
      author_id: author.id,
      title: q.title.trim(),
      problem_text: q.problem.trim(),
      subject: "math",
      topic: q.category.trim(),
      difficulty_level: q.difficulty,
      is_sprint: true,
      sprint_day: q.sprint_day,
      mode: "aha",
      solution: null,
      correct_answer: null,
      photo: plan.photo,
      seed_key: plan.seedKey,
    };

    let problemId = existing?.id;
    if (existing) {
      const { error } = await admin.from("problems").update(problemPayload).eq("id", existing.id);
      if (error) throw new Error(`update ${plan.seedKey}: ${error.message}`);
      updated += 1;
    } else {
      const { data, error } = await admin.from("problems").insert(problemPayload).select("id").single();
      if (error) throw new Error(`insert ${plan.seedKey}: ${error.message}`);
      problemId = (data as { id: string }).id;
      inserted += 1;
    }
    if (!problemId) throw new Error(`no id for ${plan.seedKey}`);

    const { error: secretErr } = await admin.from("sprint_secrets").upsert(
      {
        problem_id: problemId,
        correct_answer: q.answer.trim(),
        hint: q.hint.trim(),
        explanation: publicExplanation(q.explanation, q.aha_point),
        answer_type: plan.answerType,
        accepted_answers: acceptedAnswersFor(q.answer),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "problem_id" },
    );
    if (secretErr) {
      if (!existing) await admin.from("problems").delete().eq("id", problemId);
      throw new Error(`secrets ${plan.seedKey}: ${secretErr.message}`);
    }
    console.log(`${existing ? "update" : "insert"} ${plan.sprintDay} ${problemId}`);
  }

  console.log(
    `execute done inserted=${inserted} updated=${updated} skipped=${skipped} author=@${author.handle}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
