"use client";

import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({
  show,
  className = "",
}: {
  show: boolean;
  className?: string;
}) {
  if (!show) return null;
  return (
    <BadgeCheck
      size={16}
      className={`inline shrink-0 text-amber-400 ${className}`}
      fill="#FBBF24"
      stroke="#0a0a0a"
      aria-label="認証済み"
    />
  );
}
