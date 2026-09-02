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

/** Shared verified-badge rule for posts, profiles, and in-feed ads. */
export function userIsVerified(user?: VerifiableUser | null): boolean {
  if (!user) return false;
  if (user.isVerified === true || user.verified === true) return true;
  if (isAdvertisementHandle(user.handle)) return true;
  if (user.id && isVerifiedCreator(user.id)) return true;
  if (isComplimentaryPremiumAccount(user)) return true;
  return false;
}
