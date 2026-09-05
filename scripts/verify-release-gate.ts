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
assert.equal(Date.parse(PUBLIC_RELEASE_AT_ISO), Date.parse("2026-09-18T15:00:00.000Z"));
assert.equal(Date.parse(EARLY_ACCESS_START_ISO), Date.parse("2026-09-11T15:00:00.000Z"));

const t = (iso: string) => Date.parse(iso);

assert.equal(releasePhaseAt(t("2026-09-11T23:59:59+09:00"), schedule), "prelaunch");
assert.equal(releasePhaseAt(t("2026-09-12T00:00:00+09:00"), schedule), "early");
assert.equal(releasePhaseAt(t("2026-09-18T23:59:59+09:00"), schedule), "early");
assert.equal(releasePhaseAt(t("2026-09-19T00:00:00+09:00"), schedule), "public");
assert.equal(releasePhaseAt(t("2026-09-19T00:00:00+00:00"), schedule), "public");

assert.equal(canAccessApp({ phase: "prelaunch", isAdmin: true, isMember: false }), true, "developer + 9/11");
assert.equal(canAccessApp({ phase: "prelaunch", isAdmin: false, isMember: false }), false, "general + 9/11");
assert.equal(canAccessApp({ phase: "prelaunch", isAdmin: false, isMember: true }), false, "member before start still blocked");
assert.equal(canAccessApp({ phase: "early", isAdmin: true, isMember: false }), true, "developer + 9/12 no seat");
assert.equal(canAccessApp({ phase: "early", isAdmin: false, isMember: true }), true, "EA member + 9/12");
assert.equal(canAccessApp({ phase: "early", isAdmin: false, isMember: false }), false, "non-member + 9/12");
assert.equal(canAccessApp({ phase: "early", isAdmin: true, isMember: false }), true, "full + developer");
assert.equal(canAccessApp({ phase: "public", isAdmin: false, isMember: false }), true, "new general after public");
assert.equal(canAccessApp({ phase: "public", isAdmin: false, isMember: true }), true, "existing EA after public");
assert.equal(canAccessApp({ phase: "public", isAdmin: true, isMember: false }), true, "developer after public");

assert.equal(publicSignupAllowed("prelaunch"), false);
assert.equal(publicSignupAllowed("early"), false);
assert.equal(publicSignupAllowed("public"), true);

const seat29 = decideEarlyAccessJoin({
  phase: "early",
  memberCount: 29,
  cap: 30,
  alreadyMember: false,
  validCode: true,
});
assert.equal(seat29.ok, true);
assert.equal(seat29.reason, "enrolled");

const seat30 = decideEarlyAccessJoin({
  phase: "early",
  memberCount: 30,
  cap: 30,
  alreadyMember: false,
  validCode: true,
});
assert.equal(seat30.ok, false);
assert.equal(seat30.reason, "full");

const developerJoin = decideEarlyAccessJoin({
  phase: "early",
  memberCount: 30,
  cap: 30,
  alreadyMember: false,
  validCode: false,
  isTrustedDeveloper: true,
});
assert.equal(developerJoin.ok, true);
assert.equal(developerJoin.reason, "developer");

const sampleJoin = decideEarlyAccessJoin({
  phase: "early",
  memberCount: 10,
  cap: 30,
  alreadyMember: false,
  validCode: true,
  isSample: true,
});
assert.equal(sampleJoin.ok, false);

assert.equal(
  decideEarlyAccessJoin({
    phase: "early",
    memberCount: 30,
    cap: 30,
    alreadyMember: true,
    validCode: false,
  }).ok,
  true,
);

assert.equal(releasePhaseAt(t("2026-09-18T23:59:59+09:00"), schedule) === "early", true);
assert.equal(releasePhaseAt(t("2026-09-19T00:00:00+09:00"), schedule) === "public", true);

console.log("ok release-gate");
console.log(`EARLY_ACCESS_START ${EARLY_ACCESS_START_ISO}`);
console.log(`PUBLIC_RELEASE_AT ${PUBLIC_RELEASE_AT_ISO}`);
