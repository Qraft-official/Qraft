"use client";

import { adForSlot } from "@/lib/ads";
import { AdPost } from "./AdPost";

/** @deprecated Use AdPost. Kept so existing imports keep working. */
export function TimelineAd({ slot = 0 }: { slot?: number }) {
  const ad = adForSlot(slot);
  if (!ad) return null;
  return <AdPost ad={ad} />;
}
