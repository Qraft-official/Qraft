export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const HANDLE_PATTERN = /^[a-zA-Z0-9_]+$/;

/** Case-insensitive reserved account IDs that users cannot claim. */
export const RESERVED_HANDLES = ["advertisement"] as const;

export const RESERVED_HANDLE_ERROR = "このユーザーIDは予約されているため使用できません";

export const HANDLE_HINT =
  `${HANDLE_MIN}文字以上${HANDLE_MAX}文字以内（半角英数字とアンダースコアのみ）`;

export function sanitizeHandleInput(raw: string) {
  return raw.replace(/^@+/, "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, HANDLE_MAX);
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
  return HANDLE_PATTERN.test(value) && value.length >= HANDLE_MIN && value.length <= HANDLE_MAX;
}

export function handleValidationError(raw: string): string | null {
  const value = sanitizeHandleInput(raw);
  if (!value) return "ユーザーIDを入力してください";
  if (value.length < HANDLE_MIN || value.length > HANDLE_MAX) {
    return `ユーザーIDは${HANDLE_MIN}文字以上${HANDLE_MAX}文字以内で入力してください`;
  }
  if (!HANDLE_PATTERN.test(value)) return HANDLE_HINT;
  if (isReservedHandle(value)) return RESERVED_HANDLE_ERROR;
  return null;
}
