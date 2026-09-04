"use client";

import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({
  show,
  className = "",
  tone = "silver",
}: {
  show: boolean;
  className?: string;
  tone?: "gold" | "silver" | "blue";
}) {
  if (!show) return null;
  const fill = tone === "gold" ? "#F5C542" : tone === "blue" ? "#38BDF8" : "#C0C7D1";
  const color =
    tone === "gold" ? "text-amber-400" : tone === "blue" ? "text-sky-400" : "text-slate-300";
  return (
    <BadgeCheck
      size={16}
      className={`inline shrink-0 ${color} ${className}`}
      fill={fill}
      stroke="#0a0a0a"
      aria-label="認証済み"
    />
  );
}
