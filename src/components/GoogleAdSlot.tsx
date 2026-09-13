"use client";

import { ADSENSE_CLIENT_ID, adsenseScriptSrc } from "@/lib/adsense";
import { isAdsenseContentPath } from "@/lib/public-routes";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function ensureAdsenseScript() {
  if (!ADSENSE_CLIENT_ID) return;
  if (document.getElementById("adsense-sdk")) return;
  const script = document.createElement("script");
  script.id = "adsense-sdk";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = adsenseScriptSrc(ADSENSE_CLIENT_ID);
  document.head.appendChild(script);
}

export function GoogleAdSlot({
  enabled,
  label = "広告",
}: {
  enabled: boolean;
  label?: string;
}) {
  const pathname = usePathname();
  const pushed = useRef(false);
  const eligible = enabled && isAdsenseContentPath(pathname) && !!ADSENSE_CLIENT_ID;

  useEffect(() => {
    if (!eligible) return;
    ensureAdsenseScript();
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore */
    }
  }, [eligible]);

  if (!eligible) return null;

  return (
    <aside className="ad-slot" aria-label={label}>
      <p className="ad-slot-label">{label}</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
