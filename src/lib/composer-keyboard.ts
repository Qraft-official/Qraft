export const HIDE_COMPOSER_KEYBOARD = "qraft-hide-composer-keyboard";
export const COMPOSER_KB_DOCK_ID = "qraft-composer-kb-dock";

export function dismissComposerKeyboard() {
  const el = document.activeElement;
  if (el instanceof HTMLElement) el.blur();
  window.mathVirtualKeyboard?.hide();
  window.dispatchEvent(new Event(HIDE_COMPOSER_KEYBOARD));
  requestAnimationFrame(() => {
    const again = document.activeElement;
    if (again instanceof HTMLElement && (again.tagName === "TEXTAREA" || again.tagName === "INPUT" || again.tagName === "MATH-FIELD")) {
      again.blur();
    }
    window.mathVirtualKeyboard?.hide();
  });
}
