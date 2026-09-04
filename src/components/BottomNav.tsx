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
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-black/90 backdrop-blur-md"
      aria-label="メインナビゲーション"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 pt-1 md:max-w-2xl lg:max-w-4xl">
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
              className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1"
            >
              <span className={`relative ${active ? "text-white" : "text-muted"}`}>
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                {notify && unreadNotificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-black" />
                )}
              </span>
              <span className={`text-xs ${active ? "font-bold text-white" : "text-muted"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
