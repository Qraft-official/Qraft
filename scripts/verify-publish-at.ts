import assert from "node:assert/strict";
import { assignProblems } from "./launch-content/assign";
import { loadLaunchProblems } from "./launch-content/load-problems";
import { SAMPLE_USERS } from "./launch-content/sample-users";
import {
  LAUNCH_PUBLISH_END_ISO,
  LAUNCH_PUBLISH_START_ISO,
  pastPromoTimes,
  staggeredPublishTimes,
} from "./launch-content/timestamps";
import { X_PROMO_PROBLEMS } from "./x-promo-problems";

const start = Date.parse(LAUNCH_PUBLISH_START_ISO);
const end = Date.parse(LAUNCH_PUBLISH_END_ISO);
assert.equal(start, Date.parse("2026-09-11T15:00:00.000Z"));
assert.equal(end, Date.parse("2026-09-11T23:00:00.000Z"));

const loaded = loadLaunchProblems();
const assigned = assignProblems(SAMPLE_USERS, loaded.valid);
const times = staggeredPublishTimes(
  assigned.map((row) => ({ seedKey: row.problem.seedKey, authorKey: row.user.seedKey })),
);
assert.equal(times.length, assigned.length);
assert.equal(new Set(times).size, times.length);

const parsed = times.map((iso) => Date.parse(iso)).sort((a, b) => a - b);
assert.ok(parsed[0] >= start);
assert.ok(parsed[0] > start, "first post is after 00:00 JST");
assert.ok(parsed[parsed.length - 1] < end, "last post is before 08:00 JST");

const byAuthor = new Map<string, number[]>();
assigned.forEach((row, i) => {
  const list = byAuthor.get(row.user.seedKey) ?? [];
  list.push(Date.parse(times[i]));
  byAuthor.set(row.user.seedKey, list);
});
for (const [author, stamps] of byAuthor) {
  stamps.sort((a, b) => a - b);
  for (let i = 1; i < stamps.length; i++) {
    assert.ok(
      stamps[i] - stamps[i - 1] >= 10 * 60_000,
      `${author} posts too close: ${new Date(stamps[i - 1]).toISOString()} ${new Date(stamps[i]).toISOString()}`,
    );
  }
}

const deltas: number[] = [];
for (let i = 1; i < parsed.length; i++) deltas.push(parsed[i] - parsed[i - 1]);
const uniqueDeltas = new Set(deltas);
assert.ok(uniqueDeltas.size > 3, "gaps should not be mechanically identical");

const now = Date.parse("2026-09-05T15:00:00+09:00");
assert.ok(now < start, "today is before launch");
assert.ok(parsed.every((t) => t > now), "launch sample publish_at is still in the future");

const promoNow = Date.parse("2026-09-05T15:13:00+09:00");
const promo = pastPromoTimes(8, promoNow);
assert.equal(promo.length, 8);
assert.equal(new Set(promo).size, 8);
assert.ok(promo.every((iso) => Date.parse(iso) <= promoNow));
assert.equal(X_PROMO_PROBLEMS.length, 8);
assert.equal(new Set(X_PROMO_PROBLEMS.map((p) => p.seedKey)).size, 8);

console.log("ok publish-at");
console.log(`LAUNCH_PUBLISH_START ${LAUNCH_PUBLISH_START_ISO}`);
console.log(`LAUNCH_PUBLISH_END ${LAUNCH_PUBLISH_END_ISO}`);
console.log(`launch posts ${times.length}`);
console.log(`first ${times.map((iso) => Date.parse(iso)).sort((a, b) => a - b)[0]}`);
console.log(`last ${parsed[parsed.length - 1]}`);
