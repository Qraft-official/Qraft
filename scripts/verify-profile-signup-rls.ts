import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ownProfileInsertPayload } from "../src/lib/auth";

const sql = readFileSync(
  "supabase/migrations/20260912050000_profiles_signup_insert_rls.sql",
  "utf8",
);
assert.match(sql, /drop policy if exists "users can insert own profile"/);
assert.match(sql, /drop policy if exists "users can update own profile"/);
assert.match(sql, /id = \(select auth\.uid\(\)\)/);
assert.match(sql, /coalesce\(is_sample, false\) = false/);
assert.doesNotMatch(sql, /update public\.profiles\s+set/i);
assert.doesNotMatch(sql, /\bdelete from public\.profiles\b/i);
assert.doesNotMatch(sql, /\btruncate\b/i);

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
