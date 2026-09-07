"use client";

import { useSyncExternalStore } from "react";
import { getServerWebgl, isWebglAvailable, subscribeWebgl } from "@/lib/webgl";

/** True when the browser can run MapLibre. Optimistic during hydration. */
export function useWebglSupport(): boolean {
  return useSyncExternalStore(subscribeWebgl, isWebglAvailable, getServerWebgl);
}
