export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 30;

export const DISPLAY_NAME_HINT = `ユーザーネームは${DISPLAY_NAME_MIN}文字以上${DISPLAY_NAME_MAX}文字以内で入力してください`;

export function displayNameError(raw: string): string | null {
  const name = raw.trim();
  if (!name) return "ユーザーネームを入力してください";
  if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) {
    return DISPLAY_NAME_HINT;
  }
  return null;
}
