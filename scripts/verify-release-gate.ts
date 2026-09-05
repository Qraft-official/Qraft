import assert from "node:assert/strict";
import {
  EARLY_ACCESS_START_ISO,
  PUBLIC_RELEASE_AT_ISO,
  defaultReleaseSchedule,
} from "../src/lib/release-config";
import {
  canAccessApp,
  decideEarlyAccessJoin,
  publicSignupAllowed,
  releasePhaseAt,
} from "../src/lib/release-gate";

const schedule = defaultReleaseSchedule();
assert.equal(schedule.earlyAccessStart, EARLY_ACCESS_START_ISO);
assert.equal(schedule.publicReleaseAt, PUBLIC_RELEASE_AT_ISO);
assert.equal(schedule.earlyAccessCap, 30);

const t = (iso: string) => Date.parse(iso);

assert.equal(releasePhaseAt(t("2026-09-11T23:59:00+09:00"), schedule), "prelaunch");
assert.equal(releasePhaseAt(t("2026-09-12T00:00:00+09:00"), schedule), "early");
assert.equal(releasePhaseAt(t("2026-09-18T23:59:00+09:00"), schedule), "early");
assert.equal(releasePhaseAt(t("2026-09-19T00:00:00+09:00"), schedule), "public");
assert.equal(releasePhaseAt(t("2026-09-20T12:00:00+09:00"), schedule), "public");

assert.equal(canAccessApp({ phase: "prelaunch", isAdmin: false, isMember: false }), false);
assert.equal(canAccessApp({ phase: "prelaunch", isAdmin: false, isMember: true }), false);
assert.equal(canAccessApp({ phase: "prelaunch", isAdmin: true, isMember: false }), true);
assert.equal(canAccessApp({ phase: "early", isAdmin: false, isMember: false }), false);
assert.equal(canAccessApp({ phase: "early", isAdmin: false, isMember: true }), true);
assert.equal(canAccessApp({ phase: "early", isAdmin: true, isMember: false }), true);
assert.equal(canAccessApp({ phase: "public", isAdmin: false, isMember: false }), true);
assert.equal(canAccessApp({ phase: "public", isAdmin: false, isMember: true }), true);

assert.equal(publicSignupAllowed("prelaunch"), false);
assert.equal(publicSignupAllowed("early"), false);
assert.equal(publicSignupAllowed("early"), false);
assert.equal(publicSignupAllowed("public"), true);

assert.equal(
  decideEarlyAccessJoin({ phase: "early", memberCount: 29, cap: 30, alreadyMember: false, validCode: true }).ok,
  true,
);
assert.equal(
  decideEarlyAccessJoin({ phase: "early", memberCount: 29, cap: 30, alreadyMember: false, validCode: true }).reason,
  "enrolled",
);
assert.equal(
  decideEarlyAccessJoin({ phase: "early", memberCount: 30, cap: 30, alreadyMember: false, validCode: true }).ok,
  false,
);
assert.equal(
  decideEarlyAccessJoin({ phase: "early", memberCount: 30, cap: 30, alreadyMember: false, validCode: true }).reason,
  "full",
);
assert.equal(
  decideEarlyAccessJoin({ phase: "early", memberCount: 20, cap: 30, alreadyMember: false, validCode: true }).ok,
  true,
);
assert.equal(
  decideEarlyAccessJoin({ phase: "early", memberCount: 30, cap: 30, alreadyMember: true, validCode: false }).ok,
  true,
);
assert.equal(
  decideEarlyAccessJoin({ phase: "early", memberCount: 30, cap: 30, alreadyMember: true, validCode: false }).reason,
  "already",
);
assert.equal(
  decideEarlyAccessJoin({ phase: "prelaunch", memberCount: 0, cap: 30, alreadyMember: false, validCode: true }).ok,
  false,
);
assert.equal(
  decideEarlyAccessJoin({ phase: "public", memberCount: 30, cap: 30, alreadyMember: false, validCode: false }).ok,
  true,
);
assert.equal(
  decideEarlyAccessJoin({ phase: "public", memberCount: 30, cap: 30, alreadyMember: false, validCode: false }).reason,
  "public",
);
assert.equal(
  decideEarlyAccessJoin({ phase: "early", memberCount: 10, cap: 30, alreadyMember: false, validCode: false }).reason,
  "invalid",
);

console.log("ok release-gate");
console.log(`EARLY_ACCESS_START ${EARLY_ACCESS_START_ISO}`);
console.log(`PUBLIC_RELEASE_AT ${PUBLIC_RELEASE_AT_ISO}`);
