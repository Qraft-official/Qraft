"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  label,
  accent = "purple",
  average,
  count,
}: {
  value: number;
  onChange?: (n: number) => void;
  label?: string;
  accent?: "purple" | "lime";
  average?: number;
  count?: number;
}) {
  const fill = accent === "lime" ? "#CCFF00" : "#A855F7";
  const ratingCount = count ?? 0;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <p className="text-[11px] font-medium tracking-wide text-muted">{label}</p>
      )}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            whileTap={{ scale: 1.25 }}
            onClick={() => onChange?.(n === value ? 0 : n)}
            className="p-0.5"
            aria-label={`${n} stars`}
          >
            <Star
              size={18}
              fill={n <= value ? fill : "transparent"}
              color={n <= value ? fill : "#4b5563"}
              className="transition-colors"
            />
          </motion.button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
        <span>あなた: {value > 0 ? value : "未評価"}</span>
        <span>
          平均 {ratingCount > 0 && typeof average === "number" ? average.toFixed(1) : "—"}
          {ratingCount > 0 ? `（${ratingCount}）` : ""}
        </span>
      </div>
    </div>
  );
}
