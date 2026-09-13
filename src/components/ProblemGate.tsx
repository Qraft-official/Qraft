"use client";

import { ProblemThread } from "@/components/ProblemThread";
import { PublicProblemView } from "@/components/PublicProblemView";
import type { PublicProblemPreview } from "@/lib/public-catalog";
import { useApp } from "@/lib/store";

export function ProblemGate({ preview }: { preview: PublicProblemPreview | null }) {
  const { authenticated } = useApp();
  if (!authenticated) return <PublicProblemView preview={preview} />;
  return <ProblemThread />;
}
