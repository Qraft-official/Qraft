export const HANDLE_PATTERN = /^[a-zA-Z0-9_.-]+$/;

export function sanitizeHandleInput(raw: string) {
  return raw.replace(/^@+/, "").replace(/[^a-zA-Z0-9_.-]/g, "");
}

export function isValidHandle(value: string) {
  return HANDLE_PATTERN.test(value);
}

export const HANDLE_HINT =
  "半角英数字と - _ . のみ使えます（ひらがな・漢字は使えません）";
