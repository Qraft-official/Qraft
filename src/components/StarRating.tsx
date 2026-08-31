"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  label,
  accent = "purple",
}: {
  value: number;
  onChange?: (n: number) => void;
  label?: string;
  accent?: "purple" | "lime";
}) {
  const fill = accent === "lime" ? "#CCFF00" : "#A855F7";
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
            onClick={() => onChange?.(n)}
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
        {value > 0 && (
          <span className="ml-1 text-xs text-muted">{value.toFixed(1)}</span>
        )}
      </div>
    </div>
  );
}
