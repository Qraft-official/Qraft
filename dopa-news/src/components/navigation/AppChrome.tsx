"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import BottomNav from "./BottomNav";
import OfflineBanner from "./OfflineBanner";

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const showNav = !pathname.startsWith("/admin");

  return (
    <div className="app-frame">
      <OfflineBanner />
      {children}
      {showNav && <BottomNav />}
    </div>
  );
}
