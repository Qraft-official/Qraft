import assert from "node:assert/strict";
import fs from "node:fs";
import {
  EARLY_ACCESS_START_ISO,
  PUBLIC_RELEASE_AT_ISO,
  defaultReleaseSchedule,
} from "../src/lib/release-config";
import {
  canAccessApp,
  decideEarlyAccessJoin,
  isPublicReleasePath,
  publicSignupAllowed,
  releasePhaseAt,
} from "../src/lib/release-gate";
import { AUTH_ENTRY_PATH, isAuthEntryPath } from "../src/lib/auth-entry";

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

assert.equal(canAccessApp({ phase: "prelaunch", isDeveloper: true, isMember: false }), true);
assert.equal(canAccessApp({ phase: "prelaunch", isDeveloper: false, isMember: false }), false);
assert.equal(canAccessApp({ phase: "prelaunch", isDeveloper: false, isMember: true }), false);
assert.equal(canAccessApp({ phase: "early", isDeveloper: true, isMember: false }), true);
assert.equal(canAccessApp({ phase: "early", isDeveloper: false, isMember: true }), true);
assert.equal(canAccessApp({ phase: "early", isDeveloper: false, isMember: false }), false);
assert.equal(canAccessApp({ phase: "public", isDeveloper: false, isMember: false }), true);
assert.equal(
  canAccessApp({ phase: "prelaunch", isDeveloper: false, isMember: false }),
  false,
  "authenticated-only must not allow before launch",
);

assert.equal(publicSignupAllowed("prelaunch"), false);
assert.equal(publicSignupAllowed("early"), false);
assert.equal(publicSignupAllowed("public"), true);

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

const full = decideEarlyAccessJoin({
  phase: "early",
  memberCount: 30,
  cap: 30,
  alreadyMember: false,
  validCode: true,
});
assert.equal(full.ok, false);
assert.equal(full.reason, "full");

assert.equal(isPublicReleasePath("/auth"), true);
assert.equal(isPublicReleasePath("/early-access"), true);
assert.equal(isPublicReleasePath("/discover"), false);
assert.equal(isPublicReleasePath("/profile"), false);
assert.equal(AUTH_ENTRY_PATH, "/auth");
assert.equal(isAuthEntryPath("/auth"), true);
assert.equal(isAuthEntryPath("/auth/callback"), false);

const appShell = fs.readFileSync("src/components/AppShell.tsx", "utf8");
assert.equal(appShell.includes("sessionLoading"), true);
assert.equal(appShell.includes('router.replace("/login")'), false);
assert.equal(appShell.includes("!accessReady"), true);
assert.equal(appShell.includes("NEXT_PUBLIC_ADMIN_EMAILS"), false);

const store = fs.readFileSync("src/lib/store.tsx", "utf8");
assert.equal(store.includes("NEXT_PUBLIC_ADMIN_EMAILS"), false);
assert.equal(store.includes("isDeveloperAccount"), false);
assert.equal(store.includes("window.setTimeout(() => {\n          setProfileHydrated(false)"), false);
assert.equal(store.includes("persistSessionCookies"), true);

const accessServer = fs.readFileSync("src/lib/release-server.ts", "utf8");
assert.equal(accessServer.includes("user_is_trusted_developer"), true);
assert.equal(accessServer.includes("NEXT_PUBLIC_ADMIN_EMAILS"), false);
assert.equal(accessServer.includes("isTrustedDeveloperEmail"), false);

const premiumStatus = fs.readFileSync("src/app/api/premium-status/route.ts", "utf8");
assert.equal(premiumStatus.includes("NEXT_PUBLIC_ADMIN_EMAILS"), false);

const logo = fs.readFileSync("src/components/LogoWithSecretAuthHotspot.tsx", "utf8");
assert.equal(logo.includes("AUTH_ENTRY_PATH"), true);
assert.equal(logo.includes("admin=true"), false);
assert.equal(logo.includes("developer=true"), false);

const middleware = fs.readFileSync("src/middleware.ts", "utf8");
assert.equal(middleware.includes("can_use_app"), true);
assert.equal(middleware.includes("/early-access"), true);

console.log("ok release-gate");
console.log(`EARLY_ACCESS_START ${EARLY_ACCESS_START_ISO}`);
console.log(`PUBLIC_RELEASE_AT ${PUBLIC_RELEASE_AT_ISO}`);
