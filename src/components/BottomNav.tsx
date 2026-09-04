"use client";

import { useApp } from "@/lib/store";
import { Bell, Home, Search, Swords, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/notifications", label: "通知", icon: Bell },
  { href: "/activity", label: "Rivals", icon: Swords },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const path = usePathname();
  const { unreadNotificationCount, composer, premiumOpen, paywallOpen, feedbackOpen } = useApp();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      setKeyboardOpen(window.innerHeight - vv.height > 96);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  if (keyboardOpen || composer.open || premiumOpen || paywallOpen || feedbackOpen) return null;

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 md:max-w-2xl lg:max-w-4xl"
      aria-label="メインナビゲーション"
    >
      <div className="grid w-full grid-cols-5 border-t border-gray-800 bg-black/90 pt-1 backdrop-blur-md pb-[max(0.4rem,env(safe-area-inset-bottom))]">
        {TABS.map((t) => {
          const active =
            t.href === "/"
              ? path === "/"
              : t.href === "/profile"
                ? path.startsWith("/profile") || path.startsWith("/settings")
                : path.startsWith(t.href);
          const Icon = t.icon;
          const notify = t.href === "/notifications";
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label={t.label}
              aria-current={active ? "page" : undefined}
              className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5"
            >
              <span className={`relative flex h-6 w-6 items-center justify-center ${active ? "text-white" : "text-muted"}`}>
                <Icon size={20} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                {notify && unreadNotificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-black" />
                )}
              </span>
              <span
                className={`max-w-full truncate text-center text-[10px] leading-none ${
                  active ? "font-bold text-white" : "font-medium text-muted"
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
