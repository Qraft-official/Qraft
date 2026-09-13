"use client";

import { DiscoverFeed } from "@/components/DiscoverFeed";
import { PublicDiscover } from "@/components/PublicDiscover";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import { useApp } from "@/lib/store";

export function DiscoverGate({ problems }: { problems: PublicProblemPreview[] }) {
  const { authenticated } = useApp();
  if (!authenticated) return <PublicDiscover problems={problems} />;
  return <DiscoverFeed />;
}
