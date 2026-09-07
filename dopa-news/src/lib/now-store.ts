/**
 * A single shared clock for every relative timestamp in the app.
 *
 * Reading `Date.now()` during render makes prerendered markup disagree with
 * the hydrating client, so components read the clock through
 * `useSyncExternalStore` instead: hydration uses the `null` server snapshot
 * (rendered as an absolute JST time) and swaps to live relative time once
 * hydration finishes. Sharing one interval also keeps every timestamp on the
 * page ticking in step without a timer per card.
 */

const TICK_MS = 30_000;

let current = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

export function subscribeNow(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      for (const notify of listeners) notify();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function getNow(): number {
  return current;
}

export function getServerNow(): null {
  return null;
}
