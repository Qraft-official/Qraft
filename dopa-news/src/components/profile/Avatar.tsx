"use client";

import { useState } from "react";

const PALETTE = ["#4ef5a3", "#35dcff", "#a98bff", "#ffc44d", "#ff5c7a"];

function accentFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  return PALETTE[hash % PALETTE.length];
}

export default function Avatar({
  url,
  name,
  size = 56,
}: {
  url: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const accent = accentFor(name || "dopa");
  const initial = (name || "?").trim().charAt(0);

  if (!url || failed) {
    return (
      <span
        aria-hidden="true"
        className="grid shrink-0 place-items-center rounded-full font-black"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(140deg, ${accent}33, ${accent}12)`,
          border: `1.5px solid ${accent}59`,
          color: accent,
          fontSize: size * 0.4,
        }}
      >
        {initial}
      </span>
    );
  }

  return (
    // The avatar host is user-controlled, so the optimiser is bypassed here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${name} のプロフィール画像`}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size, border: `1.5px solid ${accent}59` }}
    />
  );
}
