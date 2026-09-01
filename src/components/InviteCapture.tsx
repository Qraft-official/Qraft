"use client";

import { getDeviceId, savePendingReferralCode } from "@/lib/device-id";
import { parseInviteCodeFromLocation } from "@/lib/referral";
import { referralFetch } from "@/lib/referral-client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

function captureKey(code: string) {
  return `qraft.inviteOpen.${code}`;
}

export function InviteCapture() {
  const path = usePathname();
  const search = useSearchParams();
  const once = useRef("");

  useEffect(() => {
    const href =
      typeof window !== "undefined"
        ? window.location.href
        : `${path}?${search.toString()}`;
    const code = parseInviteCodeFromLocation(href);
    if (!code) return;
    savePendingReferralCode(code);
    if (once.current === code) return;
    try {
      if (sessionStorage.getItem(captureKey(code))) {
        once.current = code;
        return;
      }
      sessionStorage.setItem(captureKey(code), "1");
    } catch {
      /* ignore */
    }
    once.current = code;
    const deviceId = getDeviceId();
    if (deviceId.length < 8) return;
    void (async () => {
      await referralFetch("/api/referral/campaign", {
        method: "POST",
        body: JSON.stringify({ type: "invite_open", code, deviceId }),
      });
      await referralFetch("/api/referral", {
        method: "POST",
        body: JSON.stringify({ code, deviceId }),
      });
    })();
  }, [path, search]);

  return null;
}
