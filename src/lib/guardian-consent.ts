import { GUARDIAN_CONSENT_AGE } from "./constants";

/** 15歳未満（1〜14歳）のみ保護者同意が必須。0歳・未設定は保存を止めない。 */
export function needsGuardianConsent(age: number | null | undefined) {
  if (typeof age !== "number" || !Number.isFinite(age)) return false;
  return age > 0 && age < GUARDIAN_CONSENT_AGE;
}

export function ageForSave(age: number | null | undefined) {
  if (typeof age === "number" && Number.isFinite(age)) {
    return Math.max(0, Math.min(130, Math.floor(age)));
  }
  return 0;
}
