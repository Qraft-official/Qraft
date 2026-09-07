"use client";

import Image from "next/image";
import { useState } from "react";
import { categoryAccent } from "@/lib/categories";

interface NewsThumbProps {
  src: string | null;
  alt: string;
  category: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Article thumbnail with a deterministic gradient fallback, so a missing or
 * unreachable image never leaves a blank hole in the feed.
 */
export default function NewsThumb({
  src,
  alt,
  category,
  className = "",
  sizes = "(max-width: 480px) 100vw, 480px",
  priority = false,
}: NewsThumbProps) {
  const [failed, setFailed] = useState(false);
  const accent = categoryAccent(category);

  if (!src || failed) {
    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{
          background: `radial-gradient(120% 120% at 15% 0%, ${accent}2e 0%, #111722 55%, #0c111b 100%)`,
        }}
        aria-label={alt}
        role="img"
      >
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, rgba(255,255,255,0.35) 0 1px, transparent 1px 14px)",
          }}
        />
        <span
          className="absolute bottom-3 left-3 text-[13px] font-bold tracking-wide"
          style={{ color: accent }}
        >
          {category}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-ink-700 ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </div>
  );
}
