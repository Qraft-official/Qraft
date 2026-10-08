"use client";

import { ProblemThread } from "@/components/ProblemThread";
import { useApp } from "@/lib/store";
import type { ReactNode } from "react";

export function ProblemGate({ children, forcePublic = false }: { children: ReactNode; forcePublic?: boolean }) {
  const { authenticated, ready } = useApp();
  if (!forcePublic && authenticated && ready) return <ProblemThread />;
  return children;
}
