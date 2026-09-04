/** Delay before a held key starts repeating (after the initial tap delete). */
export const HOLD_REPEAT_START_MS = 400;

/** Next interval from how long the pointer has been down. */
export function holdRepeatDelay(heldMs: number) {
  if (heldMs < 1000) return 118;
  if (heldMs < 2000) return 70;
  return 42;
}
