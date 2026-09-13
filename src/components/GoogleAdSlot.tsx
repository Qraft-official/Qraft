"use client";

import {
  ADSENSE_CLIENT_ID,
  ADSENSE_INFEED_FORMAT,
  ADSENSE_INFEED_LAYOUT_KEY,
  ADSENSE_INFEED_SLOT,
  adsenseScriptSrc,
  isGoogleInFeedPath,
} from "@/lib/adsense";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const pushedIns = new WeakSet<Element>();

function pushAd(ins: HTMLModElement) {
  if (pushedIns.has(ins)) return;
  if (ins.getAttribute("data-adsbygoogle-status")) return;
  if (ins.dataset.qraftAdInit === "1") return;
  ins.dataset.qraftAdInit = "1";
  pushedIns.add(ins);
  try {
    const w = window;
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.push({});
  } catch {
    /* ad blocker / AdSense error must not crash the feed */
  }
}

export function GoogleAdSlot({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const insRef = useRef<HTMLModElement>(null);
  const allowed =
    enabled &&
    isGoogleInFeedPath(pathname) &&
    Boolean(ADSENSE_CLIENT_ID) &&
    Boolean(ADSENSE_INFEED_SLOT);

  useEffect(() => {
    if (!allowed) return;
    const ins = insRef.current;
    if (!ins) return;
    const id = window.requestAnimationFrame(() => pushAd(ins));
    return () => window.cancelAnimationFrame(id);
  }, [allowed]);

  if (!allowed) return null;

  return (
    <aside className="ad-slot" aria-label="広告">
      <p className="ad-slot-label">広告</p>
      <Script
        id="adsense-sdk"
        src={adsenseScriptSrc(ADSENSE_CLIENT_ID)}
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onError={() => {
          /* blocked scripts must not break the timeline */
        }}
      />
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", maxWidth: "100%", overflow: "hidden" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={ADSENSE_INFEED_SLOT}
        data-ad-format={ADSENSE_INFEED_FORMAT}
        data-ad-layout-key={ADSENSE_INFEED_LAYOUT_KEY}
      />
    </aside>
  );
}
