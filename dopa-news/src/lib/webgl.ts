/**
 * MapLibre needs a WebGL context. Some older phones, locked-down browsers and
 * virtualised environments do not provide one, and constructing a map there
 * leaves an unexplained black rectangle. Detecting it up front lets the Dopa
 * Map fall back to a readable list of the same posts.
 */

let cached: boolean | null = null;

export function isWebglAvailable(): boolean {
  if (cached !== null) return cached;
  if (typeof document === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    cached = gl !== null;
  } catch {
    cached = false;
  }
  return cached;
}

/** `useSyncExternalStore` never resubscribes: support cannot change at runtime. */
export function subscribeWebgl(): () => void {
  return () => {};
}

export function getServerWebgl(): boolean {
  return true;
}
