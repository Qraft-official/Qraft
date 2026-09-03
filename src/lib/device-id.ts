const DEVICE_KEY = "qraft.deviceId";
const PENDING_CODE_KEY = "qraft.pendingReferralCode";
const REFERRAL_APPLIED_KEY = "qraft.referralApplied";
export const REFERRAL_APPLIED_COOKIE = "qraft_referral_applied";
export const DEVICE_ID_COOKIE = "qraft_did";
const DEVICE_APPLIED_MSG = "この端末では既に紹介コードが適用されています";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;

export type DeviceIdentity = {
  deviceId: string;
  deviceFingerprint: string;
};

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const row = part.trim();
    if (row.startsWith(prefix)) return decodeURIComponent(row.slice(prefix.length));
  }
  return "";
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function storageGet(key: string) {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function storageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }
}

/** Expo / Capacitor / React Native が注入する端末IDがあれば優先する。 */
function nativeDeviceId() {
  if (typeof globalThis === "undefined") return "";
  const g = globalThis as typeof globalThis & {
    expo?: { modules?: { ExpoApplication?: { getIosIdForVendorAsync?: () => string } } };
    ExpoDevice?: { osInternalBuildId?: string; deviceName?: string };
    Capacitor?: { isNativePlatform?: () => boolean };
  };
  const expoBuild = typeof g.ExpoDevice?.osInternalBuildId === "string" ? g.ExpoDevice.osInternalBuildId : "";
  if (expoBuild.trim().length >= 8) return expoBuild.trim().slice(0, 128);
  return "";
}

function persistDeviceId(id: string) {
  storageSet(DEVICE_KEY, id);
  try {
    writeCookie(DEVICE_ID_COOKIE, id);
  } catch {
    /* ignore */
  }
}

function fnv1aHex(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function canvasFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 240, 60);
    ctx.fillStyle = "#069";
    ctx.font = "16px 'Segoe UI', Roboto, Arial";
    ctx.fillText("Qraft/device#fp", 8, 28);
    ctx.strokeStyle = "#ff0";
    ctx.beginPath();
    ctx.arc(48, 32, 18, 0, Math.PI);
    ctx.stroke();
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

function webglFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : "";
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
    return `${vendor}~${renderer}~${gl.getParameter(gl.VERSION)}`;
  } catch {
    return "";
  }
}

function collectFingerprintSignals() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "";
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { platform?: string } };
  const screenObj = window.screen;
  return [
    nav.userAgent,
    nav.language,
    (nav.languages || []).join(","),
    nav.platform,
    nav.userAgentData?.platform ?? "",
    String(nav.hardwareConcurrency ?? ""),
    String(nav.deviceMemory ?? ""),
    String(nav.maxTouchPoints ?? ""),
    `${screenObj?.width}x${screenObj?.height}x${screenObj?.colorDepth}x${window.devicePixelRatio}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    String(new Date().getTimezoneOffset()),
    canvasFingerprint(),
    webglFingerprint(),
  ].join("|");
}

export function getDeviceFingerprint() {
  if (typeof window === "undefined") return "";
  const signals = collectFingerprintSignals();
  return fnv1aHex(signals) + fnv1aHex([...signals].reverse().join(""));
}

export function getDeviceId() {
  if (typeof window === "undefined") return "";
  const native = nativeDeviceId();
  if (native) {
    persistDeviceId(native);
    return native;
  }
  try {
    let id = storageGet(DEVICE_KEY) || readCookie(DEVICE_ID_COOKIE);
    if (!id) {
      id = crypto.randomUUID();
    }
    persistDeviceId(id);
    return id;
  } catch {
    return "";
  }
}

export function getDeviceIdentity(): DeviceIdentity {
  return {
    deviceId: getDeviceId(),
    deviceFingerprint: getDeviceFingerprint(),
  };
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
    return readCookie(REFERRAL_APPLIED_COOKIE) === "1";
  } catch {
    return false;
  }
}

export function markReferralAppliedOnDevice() {
  if (typeof window === "undefined") return;
  storageSet(REFERRAL_APPLIED_KEY, "1");
  try {
    writeCookie(REFERRAL_APPLIED_COOKIE, "1");
  } catch {
    /* ignore */
  }
  getDeviceId();
}

export { DEVICE_APPLIED_MSG };

export function savePendingReferralCode(code: string) {
  if (typeof window === "undefined") return;
  const next = code.trim().toUpperCase();
  if (!next) return;
  storageSet(PENDING_CODE_KEY, next);
}

export function takePendingReferralCode() {
  if (typeof window === "undefined") return "";
  try {
    const v = localStorage.getItem(PENDING_CODE_KEY) ?? sessionStorage.getItem(PENDING_CODE_KEY) ?? "";
    try {
      localStorage.removeItem(PENDING_CODE_KEY);
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(PENDING_CODE_KEY);
    } catch {
      /* ignore */
    }
    return v.trim().toUpperCase();
  } catch {
    return "";
  }
}
