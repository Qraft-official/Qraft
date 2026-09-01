export const PREMIUM_REFERRAL_HALF_JPY = 200;
export const REFERRAL_TRIAL_HOURS = 72;
export const WELCOME_MISSION_HOURS = 96;
export const WELCOME_SOLVES_TARGET = 3;
export const WELCOME_POSTS_TARGET = 3;
export const WELCOME_LOGIN_TARGET = 3;

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
};

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
