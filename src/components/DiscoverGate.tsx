"use client";

import { DiscoverFeed } from "@/components/DiscoverFeed";
import { useApp } from "@/lib/store";
import type { ReactNode } from "react";

export function DiscoverGate({ children }: { children: ReactNode }) {
  const { authenticated, ready } = useApp();
  if (authenticated && ready) return <DiscoverFeed />;
  return children;
}
