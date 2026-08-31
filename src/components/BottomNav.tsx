"use client";

import { motion } from "framer-motion";
import { Home, Search, Swords, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/activity", label: "Rivals", icon: Swords },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-2">
        {TABS.map((t) => {
          const active =
            t.href === "/" ? path === "/" : path.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex min-w-[64px] flex-col items-center gap-0.5 pb-1"
            >
              <motion.span
                animate={{ scale: active ? 1.1 : 1 }}
                className={active ? "text-white" : "text-muted"}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
              </motion.span>
              <span className={`text-[10px] ${active ? "text-white" : "text-muted"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
