"use client";

import { HomeFeed } from "@/components/HomeFeed";
import { PublicLanding } from "@/components/PublicLanding";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import { useApp } from "@/lib/store";

export function HomeGate({ problems }: { problems: PublicProblemPreview[] }) {
  const { authenticated } = useApp();
  if (!authenticated) return <PublicLanding problems={problems} />;
  return <HomeFeed />;
}
