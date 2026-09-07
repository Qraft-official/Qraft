"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bookmark, Map, Sparkles, User } from "lucide-react";
import type { ComponentType } from "react";

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  /** Sub-routes that should keep this tab lit. */
  match: (path: string) => boolean;
}

const ITEMS: NavItem[] = [
  {
    href: "/",
    label: "トップ",
    Icon: Sparkles,
    match: (p) => p === "/" || p.startsWith("/news") || p.startsWith("/dopa") || p.startsWith("/search"),
  },
  { href: "/map", label: "ドパマップ", Icon: Map, match: (p) => p.startsWith("/map") },
  { href: "/archive", label: "アーカイブ", Icon: Bookmark, match: (p) => p.startsWith("/archive") },
  {
    href: "/me",
    label: "マイページ",
    Icon: User,
    match: (p) => p.startsWith("/me") || p.startsWith("/login") || p.startsWith("/notifications"),
  },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="メインナビゲーション"
      className="glass fixed inset-x-0 bottom-0 z-[90] mx-auto w-full max-w-[var(--app-max-width)] border-t border-line pad-safe-bottom"
    >
      <ul className="flex h-[var(--nav-height)] items-stretch">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-full flex-col items-center justify-center gap-[3px] px-1"
              >
                {active && (
                  <motion.span
                    layoutId="nav-glow"
                    transition={{ type: "spring", stiffness: 460, damping: 36 }}
                    className="absolute inset-x-3 top-1.5 h-[2px] rounded-full bg-[#4ef5a3] shadow-[0_0_12px_2px_rgba(78,245,163,0.65)]"
                  />
                )}
                <Icon
                  size={21}
                  strokeWidth={active ? 2.4 : 1.9}
                  className={
                    active
                      ? "text-[#4ef5a3] drop-shadow-[0_0_7px_rgba(78,245,163,0.6)]"
                      : "text-fg-faint"
                  }
                />
                <span
                  className={`text-[10px] font-semibold tracking-tight ${
                    active ? "text-[#4ef5a3]" : "text-fg-faint"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
