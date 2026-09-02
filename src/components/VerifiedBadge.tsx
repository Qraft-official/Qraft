"use client";

import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({
  show,
  className = "",
  tone = "gold",
}: {
  show: boolean;
  className?: string;
  tone?: "gold" | "blue";
}) {
  if (!show) return null;
  const gold = tone === "gold";
  return (
    <BadgeCheck
      size={16}
      className={`inline shrink-0 ${gold ? "text-amber-400" : "text-sky-400"} ${className}`}
      fill={gold ? "#FBBF24" : "#38BDF8"}
      stroke="#0a0a0a"
      aria-label="認証済み"
    />
  );
}
