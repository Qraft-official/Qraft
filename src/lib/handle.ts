export const HANDLE_PATTERN = /^[a-zA-Z0-9_.-]+$/;

/** Case-insensitive reserved account IDs that users cannot claim. */
export const RESERVED_HANDLES = ["advertisement"] as const;

export const RESERVED_HANDLE_ERROR = "このアカウントIDは予約されているため使用できません";

export const HANDLE_HINT =
  "半角英数字と - _ . のみ使えます（ひらがな・漢字は使えません）";

export function sanitizeHandleInput(raw: string) {
  return raw.replace(/^@+/, "").replace(/[^a-zA-Z0-9_.-]/g, "");
}

export function normalizeHandle(raw: string) {
  return sanitizeHandleInput(raw).toLowerCase();
}

export function isReservedHandle(value: string) {
  const n = normalizeHandle(value);
  return (RESERVED_HANDLES as readonly string[]).includes(n);
}

export function isAdvertisementHandle(value?: string | null) {
  return normalizeHandle(value ?? "") === "advertisement";
}

export function isValidHandle(value: string) {
  return HANDLE_PATTERN.test(value);
}
