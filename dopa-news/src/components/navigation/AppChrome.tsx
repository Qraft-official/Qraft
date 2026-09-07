"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  // Dopa mode and the admin console are full-screen experiences with their own
  // way out, so the app nav would only get in the way there.
  const showNav = !["/admin", "/dopa", "/offline"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return (
    <div className="app-frame">
      <OfflineBanner />
      {children}
      {showNav && <BottomNav />}
    </div>
  );
}
