"use client";

import { ProblemThread } from "@/components/ProblemThread";
import { useApp } from "@/lib/store";
import type { ReactNode } from "react";

export function ProblemGate({ children }: { children: ReactNode }) {
  const { authenticated, ready } = useApp();
  if (authenticated && ready) return <ProblemThread />;
  return children;
}
