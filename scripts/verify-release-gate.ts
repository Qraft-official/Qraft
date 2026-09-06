import assert from "node:assert/strict";
import fs from "node:fs";
import {
  EARLY_ACCESS_START_ISO,
  PUBLIC_RELEASE_AT_ISO,
  clampReleaseSchedule,
  defaultReleaseSchedule,
} from "../src/lib/release-config";
import {
  canAccessApp,
  decideEarlyAccessJoin,
  publicSignupAllowed,
  releasePhaseAt,
} from "../src/lib/release-gate";
import { isAuthEntryPath, isPublicApiPath, isPublicReleasePath } from "../src/lib/auth-entry";

const schedule = defaultReleaseSchedule();
assert.equal(schedule.earlyAccessStart, EARLY_ACCESS_START_ISO);
assert.equal(schedule.publicReleaseAt, PUBLIC_RELEASE_AT_ISO);
assert.equal(schedule.earlyAccessCap, 30);
assert.equal(Date.parse(PUBLIC_RELEASE_AT_ISO), Date.parse("2026-09-18T15:00:00.000Z"));
assert.equal(Date.parse(EARLY_ACCESS_START_ISO), Date.parse("2026-09-11T15:00:00.000Z"));

const t = (iso: string) => Date.parse(iso);

assert.equal(releasePhaseAt(t("2026-09-06T12:00:00+09:00"), schedule), "prelaunch");
assert.equal(releasePhaseAt(t("2026-09-11T23:59:59+09:00"), schedule), "prelaunch");
assert.equal(releasePhaseAt(t("2026-09-12T00:00:00+09:00"), schedule), "early");
assert.equal(releasePhaseAt(t("2026-09-18T23:59:59+09:00"), schedule), "early");
assert.equal(releasePhaseAt(t("2026-09-19T00:00:00+09:00"), schedule), "public");

assert.equal(canAccessApp({ phase: "prelaunch", isAdmin: true, isMember: false }), true);
assert.equal(canAccessApp({ phase: "prelaunch", isAdmin: false, isMember: false }), false);
assert.equal(canAccessApp({ phase: "prelaunch", isAdmin: false, isMember: true }), false);
assert.equal(canAccessApp({ phase: "early", isAdmin: true, isMember: false }), true);
assert.equal(canAccessApp({ phase: "early", isAdmin: false, isMember: true }), true);
assert.equal(canAccessApp({ phase: "early", isAdmin: false, isMember: false }), false);
assert.equal(canAccessApp({ phase: "public", isAdmin: false, isMember: false }), true);

assert.equal(publicSignupAllowed("prelaunch"), false);
assert.equal(publicSignupAllowed("early"), false);
assert.equal(publicSignupAllowed("public"), true);

assert.equal(
  decideEarlyAccessJoin({
    phase: "early",
    memberCount: 29,
    cap: 30,
    alreadyMember: false,
    validCode: true,
  }).ok,
  true,
);
assert.equal(
  decideEarlyAccessJoin({
    phase: "early",
    memberCount: 30,
    cap: 30,
    alreadyMember: false,
    validCode: true,
  }).reason,
  "full",
);
assert.equal(
  decideEarlyAccessJoin({
    phase: "early",
    memberCount: 30,
    cap: 30,
    alreadyMember: false,
    validCode: false,
    isTrustedDeveloper: true,
  }).reason,
  "developer",
);

const clamped = clampReleaseSchedule({
  earlyAccessStart: "2026-01-01T00:00:00+09:00",
  publicReleaseAt: "2026-01-02T00:00:00+09:00",
  earlyAccessCap: 30,
});
assert.equal(Date.parse(clamped.earlyAccessStart) >= Date.parse(EARLY_ACCESS_START_ISO), true);
assert.equal(Date.parse(clamped.publicReleaseAt) >= Date.parse(PUBLIC_RELEASE_AT_ISO), true);

assert.equal(isAuthEntryPath("/auth"), true);
assert.equal(isAuthEntryPath("/login"), true);
assert.equal(isAuthEntryPath("/signup"), true);
assert.equal(isAuthEntryPath("/"), false);
assert.equal(isPublicReleasePath("/early-access"), true);
assert.equal(isPublicReleasePath("/discover"), false);
assert.equal(isPublicApiPath("/api/access"), true);
assert.equal(isPublicApiPath("/api/challenge/grade"), false);

const proxy = fs.readFileSync("src/proxy.ts", "utf8");
assert.equal(proxy.includes("hasValidAccessCookie"), true);
assert.equal(proxy.includes("NextResponse.next()") && proxy.includes("/early-access"), true);
assert.equal(proxy.includes("NEXT_PUBLIC_ADMIN_EMAILS"), false);

const shell = fs.readFileSync("src/components/AppShell.tsx", "utf8");
assert.equal(shell.includes("EarlyAccessGate"), true);
assert.equal(shell.includes("access.canAccess"), true);

const client = fs.readFileSync("src/lib/release-client.ts", "utf8");
assert.equal(client.includes("canAccess: false"), true);

console.log("ok release-gate");
console.log(`EARLY_ACCESS_START ${EARLY_ACCESS_START_ISO}`);
console.log(`PUBLIC_RELEASE_AT ${PUBLIC_RELEASE_AT_ISO}`);
