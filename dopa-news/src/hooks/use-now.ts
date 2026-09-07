"use client";

import { useSyncExternalStore } from "react";
import { getNow, getServerNow, subscribeNow } from "@/lib/now-store";

/** Returns the shared clock, or `null` on the server and during hydration. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribeNow, getNow, getServerNow);
}
