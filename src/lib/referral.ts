export const PREMIUM_REFERRAL_HALF_JPY = 200;
export const REFERRAL_TRIAL_HOURS = 72;
export const WELCOME_MISSION_HOURS = 96;
export const WELCOME_SOLVES_TARGET = 3;
export const WELCOME_POSTS_TARGET = 3;
export const WELCOME_LOGIN_TARGET = 3;
export const REFERRAL_APPLY_HOURS = 168;

export type ReferralClaimView = {
  referrerId: string;
  appliedAt: string;
  missionDeadline: string;
  trialUntil: string;
  solves: number;
  posts: number;
  loginStreak: number;
  completedAt: string | null;
  expiredAt: string | null;
  discountAwardedAt: string | null;
};

export type ReferralMe = {
  code: string;
  trialUntil: string | null;
  pendingDiscount: boolean;
  claim: ReferralClaimView | null;
  accountCreatedAt: string | null;
};

export function canShowReferralApplyForm(me: ReferralMe | null, now = Date.now()) {
  if (!me || me.claim) return false;
  if (!me.accountCreatedAt) return false;
  const created = new Date(me.accountCreatedAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now - created < REFERRAL_APPLY_HOURS * 3600000;
}

export function formatMissionCountdown(deadlineIso: string, now = Date.now()) {
  const end = new Date(deadlineIso).getTime();
  const left = end - now;
  const deadlineLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(end));
  if (left <= 0) {
    return { expired: true, remainingLabel: "期限切れ", deadlineLabel };
  }
  const hoursTotal = Math.floor(left / 3600000);
  const days = Math.floor(hoursTotal / 24);
  const hours = hoursTotal % 24;
  const remainingLabel = days > 0 ? `残り${days}日${hours}時間` : `残り${hours}時間`;
  return { expired: false, remainingLabel, deadlineLabel };
}
