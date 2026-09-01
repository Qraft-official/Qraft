const DEVICE_KEY = "qraft.deviceId";
const PENDING_CODE_KEY = "qraft.pendingReferralCode";

export function getDeviceId() {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

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
