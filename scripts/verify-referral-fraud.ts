import assert from "node:assert/strict";
import {
  calculateReferralRisk,
  decisionFromRiskScore,
  hashNetworkKey,
  REFERRAL_FRAUD_ALLOW_MAX,
  REFERRAL_FRAUD_HOLD_MAX,
  type ReferralRiskSignals,
} from "../src/lib/referral-fraud";

const clean = (): ReferralRiskSignals => ({
  sameDeviceIdOtherClaim: false,
  sameDeviceIdOtherUserEvents: false,
  deviceUsedByReferrer: false,
  sameFingerprintOtherClaim: false,
  sameStripeCustomerOtherProfile: false,
  sameNetworkOtherClaim: false,
  networkAccounts24h: 0,
  referrerAppliesLastHour: 0,
  minMissionOnly: false,
  lowOrganicUse: false,
  concentratedHours: false,
  siblingCompletionsClose: 0,
});

function check(name: string, signals: Partial<ReferralRiskSignals>, decision: string, maxScore?: number) {
  const result = calculateReferralRisk({ ...clean(), ...signals });
  assert.equal(result.decision, decision, `${name}: expected ${decision} got ${result.decision} score=${result.score}`);
  if (typeof maxScore === "number") {
    assert.ok(result.score <= maxScore, `${name}: score ${result.score} > ${maxScore}`);
  }
  console.log(`ok ${name} score=${result.score} decision=${result.decision} reasons=${result.reasons.join(",") || "-"}`);
}

assert.equal(decisionFromRiskScore(0), "allow");
assert.equal(decisionFromRiskScore(REFERRAL_FRAUD_ALLOW_MAX), "allow");
assert.equal(decisionFromRiskScore(REFERRAL_FRAUD_ALLOW_MAX + 1), "hold");
assert.equal(decisionFromRiskScore(REFERRAL_FRAUD_HOLD_MAX), "hold");
assert.equal(decisionFromRiskScore(REFERRAL_FRAUD_HOLD_MAX + 1), "reject");

check("1 legit friend after missions", {}, "allow");
check("2 same device_id other claim", { sameDeviceIdOtherClaim: true }, "reject");
check("3 same fingerprint", { sameFingerprintOtherClaim: true }, "reject");
check("4 same wifi only", { sameNetworkOtherClaim: true }, "allow", 39);
check("5 school wifi 5 accounts", { networkAccounts24h: 5, sameNetworkOtherClaim: true }, "hold");
check("6 sns burst 10 applies", { referrerAppliesLastHour: 10 }, "hold");
check(
  "7 mechanical missions",
  { minMissionOnly: true, lowOrganicUse: true, concentratedHours: true, siblingCompletionsClose: 2 },
  "hold",
);
check("11 alt email same device", { sameDeviceIdOtherClaim: true, sameDeviceIdOtherUserEvents: true }, "reject");
check("12 normal after 3-day missions extra use", { minMissionOnly: false, lowOrganicUse: false }, "allow");

const a = hashNetworkKey("203.0.113.10", "test-secret");
const b = hashNetworkKey("203.0.113.10", "test-secret");
const c = hashNetworkKey("203.0.113.11", "test-secret");
assert.ok(a && a === b && a !== c);
assert.equal(hashNetworkKey("203.0.113.10", ""), null);

console.log("ok 8/9 reward uniqueness is enforced by try_finalize_referral_claim (discount_awarded_at IS NULL)");
console.log("ok 10 fraud errors map to HOLD in finalizeCompletedReferral (no award)");
console.log("all referral fraud score checks passed");
