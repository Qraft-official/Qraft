import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ownProfileInsertPayload } from "../src/lib/auth";

for (const file of [
  "supabase/migrations/20260912050000_profiles_signup_insert_rls.sql",
  "supabase/migrations/20260912080000_ensure_my_profile_signup.sql",
]) {
  const sql = readFileSync(file, "utf8");
  assert.match(sql, /drop policy if exists "users can insert own profile"/);
  assert.match(sql, /drop policy if exists "users can update own profile"/);
  assert.match(sql, /id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /coalesce\(is_sample, false\) = false/);
  assert.doesNotMatch(sql, /update public\.profiles\s+set/i);
  assert.doesNotMatch(sql, /\bdelete from public\.profiles\b/i);
  assert.doesNotMatch(sql, /\btruncate\b/i);
}

const rpc = readFileSync("supabase/migrations/20260912080000_ensure_my_profile_signup.sql", "utf8");
assert.match(rpc, /create or replace function public\.ensure_my_profile/);
assert.match(rpc, /security definer/i);
assert.match(rpc, /uid uuid := \(select auth\.uid\(\)\)/);
assert.match(rpc, /is_sample, false/);

const row = ownProfileInsertPayload({
  id: "11111111-1111-1111-1111-111111111111",
  email: "new@example.com",
  user_metadata: { name: "新規", handle: "new_user" },
});
assert.equal(row.id, "11111111-1111-1111-1111-111111111111");
assert.equal(row.name, "新規");
assert.equal(row.handle, "new_user");
assert.equal("is_sample" in row, false);

function insertAllowed(input: { uid: string | null; rowId: string; isSample: boolean | null }) {
  return input.uid === input.rowId && !(input.isSample ?? false);
}

assert.equal(insertAllowed({ uid: "u1", rowId: "u1", isSample: false }), true);
assert.equal(insertAllowed({ uid: "u1", rowId: "u1", isSample: null }), true);
assert.equal(insertAllowed({ uid: "u1", rowId: "u1", isSample: true }), false);
assert.equal(insertAllowed({ uid: "u1", rowId: "u2", isSample: false }), false);
assert.equal(insertAllowed({ uid: null, rowId: "u1", isSample: false }), false);

console.log("ok profiles signup rls");
