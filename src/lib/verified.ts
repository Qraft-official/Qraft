import { OFFICIAL_HANDLE, OFFICIAL_USER_ID } from "./constants";
import { isAdvertisementHandle } from "./handle";
import { isComplimentaryPremiumAccount, isVerifiedCreator } from "./premium";

export type VerifiableUser = {
  id?: string | null;
  handle?: string | null;
  name?: string | null;
  email?: string | null;
  verified?: boolean;
  isVerified?: boolean;
};

export function isOfficialAccount(user?: VerifiableUser | null): boolean {
  if (!user) return false;
  if (user.id === OFFICIAL_USER_ID) return true;
  const handle = (user.handle ?? "").trim().toLowerCase().replace(/^@+/, "");
  return handle === OFFICIAL_HANDLE;
}

/** Shared verified-badge rule for posts, profiles, and in-feed ads. */
export function userIsVerified(user?: VerifiableUser | null): boolean {
  if (!user) return false;
  if (user.isVerified === true || user.verified === true) return true;
  if (isAdvertisementHandle(user.handle)) return true;
  if (user.id && isVerifiedCreator(user.id)) return true;
  if (isComplimentaryPremiumAccount(user)) return true;
  return false;
}

export function verifiedBadgeTone(user?: VerifiableUser | null): "gold" | "silver" {
  return isOfficialAccount(user) ? "gold" : "silver";
}
