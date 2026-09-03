const DEVICE_KEY = "qraft.deviceId";
const PENDING_CODE_KEY = "qraft.pendingReferralCode";
const REFERRAL_APPLIED_KEY = "qraft.referralApplied";
export const REFERRAL_APPLIED_COOKIE = "qraft_referral_applied";
const DEVICE_APPLIED_MSG = "この端末では既に紹介コードが適用されています";

export function getDeviceId() {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_KEY) || sessionStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      try {
        localStorage.setItem(DEVICE_KEY, id);
      } catch {
        sessionStorage.setItem(DEVICE_KEY, id);
      }
    }
    return id;
  } catch {
    return "";
  }
}

export function hasReferralAppliedOnDevice() {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(REFERRAL_APPLIED_KEY) === "1") return true;
    if (sessionStorage.getItem(REFERRAL_APPLIED_KEY) === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    return document.cookie.split(";").some((c) => c.trim().startsWith(`${REFERRAL_APPLIED_COOKIE}=1`));
  } catch {
    return false;
  }
}

export function markReferralAppliedOnDevice() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REFERRAL_APPLIED_KEY, "1");
  } catch {
    try {
      sessionStorage.setItem(REFERRAL_APPLIED_KEY, "1");
    } catch {
      /* ignore */
    }
  }
  try {
    const maxAge = 60 * 60 * 24 * 365 * 5;
    document.cookie = `${REFERRAL_APPLIED_COOKIE}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

export { DEVICE_APPLIED_MSG };

export function savePendingReferralCode(code: string) {
  if (typeof window === "undefined") return;
  const next = code.trim().toUpperCase();
  if (!next) return;
  try {
    localStorage.setItem(PENDING_CODE_KEY, next);
  } catch {
    /* ignore */
  }
}

export function takePendingReferralCode() {
  if (typeof window === "undefined") return "";
  try {
    const v = localStorage.getItem(PENDING_CODE_KEY) ?? "";
    localStorage.removeItem(PENDING_CODE_KEY);
    return v.trim().toUpperCase();
  } catch {
    return "";
  }
}
