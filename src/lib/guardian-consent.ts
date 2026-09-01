import { GUARDIAN_CONSENT_AGE } from "./constants";

/** 15歳未満のみ保護者同意を表示・必須。未設定は出さない。 */
export function needsGuardianConsent(age: number | null | undefined) {
  if (typeof age !== "number" || !Number.isFinite(age)) return false;
  return age < GUARDIAN_CONSENT_AGE;
}

export function ageForSave(age: number | null | undefined) {
  if (typeof age === "number" && Number.isFinite(age)) {
    return Math.max(0, Math.min(130, Math.floor(age)));
  }
  return 0;
}
