"use client";

import { HomeFeed } from "@/components/HomeFeed";
import { useApp } from "@/lib/store";
import type { ReactNode } from "react";

export function HomeGate({ children }: { children: ReactNode }) {
  const { authenticated, ready } = useApp();
  if (authenticated && ready) return <HomeFeed />;
  return children;
}
